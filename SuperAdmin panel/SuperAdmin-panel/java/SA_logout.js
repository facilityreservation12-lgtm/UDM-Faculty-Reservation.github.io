// Function to sign out user (for the logout button)
function signOutUser() {
  // Gumamit ng custom confirm kung meron, fallback sa normal confirm kung wala
  const confirmFn = typeof showCustomConfirm === 'function'
    ? showCustomConfirm
    : (title, message, onConfirm) => {
        if (confirm(message)) onConfirm();
      };

  confirmFn('Sign out', 'Are you sure you want to sign out?', () => {
    console.log('User signing out.');

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
    localStorage.removeItem('userReservations');
    localStorage.removeItem('selectedDate');

    // Clear any other session data
    sessionStorage.clear();

    // Sign out from Supabase if available
  let supabaseClient = null;
    if (typeof getSupabaseClient === 'function') {
      supabaseClient = getSupabaseClient();
    } else if (typeof window !== 'undefined' && window.supabaseClient) {
      supabaseClient = window.supabaseClient;
    }   if (supabaseClient && supabaseClient.auth) {
      supabaseClient.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }

    console.log('User signed out successfully');

    // Gumamit ng custom alert kung meron, fallback sa alert kung wala
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Signed Out', 'You have been signed out successfully.', 'success');
    } else {
      alert('You have been signed out successfully.');
    }

    // Redirect to landing page after a short delay
    setTimeout(() => {
      window.location.href = '../../User panel/LandingPage.html';
    }, 500);
  });
}

// Ensure global assignment
window.signOutUser = signOutUser;
