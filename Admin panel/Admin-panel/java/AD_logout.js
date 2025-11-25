// Function to sign out user (for the logout button)
function signOutUser(options = {}) {
  const {
    skipConfirm = false,
    alertTitle = 'Signed Out',
    alertMessage = 'You have been signed out successfully.',
    alertType = 'success'
  } = options;

  const completeSignOut = () => {
    console.log('User signing out.');

    localStorage.removeItem('id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('reservations');
    localStorage.removeItem('userReservations');
    localStorage.removeItem('selectedDate');

    sessionStorage.clear();

    const supabaseClient = getSupabaseClient?.();
    if (supabaseClient && supabaseClient.auth) {
      supabaseClient.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }

    console.log('User signed out successfully');

    if (typeof showCustomAlert === 'function') {
      showCustomAlert(alertTitle, alertMessage, alertType);
    } else {
      alert(alertMessage);
    }

    setTimeout(() => {
      window.location.href = '../../User panel/LandingPage.html';
    }, 500);
  };

  if (skipConfirm) {
    completeSignOut();
    return;
  }

  const confirmFn = typeof showCustomConfirm === 'function'
    ? showCustomConfirm
    : (title, message, onConfirm) => {
        if (confirm(message)) onConfirm();
      };

  confirmFn('Sign out', 'Are you sure you want to sign out?', completeSignOut);
}

// Ensure global assignment
window.signOutUser = signOutUser;

// -----------------------
// Idle session management
// -----------------------
const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let adminIdleTimerId = null;
let adminLastActivity = Date.now();

function handleAdminActivity() {
  adminLastActivity = Date.now();
  if (adminIdleTimerId) {
    clearTimeout(adminIdleTimerId);
  }
  adminIdleTimerId = setTimeout(triggerAdminIdleLogout, ADMIN_IDLE_TIMEOUT_MS);
}

function triggerAdminIdleLogout() {
  const idleDuration = Date.now() - adminLastActivity;
  if (idleDuration < ADMIN_IDLE_TIMEOUT_MS - 500) {
    handleAdminActivity();
    return;
  }

  console.warn('Admin session expired due to inactivity.');
  signOutUser({
    skipConfirm: true,
    alertTitle: 'Session Expired',
    alertMessage: 'You were signed out after 5 minutes of inactivity.',
    alertType: 'warning'
  });
}

function initializeAdminIdleTimer() {
  if (window.__adminIdleTimerInitialized) return;
  window.__adminIdleTimerInitialized = true;

  const activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll'
  ];

  activityEvents.forEach(evt => {
    document.addEventListener(evt, handleAdminActivity, true);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      handleAdminActivity();
    }
  });

  handleAdminActivity();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdminIdleTimer);
} else {
  initializeAdminIdleTimer();
}
