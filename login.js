document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

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
      alert('Login failed: ' + error.message);
    }
  });
});
