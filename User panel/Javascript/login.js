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
        const { data, error } = await supabase
          .from('users')
          .select('id, name, role, password')
          .eq('id', userId)
          .eq('role', role)
          .single();
  
        console.log('Supabase query result:', data);
  
        if (error || !data) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Invalid User ID or Role`);
          alert('Invalid User ID or Role!');
          return;
        }
  
        // Check password (assuming plaintext for demo)
        if (!data.password || data.password !== password) {
          console.log(`[LOGIN FAILED] UserID: ${userId}, Role: ${role}, Reason: Incorrect password`);
          alert('Incorrect password!');
          return;
        }


    console.log(`[LOGIN SUCCESS] UserID: ${userId}, Role: ${data.role}, Name: ${data.name}`);
    
    // Store user information in localStorage
    localStorage.setItem('user_id', data.id);
    localStorage.setItem('user_name', data.name);
    localStorage.setItem('user_role', data.role);
    
    alert('Login successful!');
    switch (data.role) {
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