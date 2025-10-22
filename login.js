document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate input lengths
    if (email.length !== 4) {
      showCustomAlert('Validation Error', 'User ID must be exactly 4 characters long.', 'warning');
      return;
    }

    if (password.length !== 8) {
      showCustomAlert('Validation Error', 'Password must be exactly 8 characters long.', 'warning');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Store user ID in localStorage
      if (data.user) {
        localStorage.setItem('user_id', data.user.id);
        console.log('Login successful, user ID stored:', data.user.id);
      }

      // Redirect to dashboard
      window.location.href = 'User panel/Userdashboard.html';
    } catch (error) {
      console.error('Login error:', error);
      showCustomAlert('Login Failed', 'Login failed: ' + error.message, 'error');
    }
  });
});
