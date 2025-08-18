const supabase = window.supabaseClient;

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

async function loadReservations() {
  const tbody = document.getElementById('facilityTableBody');
  tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

  // Get user details first
  const userId = localStorage.getItem('user_id');
  let userName = 'Unknown User';
  let userRole = 'Unknown Role';

  if (!userId) {
    tbody.innerHTML = "<tr><td colspan='8'>Please log in to view your reservations</td></tr>";
    return;
  }

  try {
    // Get user details - try with basic columns first
    let { data: userData, error: userError } = await supabase
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
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', userId)
      .order('date', { ascending: true });

    if (reservationError) {
      console.error('Error fetching reservations:', reservationError);
      tbody.innerHTML = `<tr><td colspan='8'>Error loading reservations: ${reservationError.message}</td></tr>`;
      return;
    }

    // Clear loading message
    tbody.innerHTML = "";

    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = "<tr><td colspan='8'>No reservations found</td></tr>";
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
  }
}

const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");

  function toggleNotificationPanel() {
    panel.classList.toggle("active");
    overlay.classList.toggle("active");
  }

  overlay.addEventListener("click", toggleNotificationPanel);

async function loadUserDetails() {
  const userId = localStorage.getItem('user_id');
  console.log('user_id from localStorage:', userId); // Debug
  if (!userId) {
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
    console.warn('No user_id found in localStorage');
    return;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase client not initialized');
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Supabase error:', error);
  }
  console.log('Supabase user fetch result:', data); // Debug
  if (data) {
    const userName = `${data.first_name} ${data.last_name}`.trim() || 'Unknown User';
    const firstName = data.first_name || 'Unknown';
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || 'Unknown Role';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    console.log('User data:', data);
  } else {
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
    console.warn('No user data found for id:', userId);
  }
}

if (document.getElementById('UserName') && document.getElementById('UserRole')) {
  loadUserDetails();
}

window.onload = async function() {
  await loadReservations();
  updateDateTime();
};

async function cancelReservation(requestId) {
  if (!confirm('Are you sure you want to cancel this reservation?')) {
    return;
  }

  try {
    // Delete reservation from Supabase
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('request_id', requestId);

    if (error) {
      console.error('Error canceling reservation:', error);
      alert('Error canceling reservation. Please try again.');
      return;
    }

    alert('Reservation canceled successfully!');
    
    // Reload the reservations to update the display
    await loadReservations();
    
  } catch (error) {
    console.error('Error in cancelReservation:', error);
    alert('Error canceling reservation. Please try again.');
  }
}

function updateDateTime() {
  const dateElem = document.getElementById('currentDate');
  const timeElem = document.getElementById('currentTime');
  const now = new Date();

  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  dateElem.textContent = now.toLocaleDateString('en-US', dateOptions);

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  timeElem.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

setInterval(updateDateTime, 1000);

// Call this after successful login, passing the user's email or username
async function fetchAndStoreUserIdByEmail(userEmail) {
  if (typeof supabase === 'undefined') return;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  if (data && data.id) {
    localStorage.setItem('user_id', data.id);
  } else {
    console.warn('No user found for email:', userEmail);
  }
}
