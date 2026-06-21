// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

// ========== RBAC ROLE VERIFICATION ==========
function checkSuperAdminAccess() {
  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
  const userRole = localStorage.getItem('user_role');
  
  console.log('[RBAC] SuperAdmin Access Check - userId:', userId, 'userRole:', userRole);
  
  if (!userId) {
    console.log('[RBAC] No user ID found, redirecting to login...');
    window.location.href = '/User panel/login.html';
    return false;
  }
  
  if (userRole !== 'super_admin') {
    console.log('[RBAC] User role is not super_admin, redirecting to user dashboard...');
    alert('Access Denied: You do not have permission to access the SuperAdmin panel.');
    window.location.href = '/User panel/Userdashboard.html';
    return false;
  }
  
  console.log('[RBAC] SuperAdmin access granted');
  return true;
}

function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabaseClient) {
    console.log('✅ Found supabaseClient from supabaseConfig.js');
    return window.supabaseClient;
  }
  
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    console.log('✅ Found global supabaseClient variable');
    return supabaseClient;
  }
  
  // If no window.supabaseClient, create one from Supabase CDN
  if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
    console.log('✅ Creating supabaseClient from Supabase CDN');
    return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  }
  
  console.error('❌ Supabase client not found.');
  return null;
}

function getSupabase() {
  return getSupabaseClient();
}

// ============================================
// ACTIVITY LOGS - CORE FUNCTIONALITY
// ============================================

let allLogs = [];
let filteredLogs = [];

async function fetchActivityLogs() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return [];
    }

    console.log('🔍 Fetching audit logs from database...');

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        request_id,
        action,
        ip_address,
        created_at,
        users(first_name, last_name, role_name)
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('❌ Error fetching audit logs:', error);
      return [];
    }

    if (!logs || logs.length === 0) {
      console.warn('No audit logs found in database');
      return [];
    }

    console.log(`✅ Found ${logs.length} audit logs from database`);
    
    // Transform data for display
    const transformedLogs = logs.map(log => ({
      id: log.id,
      created_at: log.created_at,
      action: log.action,
      ip_address: log.ip_address,
      request_id: log.request_id || null,
      users: {
        first_name: log.users?.first_name || 'Unknown',
        last_name: log.users?.last_name || 'User',
        role_name: log.users?.role_name || 'N/A'
      },
      reservations: {
        title_of_the_event: 'N/A',
        facility: 'N/A'
      }
    }));
    
    return transformedLogs;
    
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err);
    return [];
  }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function populateUserFilter(logs) {
  const userFilter = document.getElementById('userFilter');
  if (!userFilter) return;
  
  const users = [...new Set(logs.map(log => 
    `${log.users.first_name} ${log.users.last_name}`
  ))].sort();
  
  userFilter.innerHTML = '<option value="All">All</option>';
  
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user;
    option.textContent = user;
    userFilter.appendChild(option);
  });
}

function populateActionFilter(logs) {
  const actionFilter = document.getElementById('actionFilter');
  if (!actionFilter) return;
  
  const actions = [...new Set(logs.map(log => log.action))].sort();
  
  actionFilter.innerHTML = '<option value="All">All</option>';
  
  actions.forEach(action => {
    const option = document.createElement('option');
    option.value = action;
    option.textContent = action;
    actionFilter.appendChild(option);
  });
}

function applyFilters() {
  const actionFilter = document.getElementById('actionFilter')?.value || 'All';
  const userFilter = document.getElementById('userFilter')?.value || 'All';
  const fromDate = document.getElementById('fromDate')?.value;
  const toDate = document.getElementById('toDate')?.value;
  
  filteredLogs = allLogs.filter(log => {
    if (actionFilter !== 'All' && log.action !== actionFilter) {
      return false;
    }
    
    const userName = `${log.users.first_name} ${log.users.last_name}`;
    if (userFilter !== 'All' && userName !== userFilter) {
      return false;
    }
    
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

function toggleFilter() {
  const filterSection = document.getElementById('filterSection');
  const filterToggle = document.querySelector('.filter-toggle');
  
  if (filterSection.style.display === 'none' || !filterSection.style.display) {
    filterSection.style.display = 'flex';
    filterToggle.textContent = 'Audit Filters ▼';
  } else {
    filterSection.style.display = 'none';
    filterToggle.textContent = 'Audit Filters ▲';
  }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayLogs(logs) {
  const logEntries = document.getElementById('logEntries');
  if (!logEntries) return;
  
  if (!logs || logs.length === 0) {
    logEntries.innerHTML = '<div class="log-entry">No audit logs found.</div>';
    return;
  }
  
  logEntries.innerHTML = '';
  
  logs.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const userName = `${log.users.first_name} ${log.users.last_name}`;
    const userRole = log.users.role_name || 'No Role';
    
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

async function loadActivityLogs() {
  console.log('📋 Loading audit logs...');
  
  allLogs = await fetchActivityLogs();
  filteredLogs = [...allLogs];
  
  populateUserFilter(allLogs);
  populateActionFilter(allLogs);
  displayLogs(filteredLogs);
  
  console.log(`📊 Loaded ${allLogs.length} audit logs`);
}

// ============================================
// LOG ACTIVITY FUNCTION
// ============================================

async function logActivity(action, requestId = null) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  const userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 'unknown_user';
  
  const logEntry = {
    user_id: userId,
    request_id: requestId || null,
    action: action,
    ip_address: '192.168.1.100' // In production, get real IP from backend
  };

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([logEntry])
      .select();

    if (error) {
      console.error('❌ Error logging activity:', error);
    } else {
      console.log('✅ Activity logged:', data);
      await loadActivityLogs();
    }
  } catch (error) {
    console.error('❌ Error in logActivity:', error);
  }
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  // RBAC: Check access first
  if (!checkSuperAdminAccess()) {
    return; // Redirect in progress
  }
  console.log('SuperAdmin Audit Log - DOM loaded');
  
  // Load audit logs
  await loadActivityLogs();
  
  // Add event listeners for filters
  document.getElementById('actionFilter')?.addEventListener('change', applyFilters);
  document.getElementById('userFilter')?.addEventListener('change', applyFilters);
  document.getElementById('fromDate')?.addEventListener('change', applyFilters);
  document.getElementById('toDate')?.addEventListener('change', applyFilters);
  
   // Back button
  document.querySelector('.back-btn')?.addEventListener('click', () => {
    window.history.back();
  });
});


// ============================================
// GLOBAL EXPORTS
// ============================================

window.logActivity = logActivity;
window.toggleFilter = toggleFilter;