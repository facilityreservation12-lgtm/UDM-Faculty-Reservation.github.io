const supabase = window.supabaseClient;

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
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
    return;
  }

  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      tbody.innerHTML = "<tr><td colspan='8'>Database connection error</td></tr>";
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

// Notification panel functionality (commented out - add HTML elements if needed)
/*
const panel = document.getElementById("notificationPanel");
const overlay = document.getElementById("notificationOverlay");

function toggleNotificationPanel() {
  if (panel) panel.classList.toggle("active");
  if (overlay) overlay.classList.toggle("active");
}

if (overlay) {
  overlay.addEventListener("click", toggleNotificationPanel);
}
*/

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
      console.warn('No user ID found in localStorage - user not logged in');
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
      console.warn('No user data found for id:', userId);
    }
  } catch (err) {
    console.error('loadUserDetails error:', err);
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
  if (!confirm('Are you sure you want to cancel this reservation?')) {
    return;
  }

  try {
    const sb = getSupabase();
    if (!sb) {
      alert('Database connection error');
      return;
    }

    // Delete reservation from Supabase
    const { error } = await sb
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

// Function to sign out user
function signOutUser() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to sign out?')) {
    console.log('User signing out...');
    
    // Clear all user session data from localStorage
    localStorage.removeItem('id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('reservations');
    
    // Clear any other session data
    sessionStorage.clear();
    
    // Sign out from Supabase if available
    const sb = getSupabase();
    if (sb && sb.auth) {
      sb.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }
    
    console.log('User signed out successfully');
    
    // Redirect to landing page
    window.location.href = '../landingPage.html';
  }
}
