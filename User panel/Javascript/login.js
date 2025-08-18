const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

document.addEventListener('DOMContentLoaded', function() {
  // Role switch logic
  const facultyBtn = document.getElementById('facultyBtn');
  const adminBtn = document.getElementById('adminBtn');
  const roleInput = document.getElementById('role');

  let facultyToggle = true; // true: faculty, false: student_organization
  let adminToggle = true;   // true: admin, false: super_admin

  // Set initial state
  if (roleInput) roleInput.value = 'faculty';
  if (facultyBtn) facultyBtn.textContent = 'Faculty';
  if (adminBtn) adminBtn.textContent = 'Admin';

  if (facultyBtn && roleInput) {
    facultyBtn.addEventListener('click', () => {
      facultyToggle = !facultyToggle;
      roleInput.value = facultyToggle ? 'faculty' : 'student_organization';
      facultyBtn.textContent = facultyToggle ? 'Faculty' : 'Student Org';
      facultyBtn.classList.add('active');
      if (adminBtn) adminBtn.classList.remove('active');
    });
    facultyBtn.textContent = facultyToggle ? 'Faculty' : 'Student Org';
  }

  if (adminBtn && roleInput) {
    adminBtn.addEventListener('click', () => {
      adminToggle = !adminToggle;
      roleInput.value = adminToggle ? 'admin' : 'super_admin';
      adminBtn.textContent = adminToggle ? 'Admin' : 'Super Admin';
      adminBtn.classList.add('active');
      if (facultyBtn) facultyBtn.classList.remove('active');
    });
    adminBtn.textContent = adminToggle ? 'Admin' : 'Super Admin';
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
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const userId = loginForm.querySelector('input[type="text"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;
        const role = document.getElementById('role').value;
  
        console.log(`[LOGIN ATTEMPT] UserID: ${userId}, Role: ${role}`);
  
        // Query Supabase users table for matching userId and role
        // Try to get all available columns, but handle if some don't exist
        let { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('role', role);

        // If the above fails, try with minimal columns
        if (error && error.code === '42703') {
          console.log('Trying with minimal columns...');
          const result = await supabase
            .from('users')
            .select('id, role, password')
            .eq('id', userId)
            .eq('role', role);
          data = result.data;
          error = result.error;
        }

        console.log('Supabase query result:', data);
        console.log('Supabase query error:', error);

        if (error) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Database error`, error);
          alert('Database connection error. Please try again.');
          return;
        }

        if (!data || data.length === 0) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Invalid User ID or Role`);
          alert('Invalid User ID or Role!');
          return;
        }

        // Get the first (and should be only) user record
        const user = data[0];        // Check password (assuming plaintext for demo)
        if (!user.password || user.password !== password) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Incorrect password`);
          alert('Incorrect password!');
          return;
        }


    // Get user's display name from available columns
    const userName = user.name || user.full_name || user.first_name || user.username || `User ${user.id}`;
    
    console.log(`[LOGIN SUCCESS] UserID: ${userId}, Role: ${user.role}, Name: ${userName}`);
    console.log('Available user data:', user);
    
    // Store user information in localStorage
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_name', userName);
    localStorage.setItem('user_role', user.role);
    
    alert('Login successful!');
    switch (user.role) {
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
          alert('Unknown role!');
      }
    })
  }
});