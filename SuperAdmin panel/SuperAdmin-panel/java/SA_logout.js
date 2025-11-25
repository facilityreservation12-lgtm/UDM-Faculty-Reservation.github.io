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

    let supabaseClient = null;
    if (typeof getSupabaseClient === 'function') {
      supabaseClient = getSupabaseClient();
    } else if (typeof window !== 'undefined' && window.supabaseClient) {
      supabaseClient = window.supabaseClient;
    }

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
const SA_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let saIdleTimerId = null;
let saLastActivity = Date.now();

function handleSuperAdminActivity() {
  saLastActivity = Date.now();
  if (saIdleTimerId) {
    clearTimeout(saIdleTimerId);
  }
  saIdleTimerId = setTimeout(triggerSuperAdminIdleLogout, SA_IDLE_TIMEOUT_MS);
}

function triggerSuperAdminIdleLogout() {
  const idleDuration = Date.now() - saLastActivity;
  if (idleDuration < SA_IDLE_TIMEOUT_MS - 500) {
    handleSuperAdminActivity();
    return;
  }

  console.warn('Super Admin session expired due to inactivity.');
  signOutUser({
    skipConfirm: true,
    alertTitle: 'Session Expired',
    alertMessage: 'You were signed out after 5 minutes of inactivity.',
    alertType: 'warning'
  });
}

function initializeSuperAdminIdleTimer() {
  if (window.__superAdminIdleTimerInitialized) return;
  window.__superAdminIdleTimerInitialized = true;

  const activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll'
  ];

  activityEvents.forEach(evt => {
    document.addEventListener(evt, handleSuperAdminActivity, true);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      handleSuperAdminActivity();
    }
  });

  handleSuperAdminActivity();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSuperAdminIdleTimer);
} else {
  initializeSuperAdminIdleTimer();
}
