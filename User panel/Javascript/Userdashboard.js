const supabase = window.supabaseClient;

// Toggle notification panel
function toggleNotificationPanel() {
  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");
  
  if (panel) {
    panel.classList.toggle("active");
  }
  
  if (overlay) {
    overlay.classList.toggle("active");
  }
}

// Close notification panel when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById("notificationOverlay");
  
  if (overlay) {
    overlay.addEventListener("click", toggleNotificationPanel);
  }

  // Active menu link highlighting
  document.querySelectorAll('.menu a').forEach(link => {
    if (
      link.href &&
      window.location.pathname.endsWith(link.getAttribute('href'))
    ) {
      link.classList.add('active');
    }
  });

  // Update time and date display
  function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateElement = document.querySelector('.date');
    if (dateElement) {
      const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // Update time
    const timeElement = document.querySelector('.time');
    if (timeElement) {
      const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
  }

  // Update time immediately and then every second
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Helper for custom alert
function showAlert(title, message, type) {
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(title, message, type || 'info');
  } else {
    alert(title ? (title + '\n' + message) : message);
  }
}

// Helper for custom confirm
function showConfirm(title, message, onConfirm) {
  if (typeof showCustomConfirm === 'function') {
    showCustomConfirm(title, message, onConfirm);
  } else {
    if (confirm(message)) onConfirm();
  }
}

async function loadReservations() {
  const tbody = document.getElementById('facilityTableBody');
  tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

  // Get user details first (users table based login)
  const userId = localStorage.getItem('id');
  let userName = 'Unknown User';
  let userRole = 'Unknown Role';

  console.log('Retrieved userId from localStorage:', userId);

  if (!userId) {
    tbody.innerHTML = "<tr><td colspan='8'>Please log in to view your reservations</td></tr>";
    showAlert('Login Required', 'Please log in to view your reservations.', 'warning');
    return;
  }

  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      tbody.innerHTML = "<tr><td colspan='8'>Database connection error</td></tr>";
      showAlert('Connection Error', 'Database connection error', 'error');
      return;
    }

    // Get user details - try with basic columns first
    let { data: userData, error: userError } = await sb
      .from('users')
      .select('*')
      .eq('id', userId);

    console.log('User query result:', { data: userData, error: userError });

    if (userData && userData.length > 0 && !userError) {
      const user = userData[0];
      console.log('Available user columns:', Object.keys(user));
      
      // Try different name combinations based on available columns
      if (user.first_name && user.last_name) {
        userName = `${user.first_name} ${user.last_name}`.trim();
      } else if (user.full_name) {
        userName = user.full_name;
      } else if (user.name) {
        userName = user.name;
      } else {
        userName = `User ${userId}`;
      }
      userRole = user.role_name || user.role || 'Unknown Role';
    } else if (userError) {
      console.error('Error fetching user details:', userError);
      userName = `User ${userId}`;
    }

    // Fetch user's reservations from Supabase
    const { data: reservations, error: reservationError } = await sb
      .from('reservations')
      .select('*')
      .eq('id', userId)
      .order('date', { ascending: true });

    if (reservationError) {
      console.error('Error fetching reservations:', reservationError);
      tbody.innerHTML = `<tr><td colspan='8'>Error loading reservations: ${reservationError.message}</td></tr>`;
      showAlert('Load Error', `Error loading reservations: ${reservationError.message}`, 'error');
      return;
    }

    // Clear loading message
    tbody.innerHTML = "";

    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = "<tr><td colspan='8'>No reservations found</td></tr>";
      showAlert('No Reservations', 'No reservations found.', 'info');
      return;
    }

    // Display reservations
    reservations.forEach((reservation, index) => {
      const tr = document.createElement('tr');
      
      // Format the date
      const formattedDate = new Date(reservation.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Format time range
      const timeRange = `${formatTime12hr(reservation.time_start)} - ${formatTime12hr(reservation.time_end)}`;
      
      // Determine status (you can add a status column to your database later)
      const status = reservation.status || 'PENDING';
      
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${userName}</td>
        <td>${reservation.request_id}</td>
        <td>${reservation.facility}</td>
        <td>${formattedDate}</td>
        <td>${timeRange}</td>
        <td class="status-${status.toLowerCase()}">${status}</td>
        <td><button class="cancel-btn" onclick="cancelReservation('${reservation.request_id}')">Cancel</button></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error in loadReservations:', error);
    tbody.innerHTML = `<tr><td colspan='8'>Error loading data: ${error.message}</td></tr>`;
    showAlert('Error', `Error loading data: ${error.message}`, 'error');
  }
}

async function loadUserDetails() {
  try {
    const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
    console.log('=== USER DETAILS DEBUG ===');
    console.log('userId from localStorage:', userId);
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('All localStorage data:', {...localStorage});
    
    if (!userId) {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      showAlert('Login Required', 'No user ID found in localStorage - user not logged in', 'warning');
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not initialized');
      return;
    }
    
    document.querySelectorAll('.menu a').forEach(link => {
      if (
        link.href &&
        window.location.pathname.endsWith(link.getAttribute('href'))
      ) {
        link.classList.add('active');
      }
    });

    const { data, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      showAlert('Database Error', 'Error fetching user details.', 'error');
      return;
    }
    
    console.log('Supabase user fetch result:', data); // Debug
    if (data) {
      const userName = `${data.first_name} ${data.last_name}`.trim();
      const firstName = data.first_name || '';
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || '';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
      console.log('User data:', data);
      // Ensure localStorage has current user id
      localStorage.setItem('id', data.id);
    } else {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      showAlert('User Not Found', 'No user data found for id: ' + userId, 'warning');
    }
  } catch (err) {
    console.error('loadUserDetails error:', err);
    showAlert('Error', 'Error loading user details.', 'error');
  }
}

if (document.getElementById('UserName') && document.getElementById('UserRole')) {
  loadUserDetails();
}

window.onload = async function() {
  console.log('Page loaded, starting initialization...');
  console.log('Current localStorage contents:', {...localStorage});
  
  // Check if user is actually logged in
  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
  console.log('User ID found:', userId);
  await loadUserDetails(); // Load user details first
  await loadReservations(); // Then load reservations
  updateDateTime();
  console.log('Dashboard initialization complete');
};

async function cancelReservation(requestId) {
  showConfirm('Cancel Reservation', 'Are you sure you want to cancel and remove this reservation from the database?', async () => {
    try {
      const sb = getSupabase();
      if (!sb) {
        showAlert('Database Error', 'Database connection error', 'error');
        return;
      }

      // Delete reservation from Supabase completely
      const { error } = await sb
        .from('reservations')
        .delete()
        .eq('request_id', requestId);

      if (error) {
        console.error('Error deleting reservation:', error);
        showAlert('Delete Error', 'Error deleting reservation. Please try again.', 'error');
        return;
      }

      showAlert('Success', 'Reservation deleted successfully!', 'success');
      await loadReservations();

    } catch (error) {
      console.error('Error in cancelReservation:', error);
      showAlert('Delete Error', 'Error deleting reservation. Please try again.', 'error');
    }
  });
}

function updateDateTime() {
  const dateElem = document.getElementById('currentDate');
  const timeElem = document.getElementById('currentTime');
  const now = new Date();

  if (dateElem) {
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    dateElem.textContent = now.toLocaleDateString('en-US', dateOptions);
  }
  
  if (timeElem) {
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    timeElem.textContent = now.toLocaleTimeString('en-US', timeOptions);
  }
}

setInterval(updateDateTime, 1000);

// Call this after successful login, passing the user's email or username
async function fetchAndStoreUserIdByEmail(userEmail) {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  if (data && data.id) {
    localStorage.setItem('id', data.id);
  } else {
    console.warn('No user found for email:', userEmail);
  }
}



// Userdashboard JavaScript Functions

// Add safe Supabase client getter to avoid "cannot access before initialization"
function getSupabase() {
	// prefer initialized client set by your supabaseClient.js
	if (typeof window !== 'undefined') {
		if (window.supabaseClient) return window.supabaseClient;
		if (window.supabase) return window.supabase;
	}
	// fallback to global variable
	if (typeof supabase !== 'undefined') return supabase;
	return null;
}

// Toggle notification panel
function toggleNotificationPanel() {
  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");
  
  if (panel) {
    panel.classList.toggle("active");
  }
  
  if (overlay) {
    overlay.classList.toggle("active");
  }
}

// Close notification panel when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById("notificationOverlay");
  
  if (overlay) {
    overlay.addEventListener("click", toggleNotificationPanel);
  }

  // Active menu link highlighting
  document.querySelectorAll('.menu a').forEach(link => {
    if (
      link.href &&
      window.location.pathname.endsWith(link.getAttribute('href'))
    ) {
      link.classList.add('active');
    }
  });

  // Update time and date display
  function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateElement = document.querySelector('.date');
    if (dateElement) {
      const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // Update time
    const timeElement = document.querySelector('.time');
    if (timeElement) {
      const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
  }

  // Update time immediately and then every second
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Load user reservations and display them in the table
async function loadUserReservations() {
  try {
    // Get Supabase client using safe getter
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found. Ensure supabaseClient.js is loaded before Userdashboard.js');
      return;
    }

    // Get current user ID
    const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
    if (!userId) {
      console.log('No user logged in');
      return;
    }

    // Fetch user's reservations with user name
    const { data: reservations, error } = await sb
      .from('reservations')
      .select(`
        request_id, 
        facility, 
        date, 
        time_start, 
        time_end, 
        status,
        users!inner(first_name, last_name)
      `)
      .eq('id', userId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
      return;
    }

    // Display reservations in the table
    displayReservationsTable(reservations || []);

  } catch (error) {
    console.error('Error loading reservations:', error);
  }
}

// Display reservations in the table
function displayReservationsTable(reservations) {
  const tableBody = document.querySelector('.facility-table tbody');
  
  if (!tableBody) {
    console.log('Table body not found');
    return;
  }

  // Clear existing rows
  tableBody.innerHTML = '';

  if (reservations.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666;">No reservations found</td></tr>';
    return;
  }

  // Create table rows
  reservations.forEach((reservation, index) => {
    const row = createReservationRow(reservation, index + 1);
    tableBody.appendChild(row);
  });
}

// Create individual reservation table row
function createReservationRow(reservation, rowNumber) {
  const row = document.createElement('tr');
  
  // Format date
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format time
  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  
  // Map status for display
  let displayStatus = reservation.status;
  let statusClass = 'status-pending';
  
  if (reservation.status?.toLowerCase() === 'request') {
    displayStatus = 'Pending';
    statusClass = 'status-pending';
  } else if (reservation.status?.toLowerCase() === 'approved') {
    displayStatus = 'Approved';
    statusClass = 'status-approved';
  } else if (reservation.status?.toLowerCase() === 'completed') {
    displayStatus = 'Completed';
    statusClass = 'status-completed';
  }
  
  // Get user name
  const userName = reservation.users 
    ? `${reservation.users.first_name || ''} ${reservation.users.last_name || ''}`.trim()
    : 'Unknown User';
  
  // Create action button
  const actionButton = reservation.status?.toLowerCase() === 'approved' || reservation.status?.toLowerCase() === 'request' 
    ? `<button class="cancel-btn" onclick="cancelReservation('${reservation.request_id}')">Cancel</button>`
    : '-';
  
  row.innerHTML = `
    <td>${rowNumber}</td>
    <td>${userName}</td>
    <td>${reservation.request_id || '-'}</td>
    <td>${reservation.facility || '-'}</td>
    <td>${formattedDate}</td>
    <td>${startTime} - ${endTime}</td>
    <td><span class="${statusClass}">${displayStatus}</span></td>
    <td>${actionButton}</td>
  `;
  
  return row;
}

// Format time to 12-hour format
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

// Cancel reservation function
async function cancelReservation(requestId) {
  showConfirm('Cancel Reservation', 'Are you sure you want to cancel and remove this reservation from the database?', async () => {
    try {
      const sb = getSupabase();
      if (!sb) {
        showAlert('Database Error', 'Database connection error', 'error');
        return;
      }

      // Delete reservation from Supabase completely
      const { error } = await sb
        .from('reservations')
        .delete()
        .eq('request_id', requestId);

      if (error) {
        console.error('Error deleting reservation:', error);
        showAlert('Delete Error', 'Error deleting reservation. Please try again.', 'error');
        return;
      }

      showAlert('Success', 'Reservation deleted successfully!', 'success');
      await loadReservations();

    } catch (error) {
      console.error('Error in cancelReservation:', error);
      showAlert('Delete Error', 'Error deleting reservation. Please try again.', 'error');
    }
  });
}

// Load user details and populate UI
async function loadUserDetails() {
  try {
    const sb = getSupabase();
    let userId = localStorage.getItem('user_id');

    // Try to get user id from active session if client available
    if (sb && sb.auth && sb.auth.getSession) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user?.id) userId = session.user.id;
      } catch (sessionErr) {
        console.warn('getSession error (fallback to localStorage):', sessionErr);
      }
    }

    if (!userId) {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = '';
      console.warn('No user_id available from session or localStorage');
      return;
    }

    const sbClient = getSupabase();
    if (!sbClient) {
      console.warn('Supabase client not available; cannot fetch user profile. Using stored user_id:', userId);
      // keep stored id but cannot enrich UI with profile data
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'User ' + userId;
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    const { data, error } = await sbClient
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error fetching user:', error);
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown User';
    const firstName = data.first_name || '';
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || 'Unknown Role';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    localStorage.setItem('user_id', data.id);
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

// Load user notifications and display them
async function loadUserNotifications() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      showAlert('Connection Error', 'Supabase client not found', 'error');
      return;
    }

    // Get current user ID
    const userId = localStorage.getItem('user_id') || localStorage.getItem('id');

    if (!userId) {
      console.log('No user logged in, skipping notifications');
      return;
    }

    // Fetch user's reservations with status information
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, status')
      .eq('id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // Get latest 10 reservations

    if (error) {
      console.error('Error fetching user notifications:', error);
      showAlert('Load Error', 'Error fetching user notifications.', 'error');
      return;
    }

    // Display notifications
    displayNotifications(reservations || []);

  } catch (error) {
    console.error('Error loading notifications:', error);
    showAlert('Error', 'Error loading notifications.', 'error');
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
  
  // Map status for display and get color
  let displayStatus = reservation.status;
  if (reservation.status?.toLowerCase() === 'request') {
    displayStatus = 'Pending';
  }
  
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

// Get status color for inline styling
function getStatusColor(status) {
  const mappedStatus = status?.toLowerCase() === 'request' ? 'pending' : status?.toLowerCase();
  
  switch (mappedStatus) {
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

// Load reservations when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load user details first
  setTimeout(loadUserDetails, 500);
  
  // Load user notifications for notification panel
  setTimeout(loadUserNotifications, 1000);
  
  // Delay loading reservations to ensure user is authenticated
  setTimeout(loadUserReservations, 1000);
});
