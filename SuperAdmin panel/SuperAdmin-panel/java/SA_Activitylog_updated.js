// SuperAdmin Activity Log - Real Database Integration for activity_logs table

// Helper to get Supabase client from supabaseConfig.js
function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabaseClient) {
    console.log('✅ Found supabaseClient from supabaseConfig.js');
    return window.supabaseClient;
  }
  
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    console.log('✅ Found global supabaseClient variable');
    return supabaseClient;
  }
  
  console.error('❌ Supabase client not found.');
  return null;
}

// Get Supabase client dynamically when needed
function getSupabase() {
  return getSupabaseClient();
}

// User authentication functions
async function fetchUserData(userId) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return { data: null, error: 'Supabase client not found' };
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Supabase query error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
    
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return { data: null, error };
  }
}

async function loadUserDetails() {
  try {
    let userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 localStorage.getItem('userId') || 
                 localStorage.getItem('currentUserId');
    
    if (!userId) {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Not logged in';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'No role';
      return;
    }

    const { data, error } = await fetchUserData(userId);

    if (error || !data) {
      const storedUserName = localStorage.getItem('user_name') || localStorage.getItem('userName') || 'SuperAdmin User';
      const storedUserRole = localStorage.getItem('user_role') || localStorage.getItem('userRole') || 'SuperAdmin';
      
      if (document.getElementById('UserName')) {
        document.getElementById('UserName').textContent = storedUserName;
      }
      if (document.getElementById('UserRole')) {
        document.getElementById('UserRole').textContent = storedUserRole;
      }
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const userRole = data.role_name || '';
    
    if (document.getElementById('UserName')) {
      document.getElementById('UserName').textContent = userName || 'Unknown User';
    }
    if (document.getElementById('UserRole')) {
      document.getElementById('UserRole').textContent = userRole || 'No Role';
    }
    
    localStorage.setItem('user_name', userName);
    localStorage.setItem('user_role', userRole);
    
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

// Activity Log Functions
let allLogs = [];
let filteredLogs = [];

// Function to fetch activity logs from your database table
async function fetchActivityLogs() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return [];
    }

    console.log('🔍 Fetching activity logs from database...');
    console.log('📍 Supabase client available:', !!supabase);

    // First, try to fetch activity logs without JOIN to see if data exists
    const { data: basicLogs, error: basicError } = await supabase
      .from('activity_logs')
      .select('log_id, user_id, request_id, action, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Basic activity logs query result:', { data: basicLogs, error: basicError });

    if (basicError) {
      console.warn('Error fetching basic activity logs:', basicError);
      return [];
    }

    if (!basicLogs || basicLogs.length === 0) {
      console.warn('No activity logs found in database');
      return [];
    }

    console.log(`Found ${basicLogs.length} activity logs in database`);

    // Now try to fetch with user data and optional reservation data
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select(`
        log_id,
        user_id,
        request_id,
        action,
        ip_address,
        created_at,
        users(first_name, last_name, role_name),
        reservations(title_of_the_event, facility)
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    console.log('Full activity logs query result:', { data: logs, error });

    if (error) {
      console.warn('Error fetching activity logs with user data, trying without users:', error);
      
      // Fallback: fetch logs without user data and add placeholder names
      const logsWithoutUsers = basicLogs.map(log => ({
        id: log.log_id,
        created_at: log.created_at,
        action: log.action,
        ip_address: log.ip_address,
        users: {
          first_name: 'User',
          last_name: log.user_id,
          role_name: 'Unknown'
        }
      }));
      
      return logsWithoutUsers;
    }

    console.log(`✅ Found ${logs?.length || 0} real activity logs from database`);
    
    // Transform the data to match our display format
    const transformedLogs = logs.map(log => ({
      id: log.log_id,
      created_at: log.created_at,
      action: log.action,
      ip_address: log.ip_address,
      users: {
        first_name: log.users?.first_name || 'Unknown',
        last_name: log.users?.last_name || 'User',
        role_name: log.users?.role_name || 'N/A'
      }
    }));
    
    return transformedLogs;
    
  } catch (err) {
    console.error('❌ Error fetching activity logs:', err);
    return [];
  }
}

// Sample function removed - only real data from Supabase will be shown

// Function to populate user filter dropdown
function populateUserFilter(logs) {
  const userFilter = document.getElementById('userFilter');
  if (!userFilter) return;
  
  // Get unique users
  const users = [...new Set(logs.map(log => 
    `${log.users.first_name} ${log.users.last_name}`
  ))].sort();
  
  // Clear existing options except "All"
  userFilter.innerHTML = '<option value="All">All</option>';
  
  // Add user options
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user;
    option.textContent = user;
    userFilter.appendChild(option);
  });
}

// Function to populate action filter dropdown
function populateActionFilter(logs) {
  const actionFilter = document.getElementById('actionFilter');
  if (!actionFilter) return;
  
  // Get unique actions
  const actions = [...new Set(logs.map(log => log.action))].sort();
  
  // Clear existing options except "All"
  actionFilter.innerHTML = '<option value="All">All</option>';
  
  // Add action options
  actions.forEach(action => {
    const option = document.createElement('option');
    option.value = action;
    option.textContent = action;
    actionFilter.appendChild(option);
  });
}

// Function to format date for display
function formatLogDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Function to display logs in the table
function displayLogs(logs) {
  const logEntries = document.getElementById('logEntries');
  if (!logEntries) return;
  
  if (!logs || logs.length === 0) {
    logEntries.innerHTML = '<div class="log-entry">No activity logs found.</div>';
    return;
  }
  
  logEntries.innerHTML = '';
  
  logs.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const userName = `${log.users.first_name} ${log.users.last_name}`;
    const userRole = log.users.role_name || 'No Role';
    
    // Format date and time separately
    const date = new Date(log.created_at);
    const dateOnly = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeOnly = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    logEntry.innerHTML = `
      <div>
        <div style="font-weight: bold;">${dateOnly}</div>
        <div style="font-weight: normal; font-size: 0.9em; color: #666;">${timeOnly}</div>
      </div>
      <div>
        <div style="font-weight: normal;">${userName}</div>
        <div style="font-style: italic; font-size: 0.85em; color: #888;">${userRole}</div>
      </div>
      <div><span class="action-${log.action.toLowerCase().replace(/\s+/g, '-')}">${log.action}</span></div>
      <div>${log.ip_address || 'N/A'}</div>
    `;
    
    logEntries.appendChild(logEntry);
  });
}

// Function to apply filters
function applyFilters() {
  const actionFilter = document.getElementById('actionFilter')?.value || 'All';
  const userFilter = document.getElementById('userFilter')?.value || 'All';
  const fromDate = document.getElementById('fromDate')?.value;
  const toDate = document.getElementById('toDate')?.value;
  
  filteredLogs = allLogs.filter(log => {
    // Action filter
    if (actionFilter !== 'All' && log.action !== actionFilter) {
      return false;
    }
    
    // User filter
    const userName = `${log.users.first_name} ${log.users.last_name}`;
    if (userFilter !== 'All' && userName !== userFilter) {
      return false;
    }
    
    // Date filters
    const logDate = new Date(log.created_at);
    if (fromDate && logDate < new Date(fromDate)) {
      return false;
    }
    if (toDate && logDate > new Date(toDate + 'T23:59:59')) {
      return false;
    }
    
    return true;
  });
  
  displayLogs(filteredLogs);
  console.log(`📊 Applied filters: ${filteredLogs.length} of ${allLogs.length} logs shown`);
}

// Function to toggle filter section
function toggleFilter() {
  const filterSection = document.getElementById('filterSection');
  const filterToggle = document.querySelector('.filter-toggle');
  
  if (filterSection.style.display === 'none' || !filterSection.style.display) {
    filterSection.style.display = 'flex';
    filterToggle.textContent = 'Activities Filters ▼';
  } else {
    filterSection.style.display = 'none';
    filterToggle.textContent = 'Activities Filters ▲';
  }
}

// Function to load and display activity logs
async function loadActivityLogs() {
  console.log('📋 Loading activity logs...');
  
  allLogs = await fetchActivityLogs();
  filteredLogs = [...allLogs];
  
  // Populate filter dropdowns
  populateUserFilter(allLogs);
  populateActionFilter(allLogs);
  
  // Display all logs initially
  displayLogs(filteredLogs);
  
  console.log(`📊 Loaded ${allLogs.length} activity logs`);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('SuperAdmin Activity Log - DOM loaded');
  
  // Load user details
  setTimeout(async () => {
    const client = getSupabase();
    if (client) {
      await loadUserDetails();
    } else {
      setTimeout(loadUserDetails, 500);
    }
  }, 300);
  
  // Load activity logs
  await loadActivityLogs();
  
  // Add event listeners for filters
  document.getElementById('actionFilter')?.addEventListener('change', applyFilters);
  document.getElementById('userFilter')?.addEventListener('change', applyFilters);
  document.getElementById('fromDate')?.addEventListener('change', applyFilters);
  document.getElementById('toDate')?.addEventListener('change', applyFilters);
  
  // Back button functionality
  document.querySelector('.back-btn')?.addEventListener('click', () => {
    window.history.back();
  });
});

// Function to insert test activity log (for debugging)
async function insertTestLog() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  // Get current user ID from localStorage
  const userId = localStorage.getItem('id') || localStorage.getItem('user_id') || localStorage.getItem('userId') || 'S001';
  
  const testLog = {
    user_id: userId,
    request_id: null, // Can be null per your schema
    action: 'Test Activity',
    ip_address: '192.168.1.100'
  };

  console.log('Inserting test log:', testLog);

  const { data, error } = await supabase
    .from('activity_logs')
    .insert([testLog])
    .select();

  if (error) {
    console.error('Error inserting test log:', error);
  } else {
    console.log('✅ Test log inserted successfully:', data);
    // Reload logs to show the new entry
    await loadActivityLogs();
  }
}

// Function to add multiple test logs at once
async function addTestLogs() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  const userId = localStorage.getItem('id') || localStorage.getItem('user_id') || 'A001';
  
  const testLogs = [
    { user_id: userId, action: 'Log in', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'View Dashboard', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'Changed User Role', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'Updated Profile Name', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'Created User Account', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'Approved Request', ip_address: '192.168.1.100' },
    { user_id: userId, action: 'View Activity Logs', ip_address: '192.168.1.100' }
  ];

  console.log('🧪 Adding test logs...', testLogs);

  const { data, error } = await supabase
    .from('activity_logs')
    .insert(testLogs)
    .select();

  if (error) {
    console.error('❌ Error inserting test logs:', error);
  } else {
    console.log('✅ Test logs inserted successfully:', data);
    // Reload logs to show the new entries
    await loadActivityLogs();
  }
}

// Function to manually log user role change activity
async function logUserRoleChange(targetUserId, oldRole, newRole) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  const currentUserId = localStorage.getItem('id') || localStorage.getItem('user_id') || localStorage.getItem('userId') || 'S001';
  const action = `Changed User Role: ${oldRole} → ${newRole}`;
  
  console.log('📝 Logging role change:', { currentUserId, action });

  try {
    // Method 1: Try using the manual_log_activity SQL function
    const { data: funcData, error: funcError } = await supabase.rpc('manual_log_activity', {
      p_user_id: currentUserId,
      p_action: action,
      p_ip_address: '192.168.1.100'
    });

    if (!funcError && funcData) {
      console.log('✅ Role change logged via SQL function');
      await loadActivityLogs();
      return;
    }

    console.warn('SQL function failed, trying direct insert:', funcError);

    // Method 2: Fallback to direct insert
    const logEntry = {
      user_id: currentUserId,
      action: action,
      ip_address: '192.168.1.100'
    };

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([logEntry])
      .select();

    if (error) {
      console.error('❌ Error logging role change:', error);
    } else {
      console.log('✅ Role change logged via direct insert:', data);
      await loadActivityLogs();
    }
  } catch (error) {
    console.error('❌ Error in logUserRoleChange:', error);
  }
}

// Function to test database triggers by updating a user role
async function testRoleUpdateTrigger() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  const currentUserId = localStorage.getItem('id') || localStorage.getItem('user_id') || 'A001';
  
  try {
    console.log('🔧 Testing role update trigger...');
    
    // First, get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('role_name')
      .eq('id', currentUserId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching current user:', fetchError);
      return;
    }
    
    console.log('Current user role:', currentUser.role_name);
    
    // Update the user's role (just toggle between current and same to trigger logging)
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        role_name: currentUser.role_name // Same role to avoid actual change
      })
      .eq('id', currentUserId)
      .select();
      
    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
    } else {
      console.log('✅ User role updated, trigger should have fired');
      
      // Wait a moment then reload logs
      setTimeout(async () => {
        await loadActivityLogs();
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Error in testRoleUpdateTrigger:', error);
  }
}

// Function to manually update user role with explicit logging
async function updateUserRoleWithLogging(targetUserId, newRole, oldRole = null) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return { success: false, error: 'Supabase client not available' };
  }

  const currentUserId = localStorage.getItem('id') || localStorage.getItem('user_id');
  
  try {
    console.log(`🔄 Updating user ${targetUserId} role to ${newRole}`);
    
    // If oldRole not provided, fetch it
    if (!oldRole) {
      const { data: userData } = await supabase
        .from('users')
        .select('role_name')
        .eq('id', targetUserId)
        .single();
      oldRole = userData?.role_name || 'Unknown';
    }
    
    // Update user role
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ role_name: newRole })
      .eq('id', targetUserId)
      .select();
      
    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Manually log the activity (in case triggers don't work)
    const logEntry = {
      user_id: currentUserId,
      action: `Changed User Role: ${oldRole} → ${newRole}`,
      ip_address: '192.168.1.100'
    };
    
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert([logEntry]);
      
    if (logError) {
      console.warn('⚠️ Error logging activity manually:', logError);
    } else {
      console.log('✅ Activity logged manually');
    }
    
    // Reload activity logs
    await loadActivityLogs();
    
    return { success: true, data: updateData };
    
  } catch (error) {
    console.error('❌ Error in updateUserRoleWithLogging:', error);
    return { success: false, error: error.message };
  }
}

// Comprehensive debugging function
async function debugActivityLogging() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  console.log('🔍 DEBUGGING ACTIVITY LOGGING...');
  
  // Test 1: Check if we can connect to activity_logs table
  console.log('1️⃣ Testing basic connection to activity_logs...');
  try {
    const { data: testQuery, error: testError } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to activity_logs:', testError);
    } else {
      console.log('✅ Connected to activity_logs table');
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
  }

  // Test 2: Try direct insert
  console.log('2️⃣ Testing direct insert...');
  const currentUserId = localStorage.getItem('id') || 'test_user';
  try {
    const { data: insertData, error: insertError } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: currentUserId,
        action: 'DEBUG: Direct Insert Test',
        ip_address: '192.168.1.100'
      }])
      .select();

    if (insertError) {
      console.error('❌ Direct insert failed:', insertError);
    } else {
      console.log('✅ Direct insert successful:', insertData);
    }
  } catch (error) {
    console.error('❌ Direct insert error:', error);
  }

  // Test 3: Try manual_log_activity function
  console.log('3️⃣ Testing manual_log_activity function...');
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('manual_log_activity', {
      p_user_id: currentUserId,
      p_action: 'DEBUG: RPC Function Test',
      p_ip_address: '192.168.1.100'
    });

    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError);
    } else {
      console.log('✅ RPC function successful:', rpcData);
    }
  } catch (error) {
    console.error('❌ RPC function error:', error);
  }

  // Test 4: Check if data appears in logs
  console.log('4️⃣ Checking recent logs...');
  setTimeout(async () => {
    const { data: recentLogs, error: logError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logError) {
      console.error('❌ Error fetching recent logs:', logError);
    } else {
      console.log('📊 Recent logs:', recentLogs);
      
      // Check if our test logs are there
      const testLogs = recentLogs.filter(log => log.action.includes('DEBUG'));
      console.log(`✅ Found ${testLogs.length} test logs`);
      
      // Reload the activity log display
      await loadActivityLogs();
    }
  }, 1000);
}

// Simple function to force log a role change (bypass all issues)
async function forceLogRoleChange(userId, oldRole, newRole) {
  const supabase = getSupabase();
  console.log(`🔄 FORCE LOGGING: User ${userId} role change ${oldRole} → ${newRole}`);
  
  const currentUserId = localStorage.getItem('id') || 'admin';
  const action = `Changed User Role: ${oldRole} → ${newRole} (User: ${userId})`;
  
  // Try multiple methods
  const methods = [
    // Method 1: Simple log function
    async () => {
      const { data, error } = await supabase.rpc('simple_log', {
        user_id_param: currentUserId,
        action_param: action
      });
      return { method: 'Simple Log', data, error };
    },
    
    // Method 2: Manual log function
    async () => {
      const { data, error } = await supabase.rpc('manual_log_activity', {
        p_user_id: currentUserId,
        p_action: action,
        p_ip_address: '192.168.1.100'
      });
      return { method: 'Manual Log', data, error };
    },
    
    // Method 3: Direct insert
    async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: currentUserId,
          action: action,
          ip_address: '192.168.1.100'
        }])
        .select();
      return { method: 'Direct Insert', data, error };
    }
  ];
  
  for (const method of methods) {
    try {
      const result = await method();
      if (!result.error) {
        console.log(`✅ SUCCESS with ${result.method}:`, result.data);
        await loadActivityLogs();
        return true;
      } else {
        console.warn(`❌ ${result.method} failed:`, result.error);
      }
    } catch (error) {
      console.error(`❌ ${method.name} error:`, error);
    }
  }
  
  console.error('❌ All methods failed to log activity');
  return false;
}

// Make functions globally available
window.toggleFilter = toggleFilter;
window.insertTestLog = insertTestLog; // For debugging
window.addTestLogs = addTestLogs; // Add multiple test logs
window.logUserRoleChange = logUserRoleChange; // Manual role change logging
window.testRoleUpdateTrigger = testRoleUpdateTrigger; // Test database triggers
window.updateUserRoleWithLogging = updateUserRoleWithLogging; // Update role with logging
window.debugActivityLogging = debugActivityLogging; // Comprehensive debugging
window.forceLogRoleChange = forceLogRoleChange; // Force log role changes