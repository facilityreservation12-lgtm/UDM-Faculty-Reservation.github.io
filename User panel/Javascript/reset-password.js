// Reset Password Page Logic
// Handles password reset when user clicks link in email

document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('resetPasswordForm');
  const statusEl = document.getElementById('statusMessage');
  const resetBtn = document.getElementById('resetBtn');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  console.log('Reset password page loaded');
  console.log('Full URL:', window.location.href);
  console.log('Hash:', window.location.hash);
  
  // Show loading
  showLoading('Verifying Link', 'Checking password reset token');
  
  try {
    // In Supabase v2, the client automatically parses tokens from URL hash on initialization
    // So we just need to get the current session
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
    
    console.log('getSession result:', { session: session ? 'present' : 'missing', error: sessionError });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      hideLoading();
      statusEl.textContent = 'Session error: ' + sessionError.message;
      statusEl.className = 'status-message error show';
      form.style.display = 'none';
      return;
    }
    
    if (!session) {
      // No session found - check if we have tokens in URL manually
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log('Tokens found in URL, attempting to set session manually...');
        
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken) {
          const { data, error } = await window.supabaseClient.auth.setSession(accessToken, refreshToken || accessToken);
          
          if (error) {
            console.error('setSession error:', error);
            hideLoading();
            statusEl.textContent = 'Invalid or expired reset link. Please request a new one.';
            statusEl.className = 'status-message error show';
            form.style.display = 'none';
            return;
          }
          
          console.log('Session set manually, user:', data.user);
        } else {
          hideLoading();
          statusEl.textContent = 'Invalid password reset link. Please request a new one from the login page.';
          statusEl.className = 'status-message error show';
          form.style.display = 'none';
          return;
        }
      } else {
        hideLoading();
        statusEl.textContent = 'No session found. Please request a new password reset link.';
        statusEl.className = 'status-message error show';
        form.style.display = 'none';
        return;
      }
    } else {
      console.log('Session found, user:', session.user.email);
    }
    
    hideLoading();
    
    // Show the form
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '1rem';
    
  } catch (err) {
    console.error('Unexpected error:', err);
    hideLoading();
    statusEl.textContent = 'An unexpected error occurred. Please try again.';
    statusEl.className = 'status-message error show';
    form.style.display = 'none';
  }
  
  // Password visibility toggle
  document.querySelectorAll('.toggle-password').forEach(function(icon) {
    icon.addEventListener('click', function() {
      const targetId = icon.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.style.color = input.type === 'text' ? '#007bff' : '#888';
      }
    });
  });
  
  // Form submission handler
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      statusEl.textContent = 'Passwords do not match';
      statusEl.className = 'status-message error show';
      return;
    }
    
    // Validate password length
    if (newPassword.length < 6) {
      statusEl.textContent = 'Password must be at least 6 characters';
      statusEl.className = 'status-message error show';
      return;
    }
    
    // Show loading
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';
    statusEl.textContent = 'Updating your password...';
    statusEl.className = 'status-message show';
    
    try {
      const { error: updateError } = await window.supabaseClient.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error('Password update error:', updateError);
        statusEl.textContent = 'Error: ' + updateError.message;
        statusEl.className = 'status-message error show';
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset Password';
        return;
      }
      
      console.log('Password updated successfully');
      statusEl.textContent = 'Password reset successful! Redirecting to login...';
      statusEl.className = 'status-message success show';
      
      // Clear URL hash for security
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect to login after delay
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      
    } catch (err) {
      console.error('Unexpected error during password update:', err);
      statusEl.textContent = 'An unexpected error occurred. Please try again.';
      statusEl.className = 'status-message error show';
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset Password';
    }
  });
});
