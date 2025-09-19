let editingUserId = null;

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
  // In a real application, you would track this through:
  // - WebSocket connections
  // - Regular heartbeat API calls
  // - Database last_seen timestamps
  
  // For demo purposes, randomly set some users as online
  const allUserIds = Array.from(document.querySelectorAll('.user-row')).map(row => row.dataset.userId);
  onlineUsers.clear();
  
  // Randomly make 30-70% of users "online"
  const onlineCount = Math.floor(allUserIds.length * (0.3 + Math.random() * 0.4));
  const shuffled = allUserIds.sort(() => 0.5 - Math.random());
  shuffled.slice(0, onlineCount).forEach(id => onlineUsers.add(id));
}

// Load users from Supabase
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
      return;
    }

    console.log('Fetched users:', users);

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
      return;
    }

    // Clear loading message
    tbody.innerHTML = '';

    // Create user rows
    users.forEach(user => {
      const row = createUserRow(user);
      tbody.appendChild(row);
    });

    // Simulate online/offline status
    trackUserActivity();
    updateOnlineStatus();

  } catch (error) {
    console.error('Error in loadUsers:', error);
    tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
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
    passwordField.parentElement.style.display = 'flex';
    passwordField.required = true;
  }
  if (rePasswordField && rePasswordField.parentElement) {
    rePasswordField.parentElement.style.display = 'flex';
    rePasswordField.required = true;
  }
  if (roleField) {
    roleField.style.display = 'block';
    roleField.required = true;
  }
  
  // Initialize password icons with different defaults
  setTimeout(initializePasswordIcons, 100);
}

function closeModal() {
  document.getElementById('userModal').style.display = 'none';
  document.getElementById('userForm').reset();
}

function openEditModal(user) {
  document.getElementById('userModal').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Edit User';
  
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
    passwordField.parentElement.style.display = 'flex';
    passwordField.required = false; // Not required when editing
  }
  if (rePasswordField && rePasswordField.parentElement) {
    rePasswordField.parentElement.style.display = 'flex';
    rePasswordField.required = false; // Not required when editing
  }
  if (roleField) {
    roleField.style.display = 'block';
    roleField.required = true;
  }
  
  // Initialize password icons with different defaults
  setTimeout(initializePasswordIcons, 200);
}

let currentEditingUserId = null;

// Edit user function
async function editUser(userId) {
  try {
    const sb = getSupabase();
    if (!sb) {
      alert('Database connection error');
      return;
    }

    const { data: user, error } = await sb
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      alert('Error loading user data');
      return;
    }

    currentEditingUserId = userId;
    openEditModal(user);

  } catch (error) {
    console.error('Error in editUser:', error);
    alert('Error loading user data');
  }
}

// Delete user function
function deleteUser(userId) {
  document.getElementById('confirmMessage').textContent = 'Are you sure you want to delete this user?';
  document.getElementById('confirmPopup').style.display = 'block';
  
  document.getElementById('confirmYes').onclick = async () => {
    try {
      const sb = getSupabase();
      if (!sb) {
        alert('Database connection error');
        return;
      }

      const { error } = await sb
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
        return;
      }

      alert('User deleted successfully');
      closeConfirm();
      await loadUsers(); // Reload the user list

    } catch (error) {
      console.error('Error in deleteUser:', error);
      alert('Error deleting user');
    }
  };
}

function closeConfirm() {
  document.getElementById('confirmPopup').style.display = 'none';
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
      alert('Passwords do not match');
      return;
    }
  }

  // For new users, password is required
  if (!currentEditingUserId && !password) {
    alert('Password is required for new users');
    return;
  }

  try {
    const sb = getSupabase();
    if (!sb) {
      alert('Database connection error');
      return;
    }

    if (currentEditingUserId) {
      // Update existing user
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        role_name: role
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
        alert('Error updating user');
        return;
      }

      alert('User updated successfully');
    } else {
      // Add new user
      const { error } = await sb
        .from('users')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          role_name: role,
          password: password // Note: In production, hash the password
        });

      if (error) {
        console.error('Error adding user:', error);
        alert('Error adding user');
        return;
      }

      alert('User added successfully');
    }

    closeModal();
    await loadUsers(); // Reload the user list

  } catch (error) {
    console.error('Error in form submission:', error);
    alert('Error saving user');
  }
});

// Password toggle function with different icons for each field
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  
  if (input.type === 'password') {
    input.type = 'text';
    // Show different icons based on field when password is visible
    if (inputId === 'userPassword') {
      button.textContent = '🙈'; // New password shows see-no-evil when visible
    } else {
      button.textContent = '👁️'; // Re-enter password shows eye when visible
    }
  } else {
    input.type = 'password';
    // Reset to default icons when password is hidden
    if (inputId === 'userPassword') {
      button.textContent = '👁️'; // New password default icon (eye)
    } else {
      button.textContent = '🙈'; // Re-enter password default icon (see-no-evil)
    }
  }
}

// Initialize password field icons when modal opens
function initializePasswordIcons() {
  console.log('Initializing password icons...');
  
  const passwordButton = document.querySelector('#userPassword + .toggle-pass');
  const rePasswordButton = document.querySelector('#userRePassword + .toggle-pass');
  
  console.log('Password button found:', !!passwordButton);
  console.log('Re-password button found:', !!rePasswordButton);
  
  if (passwordButton) {
    passwordButton.textContent = '👁️'; // New password default
    console.log('Set password icon to 👁️');
  }
  if (rePasswordButton) {
    rePasswordButton.textContent = '🙈'; // Re-enter password default
    console.log('Set re-password icon to 🙈');
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
});

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('userModal');
  const popup = document.getElementById('confirmPopup');
  
  if (event.target === modal) {
    closeModal();
  }
  if (event.target === popup) {
    closeConfirm();
  }
}
