// logout.js

function signOutUser() {
  showCustomConfirm('Sign out', 'Are you sure you want to sign out?', () => {
    console.log('User signing out.');

    // Clear local storage
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

    // Clear session storage
    sessionStorage.clear();

    // Supabase sign out
    const sb = getSupabase();
    if (sb && sb.auth) {
      sb.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }

    window.location.href = 'LandingPage.html';
  });
}
