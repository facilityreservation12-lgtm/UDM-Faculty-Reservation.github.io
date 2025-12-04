function signOutUser() {
  showCustomConfirm('Sign out', 'Are you sure you want to sign out?', async () => {
    console.log('User signing out.');

    // Get user info BEFORE clearing localStorage
    const userId = localStorage.getItem('user_id') || null;
    const userName = localStorage.getItem('user_name') || 'Unknown User';
    const userRole = localStorage.getItem('user_role') || 'Unknown Role';

    // ===== LOG LOGOUT ACTIVITY =====
    if (typeof logActivity === 'function') {
      const action = `User Logout - ${userName} (${userRole})`;
      logActivity(action);
      console.log('✅ Logout activity logged');

      // ===== SEND LOG TO SUPABASE AUDIT LOGS =====
      if (userId) {
        try {
          await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              action: 'logout',
              requestId: null // no reservation involved
            })
          });
          console.log('✅ Logout recorded in audit_logs table');
        } catch (error) {
          console.error('❌ Failed to log logout to audit_logs:', error);
        }
      }
    }

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

    // Supabase sign out (if using Supabase Auth)
    const sb = getSupabase();
    if (sb && sb.auth) {
      sb.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }

    // Redirect to landing page
    window.location.href = '../index.html';
  });
}