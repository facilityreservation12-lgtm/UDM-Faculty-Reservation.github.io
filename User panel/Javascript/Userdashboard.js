// ===================================
// CLEAN USER DASHBOARD JAVASCRIPT
// ===================================

// Safe Supabase client getter
function getSupabase() {
  if (typeof window !== 'undefined') {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
  }
  if (typeof supabase !== 'undefined') return supabase;
  return null;
}

const UNSEEN_NOTIF_COUNT_KEY = 'notification_unseen_count';
let reservationRealtimeChannel = null;

function getCurrentUserId() {
  return localStorage.getItem('user_id') ||
         localStorage.getItem('id') ||
         localStorage.getItem('userId') ||
         localStorage.getItem('currentUserId');
}

function getUnseenNotificationCount() {
  const stored = parseInt(localStorage.getItem(UNSEEN_NOTIF_COUNT_KEY) || '0', 10);
  return Number.isNaN(stored) ? 0 : stored;
}

function setUnseenNotificationCount(count) {
  const safeCount = Math.max(0, count);
  localStorage.setItem(UNSEEN_NOTIF_COUNT_KEY, String(safeCount));
  updateNotificationIndicatorUI(safeCount);
}

function bumpUnseenNotificationCount(incrementBy = 1) {
  setUnseenNotificationCount(getUnseenNotificationCount() + incrementBy);
}

function markNotificationsAsSeen() {
  setUnseenNotificationCount(0);
  localStorage.setItem('notificationsLastSeenAt', new Date().toISOString());
}

function updateNotificationIndicatorUI(count = getUnseenNotificationCount()) {
  const dot = document.getElementById('notificationDot');
  const badge = document.getElementById('notificationCount');
  const isActive = count > 0;
  if (dot) dot.classList.toggle('active', isActive);
  if (badge) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('active', isActive);
  }
}

function initNotificationIndicator() {
  updateNotificationIndicatorUI();
}

function removeRealtimeChannel() {
  const sb = getSupabase();
  if (reservationRealtimeChannel && sb?.removeChannel) {
    sb.removeChannel(reservationRealtimeChannel);
    reservationRealtimeChannel = null;
  }
}

async function initRealtimeNotifications() {
  const sb = getSupabase();
  const userId = getCurrentUserId();
  if (!sb || !userId || !sb.channel) return;

  removeRealtimeChannel();
  reservationRealtimeChannel = sb
    .channel(`reservation-status-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `id=eq.${userId}` }, handleRealtimeReservationPayload)
    .subscribe();
}

async function handleRealtimeReservationPayload(payload) {
  try {
    const { eventType } = payload;
    if (eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) {
      showStatusChangeNotification(payload.new, payload.old?.status, payload.new?.status);
    }
    if (['INSERT', 'UPDATE', 'DELETE'].includes(eventType)) {
      await loadNotifications();
      await loadReservations();
    }
  } catch (err) {
    console.error('Realtime payload handler error:', err);
  }
}

// ===================================
// NOTIFICATION PANEL TOGGLE
// ===================================
function toggleNotificationPanel(event) {
  if (event) event.preventDefault();
  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");
  if (!panel || !overlay) return;
  const willOpen = !panel.classList.contains("active");
  panel.classList.toggle("active");
  overlay.classList.toggle("active");
  if (willOpen) {
    markNotificationsAsSeen();
  }
}

// ===================================
// ALERT & CONFIRM HELPERS
// ===================================
function showAlert(title, message, type) {
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(title, message, type || 'info');
  } else {
    alert(title ? (title + '\n' + message) : message);
  }
}

function showConfirm(title, message, onConfirm) {
  if (typeof showCustomConfirm === 'function') {
    showCustomConfirm(title, message, onConfirm);
  } else {
    if (confirm(message)) onConfirm();
  }
}

// ===================================
// DATE & TIME UTILITIES
// ===================================
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

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

// ===================================
// LOAD USER DETAILS
// ===================================
async function loadUserDetails() {
  try {
    const userId = getCurrentUserId();
    console.log('Loading user details for ID:', userId);
    
    if (!userId) {
      console.warn('No user ID found in localStorage');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Guest User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = 'Guest';
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not initialized');
      return;
    }

    const { data, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user details:', error);
      return;
    }
    
    if (data) {
      const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const firstName = data.first_name || '';
      
      if (document.getElementById('UserName')) {
        document.getElementById('UserName').textContent = userName || 'Unknown User';
      }
      if (document.getElementById('UserRole')) {
        document.getElementById('UserRole').textContent = data.role_name || '';
      }
      if (document.getElementById('welcomeUserName')) {
        document.getElementById('welcomeUserName').textContent = firstName || 'User';
      }
      
      // Ensure localStorage is updated
      localStorage.setItem('id', data.id);
      localStorage.setItem('user_id', data.id);
      
      console.log('User details loaded successfully:', data);
    }
  } catch (err) {
    console.error('Error in loadUserDetails:', err);
  }
}

// ===================================
// LOAD RESERVATIONS (FIXED VERSION)
// ===================================
async function loadReservations() {
  const tbody = document.getElementById('facilityTableBody');
  
  if (!tbody) {
    console.error('Table body element not found');
    return;
  }

  tbody.innerHTML = `<tr><td colspan='8' style="text-align:center;">Loading...</td></tr>`;

  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');

  if (!userId) {
    tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Please log in to view your reservations</td></tr>";
    return;
  }

  try {
    const sb = getSupabase();
    if (!sb) {
      tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Database connection error</td></tr>";
      return;
    }

    // FIXED: Added title_of_the_event to the SELECT query
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('request_id, facility, date, time_start, time_end, status, title_of_the_event')
      .eq('id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading reservations:', error);
      tbody.innerHTML = `<tr><td colspan='8' style='text-align:center;'>Error: ${error.message}</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding: 20px;'>No reservations found</td></tr>";
      return;
    }

    console.log('Loaded reservations:', reservations);

    reservations.forEach((reservation, index) => {
      const tr = document.createElement('tr');
      
      // Format date
      const formattedDate = new Date(reservation.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // Format time range
      const timeRange = `${formatTime12hr(reservation.time_start)} - ${formatTime12hr(reservation.time_end)}`;
      
      // Get status
      const status = reservation.status || 'PENDING';
      const statusClass = `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
      
      // FIXED: Get event title properly
      let eventTitle = reservation.title_of_the_event || '-';
      if (eventTitle === '' || eventTitle === null || eventTitle === undefined) {
        eventTitle = '-';
      }
      
      console.log('Event title for row', index + 1, ':', eventTitle);
      
      // Create action button
      const canCancel = ['PENDING', 'REQUEST', 'APPROVED'].includes(status.toUpperCase());
      const actionButton = canCancel 
        ? `<button class="cancel-btn" onclick="cancelReservation('${reservation.request_id}')">Cancel</button>`
        : '-';
      
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${eventTitle}</td>
        <td>${reservation.request_id || '-'}</td>
        <td>${reservation.facility || '-'}</td>
        <td>${formattedDate}</td>
        <td>${timeRange}</td>
        <td><span class="${statusClass}">${status.toUpperCase()}</span></td>
        <td>${actionButton}</td>
      `;
      
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error in loadReservations:', error);
    tbody.innerHTML = `<tr><td colspan='8' style='text-align:center;'>Error: ${error.message}</td></tr>`;
  }
}

// ===================================
// CANCEL RESERVATION
// ===================================
async function cancelReservation(requestId) {
  showConfirm(
    'Cancel Reservation', 
    'Are you sure you want to cancel this reservation?', 
    async () => {
      try {
        const sb = getSupabase();
        if (!sb) {
          showAlert('Error', 'Database connection error', 'error');
          return;
        }

        const { error } = await sb
          .from('reservations')
          .delete()
          .eq('request_id', requestId);

        if (error) {
          console.error('Error canceling reservation:', error);
          showAlert('Error', 'Failed to cancel reservation. Please try again.', 'error');
          return;
        }

        showAlert('Success', 'Reservation canceled successfully!', 'success');
        await loadReservations();

      } catch (error) {
        console.error('Error in cancelReservation:', error);
        showAlert('Error', 'An error occurred. Please try again.', 'error');
      }
    }
  );
}

// ===================================
// LOAD NOTIFICATIONS FROM SUPABASE
// ===================================
async function loadNotifications() {
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

    const safeReservations = reservations || [];
    displayNotifications(safeReservations);
    localStorage.setItem('userReservations', JSON.stringify(safeReservations));
    updateNotificationIndicatorUI();
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

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(err => console.warn('Notification permission error:', err));
  }
}

async function checkForStatusUpdates() {
  try {
    const sb = getSupabase();
    if (!sb) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    const storedReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
    const { data: currentReservations, error } = await sb
      .from('reservations')
      .select('request_id, facility, date, time_start, time_end, status')
      .eq('id', userId);

    if (error) {
      console.error('Error checking status updates:', error);
      return;
    }

    if (storedReservations.length > 0) {
      currentReservations?.forEach(current => {
        const stored = storedReservations.find(s => s.request_id === current.request_id);
        if (stored && stored.status !== current.status) {
          showStatusChangeNotification(current, stored.status, current.status);
        }
      });
    }

    localStorage.setItem('userReservations', JSON.stringify(currentReservations || []));
  } catch (err) {
    console.error('Error in checkForStatusUpdates:', err);
  }
}

function showStatusChangeNotification(reservation, oldStatus, newStatus) {
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  const displayOldStatus = oldStatus?.toLowerCase() === 'request' ? 'Pending' : oldStatus;
  const displayNewStatus = newStatus?.toLowerCase() === 'request' ? 'Pending' : newStatus;

  const message = `Status Update: Your request for ${reservation.facility} on ${formattedDate} at ${startTime}-${endTime} has been changed from "${displayOldStatus}" to "${displayNewStatus}"`;

  bumpUnseenNotificationCount();

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Reservation Status Update', {
        body: message,
        icon: 'images/udm-logo.webp'
      });
    } catch (err) {
      console.warn('Browser notification error:', err);
    }
  }

  showAlert('Status Update', message, 'info');
  updateNotificationIndicatorUI();
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


// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard initializing...');

  initNotificationIndicator();
  requestNotificationPermission();
  
  // Setup overlay click handler
  const overlay = document.getElementById("notificationOverlay");
  if (overlay) {
    overlay.addEventListener("click", toggleNotificationPanel);
  }

  // Active menu link highlighting
  document.querySelectorAll('.menu a').forEach(link => {
    if (link.href && window.location.pathname.endsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });

  // Update time immediately and then every second
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Load data after a short delay to ensure everything is ready
  setTimeout(async () => {
    await loadUserDetails();
    await loadReservations();
    await loadNotifications();
    await checkForStatusUpdates();
    await initRealtimeNotifications();
  }, 500);

  setInterval(checkForStatusUpdates, 60000);
});

// Make functions globally available
window.toggleNotificationPanel = toggleNotificationPanel;
window.cancelReservation = cancelReservation;
window.showAlert = showAlert;
window.showConfirm = showConfirm;

window.addEventListener('beforeunload', removeRealtimeChannel);