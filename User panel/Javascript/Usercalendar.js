let calendarGrid;
let monthYear;
let currentDate = new Date();

// Add global variable to store reservations
let userReservations = [];

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

async function getReservationsForDay(year, month, day) {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      return [];
    }

    // Get current user ID from localStorage (users table based login)
    const userId = localStorage.getItem('id') || 
                   localStorage.getItem('user_id') || 
                   localStorage.getItem('userId') || 
                   localStorage.getItem('currentUserId');

    // Format the target date
    const targetDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Always fetch ALL reservations for the date to show complete availability
    // This shows what facilities/times are booked regardless of who booked them
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, time_start, time_end, title_of_the_event')
      .eq('date', targetDate);

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return reservations || [];
  } catch (err) {
    console.error('getReservationsForDay error:', err);
    return [];
  }
}

// helper to locate the initialized Supabase client
function getSupabase() {
	// most of your files use window.supabaseClient, some include the UMD as `supabase`
	// prefer the initialized client first
	if (typeof window !== 'undefined') {
		if (window.supabaseClient) return window.supabaseClient;
		if (window.supabase) return window.supabase;
	}
	// fallback to global variable `supabase` if present
	if (typeof supabase !== 'undefined') return supabase;
	return null;
}

async function loadUserDetails() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found. Ensure supabaseClient.js is loaded before this script.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    // Get user ID from localStorage (users table based login)
    // Check multiple possible keys that might be used by your login system
    let userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 localStorage.getItem('userId') || 
                 localStorage.getItem('currentUserId');
    
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('localStorage contents:', {...localStorage});
    console.log('Retrieved userId from localStorage:', userId);
    console.log('Type of userId:', typeof userId);

    if (!userId) {
      console.log('No user ID found in localStorage. User not logged in.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = '';
      return;
    }

    // Debug: Check what user we're trying to fetch
    console.log('About to fetch user with ID:', userId);

    // Fetch profile from users table
    const { data, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    console.log('User query result:', { data, error });
    console.log('Fetched user data:', data);

    if (error) {
      console.error('Supabase error fetching user:', error);
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const firstName = data.first_name || '';
    console.log('User data fetched successfully:', { userName, role: data.role_name, firstName });
    
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || '';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    // ensure localStorage has current user id
    localStorage.setItem('id', data.id);
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

// call on load (always attempt to populate UI)
loadUserDetails();

// Listen for storage changes to detect login/logout from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'id' || event.key === 'user_id' || event.key === 'userId' || event.key === 'currentUserId') {
    console.log('User login state changed in another tab');
    loadUserDetails();
    // Refresh calendar to show user-specific reservations
    renderCalendar(currentDate);
  }
});

async function fetchUserReservations() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      return [];
    }

    // Get current user ID from localStorage (same as other functions)
    const userId = localStorage.getItem('id') || 
                   localStorage.getItem('user_id') || 
                   localStorage.getItem('userId') || 
                   localStorage.getItem('currentUserId');

    if (!userId) {
      console.log('No user ID found in localStorage');
      return [];
    }

    console.log('fetchUserReservations: Using userId:', userId);

    // Fetch reservations using 'id' column as the foreign key
    const { data, error } = await sb
      .from('reservations')
      .select('*')
      .eq('id', userId);

    console.log('fetchUserReservations: id query result:', { data, error, count: data?.length });

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

async function renderCalendar(date) {
  // Initialize elements when needed to ensure DOM is ready
  if (!calendarGrid) {
    calendarGrid = document.querySelector(".calendar-grid") || document.getElementById("calendarGrid");
  }
  if (!monthYear) {
    monthYear = document.getElementById("monthYear");
  }
  
  console.log('calendarGrid element:', calendarGrid);
  console.log('monthYear element:', monthYear);
  console.log('calendarGrid found:', !!calendarGrid);
  
  if (!calendarGrid) {
    console.error('Calendar grid element not found! Check your HTML for .calendar-grid or #calendarGrid');
    return;
  }

  calendarGrid.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = date.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  console.log('Calendar debug:', { year, month, monthName, daysInMonth, firstDayIndex });
  
  // Ensure the calendar grid has proper CSS
  calendarGrid.style.display = 'grid';
  calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  calendarGrid.style.gap = '5px';

  monthYear.textContent = `${monthName} ${year}`;

  // Fetch user reservations FIRST so data is available when creating days
  userReservations = await fetchUserReservations();

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement("div");
    empty.classList.add("calendar-day", "empty");
    calendarGrid.appendChild(empty);
  }

  // Add actual days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement("div");
    day.classList.add("calendar-day");

    day.innerHTML = `
      <div class="day-number">${d}</div>
      <div class="events">Loading...</div>
    `;

    // Add click event handler
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    day.addEventListener("click", async () => {
      // Check if it's a past date
      const clickedDate = new Date(year, month, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (clickedDate < today) {
       showCustomAlert("Invalid Date", "You cannot reserve a date that has already passed.", "warning");
        return;
      }
      
      await showAvailableSlots(year, month, d, formattedDate);
    });

    // Append the day first to maintain order
    calendarGrid.appendChild(day);
    
    // Then asynchronously load reservations for this specific day
    loadReservationsForDay(day, year, month, d);
  }
}

// Separate function to load reservations for a specific day
async function loadReservationsForDay(dayElement, year, month, day) {
  try {
    const reservations = await getReservationsForDay(year, month, day);
    const eventsDiv = dayElement.querySelector('.events');
    
    // Check if current user has reservations on this day
    const dayDate = new Date(year, month, day);
    const dayDateString = dayDate.toISOString().split('T')[0];
    
    console.log(`Checking day ${day} (${dayDateString}) against ${userReservations.length} user reservations`);
    
    const userDayReservations = userReservations.filter(reservation => {
      const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
      const matches = reservationDate === dayDateString;
      console.log(`  Reservation date: ${reservationDate}, Day date: ${dayDateString}, Matches: ${matches}`);
      return matches;
    });
    
    // Add user reservation indicator
    if (userDayReservations.length > 0) {
      console.log(`Adding has-reservation class to day ${day} - found ${userDayReservations.length} reservations`);
      dayElement.classList.add('has-reservation');
      dayElement.title = `You have ${userDayReservations.length} reservation(s) on this day`;
    }
    
    if (reservations.length > 0) {
      dayElement.classList.add("booked");
      eventsDiv.innerHTML = reservations.map(r =>
        `<div>
          <strong>${r.facility || 'Unknown Facility'}</strong><br>
          <span>${r.title_of_the_event || ''}</span><br>
          <span>${formatTime12hr(r.time_start)} - ${formatTime12hr(r.time_end)}</span>
        </div>`
      ).join("<hr>");
      
      // Update title to show both general bookings and user reservations
      if (userDayReservations.length > 0) {
        dayElement.title = `You have ${userDayReservations.length} reservation(s). Total bookings: ${reservations.length}`;
      } else {
        dayElement.title = `${reservations.length} booking(s) on this day`;
      }
    } else {
      eventsDiv.innerHTML = "";
    }
  } catch (err) {
    console.error('Error loading reservations for day', day, ':', err);
    const eventsDiv = dayElement.querySelector('.events');
    eventsDiv.innerHTML = "";
  }
}

async function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  await renderCalendar(currentDate);
}

async function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  await renderCalendar(currentDate);
}

// Initialize calendar when page loads
(async function initCalendar() {
  await renderCalendar(currentDate);
})();



// Show available time slots for a specific date
async function showAvailableSlots(year, month, day, formattedDate) {
  try {
    const sb = getSupabase();
    if (!sb) {
      showCustomAlert("Database connection error");
      return;
    }

    // List of all available facilities
    const allFacilities = [
      "Palma Hall",
      "Right Wing Lobby", 
      "Mehan Garden",
      "Rooftop",
      "Classroom",
      "Basketball Court",
      "Ground Floor Space",
      "Others"
    ];

    // Get reservations for all facilities on this date
    const { data: allReservations, error } = await sb
      .from('reservations')
      .select('facility, time_start, time_end')
      .eq('date', formattedDate)
      .order('facility, time_start', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
      showCustomAlert("Error fetching reservations");
      return;
    }

    // Group reservations by facility
    const reservationsByFacility = {};
    (allReservations || []).forEach(reservation => {
      if (!reservationsByFacility[reservation.facility]) {
        reservationsByFacility[reservation.facility] = [];
      }
      reservationsByFacility[reservation.facility].push(reservation);
    });

    // Calculate available slots for each facility
    const facilityAvailability = [];
    
    for (const facility of allFacilities) {
      const facilityReservations = reservationsByFacility[facility] || [];
      const availableSlots = calculateAvailableSlots(facilityReservations);
      
      // Always add facility to the list, even if no slots are available
      facilityAvailability.push({
        facility: facility,
        slots: availableSlots
      });
    }

    // Check if ALL facilities are fully booked
    const hasAnyAvailableSlots = facilityAvailability.some(item => item.slots.length > 0);
    
    if (!hasAnyAvailableSlots) {
      showCustomAlert("All facilities are fully booked for this date.");
      return;
    }

    // Format the availability message
    let message = `Available facilities and time slots for ${formattedDate}:\n\n`;
    
    facilityAvailability.forEach(item => {
      message += `${item.facility}:\n`;
      if (item.slots.length > 0) {
        item.slots.forEach(slot => {
          message += `• ${formatTime12hr(slot.start)} - ${formatTime12hr(slot.end)}\n`;
        });
      } else {
        message += `• No available time slot\n`;
      }
      message += '\n';
    });

    message += 'Would you like to make a reservation?';
    
      showCustomConfirm("Make Reservation", message, () => {
         window.location.href = `VRF.html?dateOfEvent=${formattedDate}`;
});


  } catch (error) {
    console.error('Error showing available slots:', error);
    showCustomAlert("Error calculating available slots");
  }
}

// Calculate available time slots based on existing reservations
function calculateAvailableSlots(reservations) {
  // Define operating hours (7 AM to 7 PM)
  const OPERATING_START = "07:00";
  const OPERATING_END = "19:00";
  
  // Convert time string to minutes since midnight for easier calculation
  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Convert minutes since midnight back to time string
  function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  const operatingStartMinutes = timeToMinutes(OPERATING_START);
  const operatingEndMinutes = timeToMinutes(OPERATING_END);
  
  // Convert reservations to minutes and sort by start time
  const reservedSlots = reservations
    .map(reservation => ({
      start: timeToMinutes(reservation.time_start),
      end: timeToMinutes(reservation.time_end)
    }))
    .sort((a, b) => a.start - b.start);
  
  // Find available slots
  const availableSlots = [];
  let currentTime = operatingStartMinutes;
  
  for (const reservation of reservedSlots) {
    // If there's a gap between current time and next reservation
    if (currentTime < reservation.start) {
      availableSlots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(reservation.start)
      });
    }
    // Move current time to end of current reservation
    currentTime = Math.max(currentTime, reservation.end);
  }
  
  // Check if there's time left after the last reservation
  if (currentTime < operatingEndMinutes) {
    availableSlots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(operatingEndMinutes)
    });
  }
  
  return availableSlots;
}

// Custom Confirm Modal


// Notification panel toggle function
function toggleNotificationPanel() {
  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");
  
  if (panel && overlay) {
    panel.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

// Load and display user notifications
async function loadUserNotifications() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }

    // Get current user ID
    const userId = localStorage.getItem('id') || 
                   localStorage.getItem('user_id') || 
                   localStorage.getItem('userId') || 
                   localStorage.getItem('currentUserId');

    if (!userId) {
      console.log('No user logged in, skipping notifications');
      return;
    }

    // Fetch user's reservations with status information using 'id' column
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, status')
      .eq('id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // Get latest 10 reservations

    if (error) {
      console.error('Error fetching user notifications:', error);
      return;
    }

    // Display notifications
    displayNotifications(reservations || []);

  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Display notifications in the notification panel
function displayNotifications(reservations) {
  const notificationContainer = document.querySelector('.notification-container');
  
  if (!notificationContainer) {
    console.log('Notification container not found');
    return;
  }

  // Clear existing notifications
  notificationContainer.innerHTML = '';

  if (reservations.length === 0) {
    notificationContainer.innerHTML = '<div class="notification-item">No notifications available</div>';
    return;
  }

  // Create notification items
  reservations.forEach(reservation => {
    const notificationItem = createNotificationItem(reservation);
    notificationContainer.appendChild(notificationItem);
  });
}

// Create individual notification item
function createNotificationItem(reservation) {
  const div = document.createElement('div');
  div.className = 'notification-item';
  
  // Add status-specific class for styling (simple)
  const statusLower = reservation.status?.toLowerCase();
  if (statusLower) {
    div.classList.add(statusLower);
  }
  
  // Format date
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format time
  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  
  // Get status styling
  const statusClass = getStatusClass(reservation.status);
  
  // Map status for display
  const displayStatus = mapStatusForDisplay(reservation.status);
  
  // Get status color based on status type
  const statusColor = getStatusColor(reservation.status);
  
  // Create notification text with inline styling
  let notificationText;
  if (displayStatus?.toLowerCase() === 'approved') {
    notificationText = `Your Request for <b>${reservation.facility}</b> on <b>${formattedDate}</b> at <b>${startTime}-${endTime}</b> is <span style="color: ${statusColor}; font-weight: bold;">${displayStatus}</span>`;
  } else {
    notificationText = `Your Request for <b>${reservation.facility}</b> on <b>${formattedDate}</b> at <b>${startTime}-${endTime}</b> is currently <span style="color: ${statusColor}; font-weight: bold;">${displayStatus}</span>`;
  }
  
  div.innerHTML = notificationText;
  
  return div;
}



// Get CSS class for different status types
function getStatusClass(status) {
  // Map "request" status to pending
  const mappedStatus = mapStatusForDisplay(status);
  
  switch (mappedStatus?.toLowerCase()) {
    case 'approved':
      return 'status-approved';
    case 'pending':
      return 'status-pending';
    case 'rejected':
    case 'denied':
      return 'status-rejected';
    case 'cancelled':
      return 'status-cancelled';
    default:
      return 'status-default';
  }
}

// Map status for display purposes
function mapStatusForDisplay(status) {
  if (status?.toLowerCase() === 'request') {
    return 'Pending';
  }
  return status;
}

// Get status color for inline styling
function getStatusColor(status) {
  const mappedStatus = mapStatusForDisplay(status);
  
  switch (mappedStatus?.toLowerCase()) {
    case 'approved':
      return '#2e7d32'; // Green
    case 'pending':
      return '#e65100'; // Orange
    case 'rejected':
    case 'denied':
      return '#c62828'; // Red
    case 'cancelled':
      return '#616161'; // Gray
    default:
      return '#424242'; // Dark gray
  }
}

// Check for status changes and show real-time notifications
async function checkForStatusUpdates() {
  try {
    const sb = getSupabase();
    if (!sb) return;

    // Get current user ID
    const userId = localStorage.getItem('id') || 
                   localStorage.getItem('user_id') || 
                   localStorage.getItem('userId') || 
                   localStorage.getItem('currentUserId');

    if (!userId) return;

    // Get stored reservations from localStorage for comparison
    const storedReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
    
    // Fetch current reservations using 'id' column
    const { data: currentReservations, error } = await sb
      .from('reservations')
      .select('request_id, facility, date, time_start, time_end, status')
      .eq('id', userId);

    if (error) {
      console.error('Error checking status updates:', error);
      return;
    }

    // Check for status changes
    if (storedReservations.length > 0) {
      currentReservations?.forEach(current => {
        const stored = storedReservations.find(s => s.request_id === current.request_id);
        
        if (stored && stored.status !== current.status) {
          // Status changed - show notification
          showStatusChangeNotification(current, stored.status, current.status);
        }
      });
    }

    // Update stored reservations
    localStorage.setItem('userReservations', JSON.stringify(currentReservations || []));

  } catch (error) {
    console.error('Error checking status updates:', error);
  }
}

// Show real-time status change notification
function showStatusChangeNotification(reservation, oldStatus, newStatus) {
  // Format date and time
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  
  // Map statuses for display
  const displayOldStatus = mapStatusForDisplay(oldStatus);
  const displayNewStatus = mapStatusForDisplay(newStatus);
  
  const message = `Status Update: Your request for ${reservation.facility} on ${formattedDate} at ${startTime}-${endTime} has been changed from "${displayOldStatus}" to "${displayNewStatus}"`;
  
  // Show browser notification if supported
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Reservation Status Update', {
      body: message,
      icon: 'images/udm-logo.webp'
    });
  }
  
  // Also show in-app alert
  showCustomAlert(message);
  
  // Refresh notifications panel
  loadUserNotifications();
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}





// Initialize notifications when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Request notification permission
  requestNotificationPermission();
  
  // Load initial notifications
  setTimeout(loadUserNotifications, 1000); // Delay to ensure user is loaded
  
  // Check for status updates every 30 seconds
  setInterval(checkForStatusUpdates, 30000);
});