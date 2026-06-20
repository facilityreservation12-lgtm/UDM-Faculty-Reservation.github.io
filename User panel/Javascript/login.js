// Supabase Auth Direct - No server required
// Uses supabase.auth for authentication

document.addEventListener('DOMContentLoaded', function() {
  // Role selection logic (show login form after selection)
  const roleInput = document.getElementById('role');
  const facultyBtn = document.getElementById('facultyBtn');
  const studentOrgBtn = document.getElementById('studentOrgBtn');
  const adminBtn = document.getElementById('adminBtn');
  const superAdminBtn = document.getElementById('superAdminBtn');
  const loginForm = document.querySelector('.login-form');

  function showLoginForRole(role, label) {
    if (roleInput) roleInput.value = role;
    if (loginForm) {
      loginForm.style.display = 'flex';
      const emailInput = loginForm.querySelector('input[type="email"]');
      if (emailInput) emailInput.value = '';
      const passwordInput = loginForm.querySelector('input[type="password"]');
      if (passwordInput) passwordInput.value = '';
    }
    [facultyBtn, studentOrgBtn, adminBtn, superAdminBtn].forEach(btn => {
      if (btn) btn.classList.remove('selected');
    });
    switch (role) {
      case 'faculty':
        if (facultyBtn) facultyBtn.classList.add('selected');
        break;
      case 'student_organization':
        if (studentOrgBtn) studentOrgBtn.classList.add('selected');
        break;
      case 'admin':
        if (adminBtn) adminBtn.classList.add('selected');
        break;
      case 'super_admin':
        if (superAdminBtn) superAdminBtn.classList.add('selected');
        break;
    }
  }

  if (facultyBtn) {
    facultyBtn.addEventListener('click', () => showLoginForRole('faculty', 'Faculty'));
  }
  if (studentOrgBtn) {
    studentOrgBtn.addEventListener('click', () => showLoginForRole('student_organization', 'Student Org'));
  }
  if (adminBtn) {
    adminBtn.addEventListener('click', () => showLoginForRole('admin', 'Admin'));
  }
  if (superAdminBtn) {
    superAdminBtn.addEventListener('click', () => showLoginForRole('super_admin', 'Super Admin'));
  }

  // Forgot password modal logic
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      forgotPasswordModal.style.display = 'flex';
    });
  }

  if (closeModalBtn && forgotPasswordModal) {
    closeModalBtn.addEventListener('click', function() {
      forgotPasswordModal.style.display = 'none';
    });
  }

  window.addEventListener('click', function(e) {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.style.display = 'none';
    }
  });

  // Show/hide password logic
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

  // ==========================================
  // FORGOT PASSWORD - Direct Supabase Auth
  // ==========================================
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('resetEmail').value.trim();
      const statusEl = document.getElementById('resetStatus');
      const submitBtn = document.getElementById('sendResetBtn');
      
      if (!email) {
        statusEl.textContent = 'Please enter your email address';
        statusEl.className = 'reset-status error show';
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.textContent = 'Sending password reset email...';
      statusEl.className = 'reset-status show';
      
      try {
        const supabase = window.supabaseClient;
        
        // Use Supabase Auth directly - no server needed!
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/User%20panel/reset-password.html'
        });
        
        if (error) {
          console.error('Reset password error:', error);
          statusEl.textContent = error.message || 'Failed to send reset email';
          statusEl.className = 'reset-status error show';
        } else {
          statusEl.textContent = 'Password reset email sent! Check your email.';
          statusEl.className = 'reset-status success show';
          forgotPasswordForm.reset();
        }
      } catch (err) {
        console.error('Forgot password error:', err);
        statusEl.textContent = 'Connection error. Please try again.';
        statusEl.className = 'reset-status error show';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    });
  }

  // ==========================================
  // LOGIN - Supabase Auth signInWithPassword
  // ==========================================
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const supabase = window.supabaseClient;
      if (!supabase) {
        showCustomAlert('Error', 'Database connection not available', 'error');
        return;
      }
      
      const emailInput = loginForm.querySelector('input[type="email"]');
      const passwordInput = loginForm.querySelector('input[type="password"]');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const roleInput = document.getElementById('role');
      const selectedRole = roleInput ? roleInput.value.trim() : '';
      const role = selectedRole.toLowerCase();

      console.log(`[LOGIN ATTEMPT] Email: ${email}, Role: ${role}`);

      showLoading('Signing in...', 'Authenticating your credentials');
      
      const startTime = Date.now();
      const minLoadingTime = 1500;

      try {
        // Use Supabase Auth directly
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        console.log('Supabase Auth result:', authData);
        console.log('Supabase Auth error:', authError);

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        hideLoading();

        if (authError) {
          console.log(`[LOGIN FAILED] Email: ${email}, Reason: ${authError.message}`);
          showCustomAlert('Login Failed', authError.message || 'Invalid email or password', 'error');
          return;
        }

        // Auth succeeded - now lookup user in custom users table to get role
        const user = authData.user;
        console.log('[AUTH SUCCESS] User ID:', user.id);

        // Look up user data from custom users table by email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          console.log('[LOGIN FAILED] User not found in users table');
          showCustomAlert('Login Failed', 'User account not found. Please contact administrator.', 'error');
          return;
        }

        console.log('[USER DATA]', userData);

        const userName = userData.name || userData.full_name || userData.first_name || userData.username || `User ${userData.id}`;
        const userRole = userData.role_name || userData.role;
        
        console.log(`[LOGIN SUCCESS] Email: ${email}, Role: ${userRole}, Name: ${userName}`);
        
        // Store user information
        localStorage.setItem('id', userData.id);
        localStorage.setItem('user_id', userData.id);
        localStorage.setItem('user_name', userName);
        localStorage.setItem('user_role', userRole);
        localStorage.setItem('user_email', email);
        
        showCustomAlert('Welcome!', `Login successful! Welcome, ${userName}`, 'success');
        
        setTimeout(() => {
          const normalizedRole = userRole.toLowerCase().replace(' ', '_');
          switch (normalizedRole) {
            case 'super_admin':
              window.location.href = '../SuperAdmin panel/SuperAdmin-panel/SuperAdminDashboard.html';
              break;
            case 'admin':
              window.location.href = '../Admin panel/Admin-panel/AdminDashboard.html';
              break;
            case 'faculty':
            case 'student_organization':
              window.location.href = './Userdashboard.html';
              break;
            default:
              showCustomAlert('Error', 'Unknown role!', 'error');
          }
        }, 2000);

      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        hideLoading();
        console.error('Login error:', error);
        showCustomAlert('Error', 'An unexpected error occurred. Please try again.', 'error');
      }
    });
  }
});
