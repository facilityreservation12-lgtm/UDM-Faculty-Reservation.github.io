const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

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
      // Set placeholder for User ID field
      const userIdInput = loginForm.querySelector('input[type="text"]');
      if (userIdInput) userIdInput.placeholder = `${label} User ID`;
      // Reset password field
      const passwordInput = loginForm.querySelector('input[type="password"]');
      if (passwordInput) passwordInput.value = '';
    }
    // Indicate selected button
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

  // Show/hide password logic for modal and login
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

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const userId = loginForm.querySelector('input[type="text"]').value.trim();
      const password = loginForm.querySelector('input[type="password"]').value;
      const roleInput = document.getElementById('role');
      const selectedRole = roleInput ? roleInput.value.trim() : '';
      const role = selectedRole.toLowerCase();
      const roleFilter = role.replace(/\s+/g, '_');

      console.log(`[LOGIN ATTEMPT] UserID: ${userId}, Role: ${role}`);

      // ===== START LOADING HERE =====
      showLoading('Signing in...', 'Authenticating your credentials');
      
      // Start timer for minimum loading duration
      const startTime = Date.now();
      const minLoadingTime = 1500; // 1.5 seconds minimum

      try {
        // Query Supabase users table for matching userId and role
        let { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .ilike('role', roleFilter);

        // If the above fails, try with minimal columns
        if (error && error.code === '42703') {
          console.log('Trying with minimal columns...');
          const result = await supabase
            .from('users')
            .select('id, role, password')
            .eq('id', userId)
            .ilike('role', roleFilter);
          data = result.data;
          error = result.error;
        }

        console.log('Supabase query result:', data);
        console.log('Supabase query error:', error);

        // Calculate remaining time to show loading
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        // Wait for minimum loading time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        // ===== HIDE LOADING BEFORE SHOWING ALERTS =====
        hideLoading();

        if (error) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Database error`, error);
          showCustomAlert('Connection Error', 'Database connection error. Please try again.', 'error');
          return;
        }

        if (!data || data.length === 0) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Invalid User ID or Role`);
          showCustomAlert('Login Failed', 'Invalid User ID or Role!', 'error');
          return;
        }

        // Get the first (and should be only) user record
        const user = data[0];
        
        // Check password (assuming plaintext for demo)
        if (!user.password || user.password !== password) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Incorrect password`);
          showCustomAlert('Login Failed', 'Incorrect password!', 'error');
          return;
        }

        // Get user's display name from available columns
        const userName = user.name || user.full_name || user.first_name || user.username || `User ${user.id}`;
        
        console.log(`[LOGIN SUCCESS] UserID: ${userId}, Role: ${user.role_name || user.role}, Name: ${userName}`);
        console.log('Available user data:', user);
        
        // Store user information in localStorage
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('user_name', userName);
        localStorage.setItem('user_role', user.role_name || user.role);
        
        showCustomAlert('Welcome!', `Login successful! Welcome, ${userName}`, 'success');
        
        // Redirect after showing success message
        setTimeout(() => {
          const normalizedRole = user.role || user.role_name.toLowerCase().replace(' ', '_');
          switch (normalizedRole) {
            case 'super_admin':
              window.location.href = '../SuperAdmin panel/SuperAdmin-panel/SuperAdminDashboard.html';
              break;
            case 'admin':
              window.location.href = '../Admin panel/Admin-panel/AdminDashboard.html';
              break;
            case 'faculty':
              window.location.href = '../User panel/Userdashboard.html';
              break;
            case 'student_organization':
              window.location.href = '../User panel/Userdashboard.html';
              break;
            default:
              showCustomAlert('Error', 'Unknown role!', 'error');
          }
        }, 2000); // Wait 2 seconds before redirect

      } catch (error) {
        // ===== ALSO HIDE LOADING IN CATCH BLOCK =====
        // Calculate remaining time to show loading
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        // Wait for minimum loading time if needed
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