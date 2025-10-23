let editingUserId = null;

// Strong password validation function
function isStrongPassword(password) {
  // At least 8 characters
  if (password.length < 8) return false;
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // At least one number
  if (!/[0-9]/.test(password)) return false;
  
  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  
  return true;
}

// Real-time password strength validation
function validatePasswordStrength() {
  const password = document.getElementById('userPassword').value;
  const validationArea = document.getElementById('passwordValidationArea');
  
  // Show validation area when user starts typing
  if (password.length > 0) {
    validationArea.classList.add('show');
  } else {
    validationArea.classList.remove('show');
    return;
  }
  
  // Update individual validation icons
  const lengthIcon = document.getElementById('lengthIcon');
  const uppercaseIcon = document.getElementById('uppercaseIcon');
  const lowercaseIcon = document.getElementById('lowercaseIcon');
  const numberIcon = document.getElementById('numberIcon');
  const specialIcon = document.getElementById('specialIcon');
  
  // Length check
  if (password.length >= 8) {
    lengthIcon.textContent = '✅';
    lengthIcon.style.color = '#28a745';
  } else {
    lengthIcon.textContent = '❌';
    lengthIcon.style.color = '#dc3545';
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    uppercaseIcon.textContent = '✅';
    uppercaseIcon.style.color = '#28a745';
  } else {
    uppercaseIcon.textContent = '❌';
    uppercaseIcon.style.color = '#dc3545';
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    lowercaseIcon.textContent = '✅';
    lowercaseIcon.style.color = '#28a745';
  } else {
    lowercaseIcon.textContent = '❌';
    lowercaseIcon.style.color = '#dc3545';
  }
  
  // Number check
  if (/\d/.test(password)) {
    numberIcon.textContent = '✅';
    numberIcon.style.color = '#28a745';
  } else {
    numberIcon.textContent = '❌';
    numberIcon.style.color = '#dc3545';
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    specialIcon.textContent = '✅';
    specialIcon.style.color = '#28a745';
  } else {
    specialIcon.textContent = '❌';
    specialIcon.style.color = '#dc3545';
  }
}

// Real-time password match validation - now using fixed validation area
function validatePasswordMatch() {
  const password = document.getElementById('userPassword').value;
  const rePassword = document.getElementById('userRePassword').value;
  const matchArea = document.getElementById('passwordMatchArea');
  const matchIcon = document.getElementById('matchIcon');
  
  // Show match area when user starts typing in re-enter password
  if (rePassword.length > 0) {
    matchArea.classList.add('show');
    
    if (password === rePassword) {
      matchIcon.textContent = '✅';
      matchIcon.style.color = '#28a745';
      matchArea.querySelector('.validation-item span:last-child').textContent = 'Passwords match';
    } else {
      matchIcon.textContent = '❌';
      matchIcon.style.color = '#dc3545';
      matchArea.querySelector('.validation-item span:last-child').textContent = 'Passwords do not match';
    }
  } else {
    matchArea.classList.remove('show');
  }
}

// Helper to get Supabase client
function getSupabase() {
  if (typeof window !== 'undefined') {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
  }
  return null;
}

// Track online users (in a real app, this would be managed server-side)
let onlineUsers = new Set();
let currentLoggedInUserId = null;

// Global variables for pagination and filtering
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let entriesPerPage = 10;

// Function to get current logged in user
function getCurrentUser() {
  // Check multiple possible localStorage keys for user ID
  const userId = localStorage.getItem('user_id') || 
                 localStorage.getItem('id') || 
                 localStorage.getItem('currentUserId');
  
  console.log('Current user ID from localStorage:', userId);
  return userId;
}

// Simulate user activity tracking
function trackUserActivity() {
  const allUserIds = Array.from(document.querySelectorAll('.user-row')).map(row => row.dataset.userId);
  onlineUsers.clear();
  
  // Randomly make 30-70% of users "online"
  const onlineCount = Math.floor(allUserIds.length * (0.3 + Math.random() * 0.4));
  const shuffled = allUserIds.sort(() => 0.5 - Math.random());
  shuffled.slice(0, onlineCount).forEach(id => onlineUsers.add(id));
}

// Load current user account info (DISABLED - account section removed from HTML)
async function loadCurrentUserInfo() {
  console.log('ℹ️ loadCurrentUserInfo: Account section removed - function disabled');
}

async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading users...</td></tr>';
  
  // Get current logged in user
  currentLoggedInUserId = getCurrentUser();
  
  try {
    const sb = getSupabase();
    if (!sb) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Database connection error</td></tr>';
      showCustomAlert('Connection Error', 'Database connection error', 'error');
      return;
    }

    console.log('Fetching users from Supabase...');
    console.log('Current logged in user ID:', currentLoggedInUserId);
    
    const { data: users, error } = await sb
      .from('users')
      .select('id, first_name, last_name, email, role_name')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      tbody.innerHTML = `<tr><td colspan="5">Error loading users: ${error.message}</td></tr>`;
      showCustomAlert('Load Error', `Error loading users: ${error.message}`, 'error');
      return;
    }

    console.log('Fetched users:', users);

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
      return;
    }

    // Store users globally for filtering and pagination
    allUsers = users;
    filteredUsers = users;
    currentPage = 1;
    
    // Display paginated users
    displayPaginatedUsers();

    // Simulate online/offline status
    trackUserActivity();
    updateOnlineStatus();

  } catch (error) {
    console.error('Error in loadUsers:', error);
    tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
    showCustomAlert('Error', `Error: ${error.message}`, 'error');
  }
}

document.querySelectorAll('.menu a').forEach(link => {
  if (
    link.href &&
    window.location.pathname.endsWith(link.getAttribute('href'))
  ) {
    link.classList.add('active');
  }
});

// Create a user table row
function createUserRow(user) {
  const row = document.createElement('tr');
  row.className = 'user-row';
  row.dataset.userId = user.id;
  
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name';
  const role = user.role_name || 'FACULTY';
  const isCurrentUser = user.id === currentLoggedInUserId;
  
  // Convert role to CSS class name (handle spaces properly)
  const roleClass = role.toLowerCase().replace(/\s+/g, '-');
  
  // Add current user indicator
  const currentUserBadge = isCurrentUser ? ' <span class="current-user-badge">( You )</span>' : '';
  
  row.innerHTML = `
    <td style="text-align: center;">${user.id}</td>
    <td>
      <div class="user-info">
        <div class="user-name">${fullName}${currentUserBadge}</div>
        <div class="user-email">${user.email}</div>
      </div>
    </td>
    <td style="text-align: center;">
      <span class="role-badge role-${roleClass}">${role}</span>
    </td>
    <td style="text-align: center;">
      <span class="status-indicator" id="status-${user.id}">
        <span class="status-dot offline"></span>
        <span class="status-text">Offline</span>
      </span>
    </td>
    <td style="text-align: center;">
      <div class="action-buttons">
        <button class="edit-btn" onclick="editUser('${user.id}')">Edit</button>
        ${!isCurrentUser ? `<button class="delete-btn" onclick="deleteUser('${user.id}')">Delete</button>` : '<span class="no-delete">Cannot delete yourself</span>'}
      </div>
    </td>
  `;
  
  return row;
}

// Update online/offline status indicators
function updateOnlineStatus() {
  const statusIndicators = document.querySelectorAll('.status-indicator');
  
  statusIndicators.forEach(indicator => {
    const userId = indicator.id.replace('status-', '');
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');
    
    if (onlineUsers.has(userId)) {
      dot.className = 'status-dot online';
      text.textContent = 'Online';
      indicator.className = 'status-indicator online';
    } else {
      dot.className = 'status-dot offline';
      text.textContent = 'Offline';
      indicator.className = 'status-indicator offline';
    }
  });
}

// Modal functions
function openAddModal() {
  document.getElementById('userModal').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Add User';
  document.getElementById('userForm').reset();
  currentEditingUserId = null;
  
  // Set button text to "Add" for new user
  const submitButton = document.querySelector('#userForm button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Add';
  }
  
  // Show all fields when adding new user
  const allLabels = document.querySelectorAll('label');
  allLabels.forEach(label => {
    label.style.display = 'block';
  });
  
  // Show all input fields
  const firstNameField = document.getElementById('userFirstName');
  const lastNameField = document.getElementById('userLastName');
  const emailField = document.getElementById('userEmail');
  const passwordField = document.getElementById('userPassword');
  const rePasswordField = document.getElementById('userRePassword');
  const roleField = document.getElementById('userRole');
  
  if (firstNameField) {
    firstNameField.style.display = 'block';
    firstNameField.required = true;
  }
  if (lastNameField) {
    lastNameField.style.display = 'block';
    lastNameField.required = true;
  }
  if (emailField) {
    emailField.style.display = 'block';
    emailField.required = true;
  }
  if (passwordField && passwordField.parentElement) {
    passwordField.parentElement.style.display = 'block';
    passwordField.required = true;
  }
  if (rePasswordField && rePasswordField.parentElement) {
    rePasswordField.parentElement.style.display = 'block';
    rePasswordField.required = true;
  }
  if (roleField) {
    roleField.style.display = 'block';
    roleField.required = true;
  }
  
  // Initialize password icons with different defaults
  setTimeout(initializePasswordIcons, 100);
  
  // Re-initialize password validation
  setTimeout(() => {
    const passwordField = document.getElementById('userPassword');
    const rePasswordField = document.getElementById('userRePassword');
    
    if (passwordField) {
      passwordField.removeEventListener('input', validatePasswordStrength);
      passwordField.addEventListener('input', validatePasswordStrength);
    }
    
    if (rePasswordField) {
      rePasswordField.removeEventListener('input', validatePasswordMatch);
      rePasswordField.addEventListener('input', validatePasswordMatch);
    }
  }, 200);
}

function closeModal() {
  document.getElementById('userModal').style.display = 'none';
  document.getElementById('userForm').reset();
}

function openEditModal(user) {
  document.getElementById('userModal').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Edit User';
  
  // Set button text to "Save" for editing user
  const submitButton = document.querySelector('#userForm button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Save';
  }
  
  // Populate form with user data
  document.getElementById('userFirstName').value = user.first_name || '';
  document.getElementById('userLastName').value = user.last_name || '';
  document.getElementById('userEmail').value = user.email || '';
  
  // Set role value immediately
  let roleFieldElement = document.getElementById('userRole');
  if (roleFieldElement && user.role_name) {
    roleFieldElement.value = user.role_name;
    console.log('Setting role to:', user.role_name);
  }
  
  // Clear password fields for editing
  document.getElementById('userPassword').value = '';
  document.getElementById('userRePassword').value = '';
  
  // Show all fields including password fields for editing
  const allLabels = document.querySelectorAll('label');
  allLabels.forEach(label => {
    label.style.display = 'block';
  });
  
  // Show all input fields
  const firstNameField = document.getElementById('userFirstName');
  const lastNameField = document.getElementById('userLastName');
  const emailField = document.getElementById('userEmail');
  const passwordField = document.getElementById('userPassword');
  const rePasswordField = document.getElementById('userRePassword');
  const roleField = document.getElementById('userRole');
  
  if (firstNameField) {
    firstNameField.style.display = 'block';
    firstNameField.required = true;
  }
  if (lastNameField) {
    lastNameField.style.display = 'block';
    lastNameField.required = true;
  }
  if (emailField) {
    emailField.style.display = 'block';
    emailField.required = true;
  }
  if (passwordField && passwordField.parentElement) {
    passwordField.parentElement.style.display = 'block';
    passwordField.required = false; // Not required when editing
  }
  if (rePasswordField && rePasswordField.parentElement) {
    rePasswordField.parentElement.style.display = 'block';
    rePasswordField.required = false; // Not required when editing
  }
  if (roleField) {
    roleField.style.display = 'block';
    roleField.required = true;
  }
  
  // Initialize password icons with different defaults
  setTimeout(initializePasswordIcons, 200);
  
  // Re-initialize password validation
  setTimeout(() => {
    const passwordField = document.getElementById('userPassword');
    const rePasswordField = document.getElementById('userRePassword');
    
    if (passwordField) {
      passwordField.removeEventListener('input', validatePasswordStrength);
      passwordField.addEventListener('input', validatePasswordStrength);
    }
    
    if (rePasswordField) {
      rePasswordField.removeEventListener('input', validatePasswordMatch);
      rePasswordField.addEventListener('input', validatePasswordMatch);
    }
  }, 300);
}

let currentEditingUserId = null;

// Edit user function
async function editUser(userId) {
  showLoading('Loading user data...', 'Please wait');
  
  try {
    const sb = getSupabase();
    if (!sb) {
      hideLoading();
      showCustomAlert('Connection Error', 'Database connection error', 'error');
      return;
    }

    const { data: user, error } = await sb
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    hideLoading();

    if (error) {
      console.error('Error fetching user:', error);
      showCustomAlert('Load Error', 'Error loading user data', 'error');
      return;
    }

    currentEditingUserId = userId;
    openEditModal(user);

  } catch (error) {
    hideLoading();
    console.error('Error in editUser:', error);
    showCustomAlert('Error', 'Error loading user data', 'error');
  }
}

// Delete user function
function deleteUser(userId) {
  showCustomConfirm(
    'Confirm Delete',
    'Are you sure you want to delete this user? This action cannot be undone.',
    async () => {
      showLoading('Deleting user...', 'Please wait');
      
      try {
        const sb = getSupabase();
        if (!sb) {
          hideLoading();
          showCustomAlert('Connection Error', 'Database connection error', 'error');
          return;
        }

        const { error } = await sb
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Error deleting user:', error);
          hideLoading();
          showCustomAlert('Delete Error', 'Error deleting user', 'error');
          return;
        }

        await loadUsers(); // Reload the user list
        hideLoading();
        showCustomAlert('Success', 'User deleted successfully', 'success');

      } catch (error) {
        hideLoading();
        console.error('Error in deleteUser:', error);
        showCustomAlert('Error', 'Error deleting user', 'error');
      }
    }
  );
}

// Handle form submission
document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const firstName = document.getElementById('userFirstName').value.trim();
  const lastName = document.getElementById('userLastName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const rePassword = document.getElementById('userRePassword').value;
  const role = document.getElementById('userRole').value;

  // Validation for passwords
  if (password || rePassword) {
    if (password !== rePassword) {
      showCustomAlert('Validation Error', 'Passwords do not match', 'warning');
      return;
    }
    
    // Strong password validation
    if (password && !isStrongPassword(password)) {
      showCustomAlert('Password Requirements', 
        'Password must be at least 8 characters long and contain:\n' +
        '• At least one uppercase letter\n' +
        '• At least one lowercase letter\n' +
        '• At least one number\n' +
        '• At least one special character (!@#$%^&*)', 
        'warning');
      return;
    }
  }

  // Validation
  if (!firstName || !lastName || !email || !role) {
    showCustomAlert('Validation Error', 'Please fill in all required fields', 'warning');
    return;
  }

  // For new users, password is required
  if (!currentEditingUserId && !password) {
    showCustomAlert('Validation Error', 'Password is required for new users', 'warning');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showCustomAlert('Validation Error', 'Please enter a valid email address', 'warning');
    return;
  }

  // Map role_name to role value
  function getRoleValue(roleName) {
    switch (roleName) {
      case 'ADMIN':
        return 'admin';
      case 'SUPER ADMIN':
        return 'super_admin';
      case 'STUDENT ORGANIZATION':
        return 'student_organization';
      case 'FACULTY':
        return 'faculty';
      default:
        return roleName.toLowerCase();
    }
  }

  showLoading(
    currentEditingUserId ? 'Updating user...' : 'Adding user...', 
    'Please wait'
  );

  try {
    const sb = getSupabase();
    if (!sb) {
      hideLoading();
      showCustomAlert('Connection Error', 'Database connection error', 'error');
      return;
    }

    const roleValue = getRoleValue(role);

    if (currentEditingUserId) {
      // Update existing user
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        role_name: role,
        role: roleValue
      };
      
      // Only update password if provided
      if (password) {
        updateData.password = password;
      }
      
      const { error } = await sb
        .from('users')
        .update(updateData)
        .eq('id', currentEditingUserId);

      if (error) {
        console.error('Error updating user:', error);
        hideLoading();
        showCustomAlert('Update Error', 'Error updating user', 'error');
        return;
      }

      closeModal();
      await loadUsers();
      hideLoading();
      showCustomAlert('Success', 'User updated successfully', 'success');
      
    } else {
      // Generate sequential user ID based on existing users
      const generateSequentialUserId = async (roleName) => {
        const rolePrefix = getRolePrefix(roleName);
        
        // Get all existing users with the same role prefix
        const { data: existingUsers, error } = await sb
          .from('users')
          .select('id')
          .like('id', `${rolePrefix}%`)
          .order('id', { ascending: false });
        
        if (error) {
          console.error('Error fetching existing users for ID generation:', error);
          // Fallback to 001 if there's an error
          return `${rolePrefix}001`;
        }
        
        let nextNumber = 1;
        
        if (existingUsers && existingUsers.length > 0) {
          // Extract the highest number from existing IDs
          const numbers = existingUsers.map(user => {
            const match = user.id.match(new RegExp(`^${rolePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
          }).filter(num => !isNaN(num));
          
          if (numbers.length > 0) {
            const maxNumber = Math.max(...numbers);
            nextNumber = maxNumber + 1;
          }
        }
        
        // Format number with leading zeros (3 digits)
        const formattedNumber = nextNumber.toString().padStart(3, '0');
        return `${rolePrefix}${formattedNumber}`;
      };
      
      const getRolePrefix = (roleName) => {
        switch (roleName) {
          case 'ADMIN':
            return 'A-';
          case 'SUPER ADMIN':
            return 'S-';
          case 'STUDENT ORGANIZATION':
            return 'O-';
          case 'FACULTY':
            return 'F-';
          default:
            return 'U';
        }
      };

      // Generate sequential ID based on role
      const newUserId = await generateSequentialUserId(role);
      
      // Add new user
      const newUserData = {
        id: newUserId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        role_name: role,
        role: roleValue,
        password: password
      };
      
      console.log('Adding new user with data:', newUserData);
      
      const { data, error } = await sb
        .from('users')
        .insert(newUserData)
        .select();

      if (error) {
        console.error('Error adding user:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        hideLoading();
        showCustomAlert('Add Error', `Error adding user: ${error.message || 'Unknown error'}`, 'error');
        return;
      }

      console.log('User added successfully:', data);
      closeModal();
      await loadUsers();
      hideLoading();
      showCustomAlert('Success', 'User added successfully', 'success');
    }

  } catch (error) {
    hideLoading();
    console.error('Error in form submission:', error);
    showCustomAlert('Error', 'Error saving user', 'error');
  }
});

// Password toggle function for inline icons
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const passwordGroup = input.closest('.password-group');
  const toggle = passwordGroup ? passwordGroup.querySelector('.password-toggle') : input.nextElementSibling;
  
  if (!toggle) {
    console.error('Toggle element not found for input:', inputId);
    return;
  }
  
  if (input.type === 'password') {
    input.type = 'text';
    toggle.textContent = '🙈'; // Show hide icon when password is visible
  } else {
    input.type = 'password';
    toggle.textContent = '👁️'; // Show eye icon when password is hidden
  }
}

// Initialize password field icons when modal opens
function initializePasswordIcons() {
  console.log('Initializing password icons...');
  
  try {
    // Find password toggles within password groups
    const passwordInput = document.querySelector('#userPassword');
    const rePasswordInput = document.querySelector('#userRePassword');
    
    if (passwordInput) {
      const passwordGroup = passwordInput.closest('.password-group');
      const passwordToggle = passwordGroup ? passwordGroup.querySelector('.password-toggle') : null;
      
      if (passwordToggle) {
        passwordToggle.textContent = '👁️'; // Default eye icon
        console.log('Set password icon to 👁️');
      } else {
        console.warn('Password toggle not found for userPassword');
      }
    }
    
    if (rePasswordInput) {
      const rePasswordGroup = rePasswordInput.closest('.password-group');
      const rePasswordToggle = rePasswordGroup ? rePasswordGroup.querySelector('.password-toggle') : null;
      
      if (rePasswordToggle) {
        rePasswordToggle.textContent = '👁️'; // Default eye icon
        console.log('Set re-password icon to 👁️');
      } else {
        console.warn('Re-password toggle not found for userRePassword');
      }
    }
  } catch (error) {
    console.error('Error initializing password icons:', error);
  }
}

// Simulate real-time status updates
setInterval(() => {
  trackUserActivity();
  updateOnlineStatus();
}, 30000); // Update every 30 seconds

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('SA_manage.js loaded, initializing...');
  loadUsers();
  
  // Add password validation feedback
  const passwordField = document.getElementById('userPassword');
  const rePasswordField = document.getElementById('userRePassword');
  
  if (passwordField) {
    passwordField.addEventListener('input', validatePasswordStrength);
  }
  
  if (rePasswordField) {
    rePasswordField.addEventListener('input', validatePasswordMatch);
  }
});

// Display paginated users
function displayPaginatedUsers() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  if (!filteredUsers || filteredUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No users match the current filters</td></tr>';
    updatePaginationInfo(0, 0, 0);
    return;
  }

  // Sort users to put current user at the top
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aIsCurrentUser = a.id === currentLoggedInUserId;
    const bIsCurrentUser = b.id === currentLoggedInUserId;
    
    if (aIsCurrentUser && !bIsCurrentUser) return -1;
    if (!aIsCurrentUser && bIsCurrentUser) return 1;
    return 0;
  });

  // Calculate pagination
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, sortedUsers.length);
  const currentPageUsers = sortedUsers.slice(startIndex, endIndex);

  // Create rows for current page
  currentPageUsers.forEach(user => {
    const row = createUserRow(user);
    tbody.appendChild(row);
  });

  // Update pagination controls
  updatePaginationInfo(startIndex + 1, endIndex, sortedUsers.length);
  updatePaginationButtons(sortedUsers.length);
  
  // Update status after DOM update
  setTimeout(() => {
    trackUserActivity();
    updateOnlineStatus();
  }, 100);
}

// Update pagination info display
function updatePaginationInfo(start, end, total) {
  const paginationInfo = document.getElementById('paginationInfo');
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${start} to ${end} of ${total} entries`;
  }
}

// Update pagination buttons
function updatePaginationButtons(totalCount = filteredUsers.length) {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageNumbers = document.getElementById('pageNumbers');

  if (!totalCount) return;

  const totalPages = Math.ceil(totalCount / entriesPerPage);
  
  // Update previous button
  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }
  
  // Update next button
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
  
  // Update page numbers
  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.onclick = () => goToPage(i);
      
      if (i === currentPage) {
        pageBtn.classList.add('active');
      }
      
      pageNumbers.appendChild(pageBtn);
    }
  }
}

// Navigation functions
function goToPage(page) {
  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    displayPaginatedUsers();
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayPaginatedUsers();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayPaginatedUsers();
  }
}

// Change entries per page
function changeEntriesPerPage() {
  const select = document.getElementById('entriesPerPage');
  if (select) {
    entriesPerPage = parseInt(select.value);
    currentPage = 1;
    displayPaginatedUsers();
  }
}

// Filter functions
function applyFilters() {
  const idFilter = document.getElementById('filterID')?.value.toLowerCase() || '';
  const nameFilter = document.getElementById('filterName')?.value.toLowerCase() || '';
  const roleFilter = document.getElementById('filterRole')?.value || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';

  filteredUsers = allUsers.filter(user => {
    // ID filter
    if (idFilter && !user.id.toLowerCase().includes(idFilter)) {
      return false;
    }

    // Name/Email filter
    if (nameFilter) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      if (!fullName.includes(nameFilter) && !email.includes(nameFilter)) {
        return false;
      }
    }

    // Role filter
    if (roleFilter && user.role_name !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter) {
      const isOnline = onlineUsers.has(user.id);
      if ((statusFilter === 'Online' && !isOnline) || (statusFilter === 'Offline' && isOnline)) {
        return false;
      }
    }

    return true;
  });

  // Reset to first page
  currentPage = 1;
  displayPaginatedUsers();
}

// Individual filter functions (called from HTML)
function filterByID() {
  applyFilters();
}

function filterByName() {
  applyFilters();
}

function filterByRole() {
  applyFilters();
}

function filterByStatus() {
  applyFilters();
}

function clearFilters() {
  // Clear all filter inputs
  document.getElementById('filterID').value = '';
  document.getElementById('filterName').value = '';
  document.getElementById('filterRole').value = '';
  document.getElementById('filterStatus').value = '';
  
  // Reset filtered users to show all
  filteredUsers = allUsers;
  currentPage = 1;
  displayPaginatedUsers();
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('userModal');
  
  if (event.target === modal) {
    closeModal();
  }
}