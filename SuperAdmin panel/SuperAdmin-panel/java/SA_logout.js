// Function to sign out user (for the logout button)
function signOutUser() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to sign out?')) {
    console.log('Admin - User signing out...');
    
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
    const supabaseClient = getSupabaseClient();
    if (supabaseClient && supabaseClient.auth) {
      supabaseClient.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }
    
    console.log('Admin - User signed out successfully');
    
    // Redirect to landing page
    window.location.href = '../../User panel/LandingPage.html';
  }
}
