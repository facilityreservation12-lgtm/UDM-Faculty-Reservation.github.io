let editingUserId = null;

// Strong password validation function
function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

function validatePasswordStrength() {
  const password = document.getElementById('userPassword').value;
  const validationArea = document.getElementById('passwordValidationArea');

  if (password.length > 0) {
    validationArea.classList.add('show');
  } else {
    validationArea.classList.remove('show');
    return;
  }

  const lengthIcon = document.getElementById('lengthIcon');
  const uppercaseIcon = document.getElementById('uppercaseIcon');
  const lowercaseIcon = document.getElementById('lowercaseIcon');
  const numberIcon = document.getElementById('numberIcon');
  const specialIcon = document.getElementById('specialIcon');

  if (password.length >= 8) {
    lengthIcon.textContent = '✅';
    lengthIcon.style.color = '#28a745';
  } else {
    lengthIcon.textContent = '❌';
    lengthIcon.style.color = '#dc3545';
  }

  if (/[A-Z]/.test(password)) {
    uppercaseIcon.textContent = '✅';
    uppercaseIcon.style.color = '#28a745';
  } else {
    uppercaseIcon.textContent = '❌';
    uppercaseIcon.style.color = '#dc3545';
  }

  if (/[a-z]/.test(password)) {
    lowercaseIcon.textContent = '✅';
    lowercaseIcon.style.color = '#28a745';
  } else {
    lowercaseIcon.textContent = '❌';
    lowercaseIcon.style.color = '#dc3545';
  }

  if (/\d/.test(password)) {
    numberIcon.textContent = '✅';
    numberIcon.style.color = '#28a745';
  } else {
    numberIcon.textContent = '❌';
    numberIcon.style.color = '#dc3545';
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    specialIcon.textContent = '✅';
    specialIcon.style.color = '#28a745';
  } else {
    specialIcon.textContent = '❌';
    specialIcon.style.color = '#dc3545';
  }
}

function validatePasswordMatch() {
  const password = document.getElementById('userPassword').value;
  const rePassword = document.getElementById('userRePassword').value;
  const matchArea = document.getElementById('passwordMatchArea');
  const matchIcon = document.getElementById('matchIcon');

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

function getSupabase() {
  if (typeof window !== 'undefined') {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
  }
  return null;
}

let onlineUsers = new Set();
let currentLoggedInUserId = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let entriesPerPage = 10;

function getCurrentUser() {
  const userId = localStorage.getItem('user_id') || 
                 localStorage.getItem('id') || 
                 localStorage.getItem('currentUserId');

  console.log('Current user ID from localStorage:', userId);
  return userId;
}

function trackUserActivity() {
  const allUserIds = Array.from(document.querySelectorAll('.user-row')).map(row => row.dataset.userId);
  onlineUsers.clear();
  const onlineCount = Math.floor(allUserIds.length * (0.3 + Math.random() * 0.4));
  const shuffled = allUserIds.sort(() => 0.5 - Math.random());
  shuffled.slice(0, onlineCount).forEach(id => onlineUsers.add(id));
}

async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading users...</td></tr>';

  currentLoggedInUserId = getCurrentUser();

  try {
    const sb = getSupabase();
    if (!sb) {
      throw new Error('Supabase client not initialized');
    }

    const { data: users, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name, role, email')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      throw new Error('Failed to fetch users from database');
    }

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
      return;
    }

    allUsers = users;
    filteredUsers = users;
    currentPage = 1;

    displayPaginatedUsers();
    trackUserActivity();
    updateOnlineStatus();
  } catch (error) {
    console.error('Error in loadUsers:', error);
    tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
    showCustomAlert('Error', `Error: ${error.message}`, 'error');
  }
}

function createUserRow(user) {
  const row = document.createElement('tr');
  row.className = 'user-row';
  row.dataset.userId = user.id;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name';
  const role = user.role_name || 'FACULTY';
  const isCurrentUser = user.id === currentLoggedInUserId;
  const roleClass = role.toLowerCase().replace(/\s+/g, '-');
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

function openAddModal() {
  document.getElementById('userModal').style.display = 'block';
  document.getElementById('modalTitle').textContent = 'Add User';
  document.getElementById('userForm').reset();
  currentEditingUserId = null;

  const submitButton = document.querySelector('#userForm button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Add';
  }

  document.querySelectorAll('label').forEach(label => {
    label.style.display = 'block';
  });

  ['userFirstName', 'userLastName', 'userEmail', 'userRole'].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.style.display = 'block';
      field.required = true;
    }
  });

  ['userPassword', 'userRePassword'].forEach(id => {
    const field = document.getElementById(id);
    if (field && field.parentElement) {
      field.parentElement.style.display = 'block';
      field.required = true;
    }
  });

  setTimeout(initializePasswordIcons, 100);

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

  const submitButton = document.querySelector('#userForm button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Save';
  }

  document.getElementById('userFirstName').value = user.first_name || '';
  document.getElementById('userLastName').value = user.last_name || '';
  document.getElementById('userEmail').value = user.email || '';

  const roleFieldElement = document.getElementById('userRole');
  if (roleFieldElement && user.role_name) {
    roleFieldElement.value = user.role_name;
  }

  document.getElementById('userPassword').value = '';
  document.getElementById('userRePassword').value = '';

  document.querySelectorAll('label').forEach(label => {
    label.style.display = 'block';
  });

  ['userFirstName', 'userLastName', 'userEmail', 'userRole'].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.style.display = 'block';
      field.required = true;
    }
  });

  ['userPassword', 'userRePassword'].forEach(id => {
    const field = document.getElementById(id);
    if (field && field.parentElement) {
      field.parentElement.style.display = 'block';
      field.required = false;
    }
  });

  setTimeout(initializePasswordIcons, 200);

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

        await loadUsers();
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

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('userFirstName').value.trim();
  const lastName = document.getElementById('userLastName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const rePassword = document.getElementById('userRePassword').value;
  const role = document.getElementById('userRole').value;

  if (password || rePassword) {
    if (password !== rePassword) {
      showCustomAlert('Validation Error', 'Passwords do not match', 'warning');
      return;
    }

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

  if (!firstName || !lastName || !email || !role) {
    showCustomAlert('Validation Error', 'Please fill in all required fields', 'warning');
    return;
  }

  if (!currentEditingUserId && !password) {
    showCustomAlert('Validation Error', 'Password is required for new users', 'warning');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showCustomAlert('Validation Error', 'Please enter a valid email address', 'warning');
    return;
  }

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
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        role_name: role,
        role: roleValue
      };

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
      const generateSequentialUserId = async (roleName) => {
        const rolePrefix = getRolePrefix(roleName);

        const { data: existingUsers, error } = await sb
          .from('users')
          .select('id')
          .like('id', `${rolePrefix}%`)
          .order('id', { ascending: false });

        if (error) {
          console.error('Error fetching existing users for ID generation:', error);
          return `${rolePrefix}001`;
        }

        let nextNumber = 1;

        if (existingUsers && existingUsers.length > 0) {
          const numbers = existingUsers.map(user => {
            const match = user.id.match(new RegExp(`^${rolePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
          }).filter(num => !isNaN(num));

          if (numbers.length > 0) {
            const maxNumber = Math.max(...numbers);
            nextNumber = maxNumber + 1;
          }
        }

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

      const newUserId = await generateSequentialUserId(role);

      const newUserData = {
        id: newUserId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        role_name: role,
        role: roleValue,
        password: password
      };

      try {
        const { error } = await sb.from('users').insert(newUserData);

        if (error) {
          console.error('Error adding new user:', error);
          hideLoading();
          showCustomAlert('Add Error', 'Error adding new user', 'error');
          return;
        }

        closeModal();
        await loadUsers();
        hideLoading();
        showCustomAlert('Success', 'User added successfully', 'success');
      } catch (err) {
        hideLoading();
        console.error('Error inserting new user:', err);
        showCustomAlert('Error', 'Error adding new user', 'error');
      }
    }
  } catch (error) {
    hideLoading();
    console.error('Error in form submission:', error);
    showCustomAlert('Error', 'An error occurred while processing the request', 'error');
  }
});

window.togglePassword = function(inputId) {
  const input = document.getElementById(inputId);
  const passwordGroup = input.closest('.password-group');
  const toggle = passwordGroup ? passwordGroup.querySelector('.password-toggle') : input.nextElementSibling;

  if (!toggle) {
    console.error('Toggle element not found for input:', inputId);
    return;
  }

  if (input.type === 'password') {
    input.type = 'text';
    toggle.textContent = '🙈';
  } else {
    input.type = 'password';
    toggle.textContent = '👁️';
  }
};

function initializePasswordIcons() {
  try {
    const passwordInput = document.querySelector('#userPassword');
    const rePasswordInput = document.querySelector('#userRePassword');

    if (passwordInput) {
      const passwordGroup = passwordInput.closest('.password-group');
      const passwordToggle = passwordGroup ? passwordGroup.querySelector('.password-toggle') : null;

      if (passwordToggle) {
        passwordToggle.textContent = '👁️';
      }
    }

    if (rePasswordInput) {
      const rePasswordGroup = rePasswordInput.closest('.password-group');
      const rePasswordToggle = rePasswordGroup ? rePasswordGroup.querySelector('.password-toggle') : null;

      if (rePasswordToggle) {
        rePasswordToggle.textContent = '👁️';
      }
    }
  } catch (error) {
    console.error('Error initializing password icons:', error);
  }
}

setInterval(() => {
  trackUserActivity();
  updateOnlineStatus();
}, 30000);

document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin_manage.js loaded, initializing...');
  loadUsers();

  const passwordField = document.getElementById('userPassword');
  const rePasswordField = document.getElementById('userRePassword');

  if (passwordField) {
    passwordField.addEventListener('input', validatePasswordStrength);
  }

  if (rePasswordField) {
    rePasswordField.addEventListener('input', validatePasswordMatch);
  }
});

function displayPaginatedUsers() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  if (!filteredUsers || filteredUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No users match the current filters</td></tr>';
    updatePaginationInfo(0, 0, 0);
    return;
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aIsCurrentUser = a.id === currentLoggedInUserId;
    const bIsCurrentUser = b.id === currentLoggedInUserId;

    if (aIsCurrentUser && !bIsCurrentUser) return -1;
    if (!aIsCurrentUser && bIsCurrentUser) return 1;
    return 0;
  });

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, sortedUsers.length);
  const currentPageUsers = sortedUsers.slice(startIndex, endIndex);

  currentPageUsers.forEach(user => {
    const row = createUserRow(user);
    tbody.appendChild(row);
  });

  updatePaginationInfo(startIndex + 1, endIndex, sortedUsers.length);
  updatePaginationButtons(sortedUsers.length);

  setTimeout(() => {
    trackUserActivity();
    updateOnlineStatus();
  }, 100);
}

function updatePaginationInfo(start, end, total) {
  const paginationInfo = document.getElementById('paginationInfo');
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${start} to ${end} of ${total} entries`;
  }
}

function updatePaginationButtons(totalCount = filteredUsers.length) {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageNumbers = document.getElementById('pageNumbers');

  if (!totalCount) return;

  const totalPages = Math.ceil(totalCount / entriesPerPage);

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }

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

function changeEntriesPerPage() {
  const select = document.getElementById('entriesPerPage');
  if (select) {
    entriesPerPage = parseInt(select.value);
    currentPage = 1;
    displayPaginatedUsers();
  }
}

function applyFilters() {
  const idFilter = document.getElementById('filterID')?.value.toLowerCase() || '';
  const nameFilter = document.getElementById('filterName')?.value.toLowerCase() || '';
  const roleFilter = document.getElementById('filterRole')?.value || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';

  filteredUsers = allUsers.filter(user => {
    if (idFilter && !user.id.toLowerCase().includes(idFilter)) {
      return false;
    }

    if (nameFilter) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      if (!fullName.includes(nameFilter) && !email.includes(nameFilter)) {
        return false;
      }
    }

    if (roleFilter && user.role_name !== roleFilter) {
      return false;
    }

    if (statusFilter) {
      const isOnline = onlineUsers.has(user.id);
      if ((statusFilter === 'Online' && !isOnline) || (statusFilter === 'Offline' && isOnline)) {
        return false;
      }
    }

    return true;
  });

  currentPage = 1;
  displayPaginatedUsers();
}

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
  document.getElementById('filterID').value = '';
  document.getElementById('filterName').value = '';
  document.getElementById('filterRole').value = '';
  document.getElementById('filterStatus').value = '';

  filteredUsers = allUsers;
  currentPage = 1;
  displayPaginatedUsers();
}

window.onclick = function(event) {
  const modal = document.getElementById('userModal');

  if (event.target === modal) {
    closeModal();
  }
};

