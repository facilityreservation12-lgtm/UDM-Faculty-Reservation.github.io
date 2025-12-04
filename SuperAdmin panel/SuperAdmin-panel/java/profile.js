// ============================================
// SUPABASE CLIENT GETTER
// ============================================

function getSupabaseClient() {
  if (window.supabaseClient) {
    return window.supabaseClient;
  }
  console.warn('⏳ Supabase client not yet initialized');
  return null;
}

function getSupabase() {
  return getSupabaseClient();
}

// ============================================
// USER DATA FETCHING
// ============================================

async function fetchUserData() {
  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
  
  if (!userId) {
    console.error('❌ No user ID found');
    return null;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }

    console.log('📊 Fetching user from Supabase...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }

    console.log('✅ User fetched:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error in fetchUserData:', error);
    return null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function sanitizeStoredValue(value) {
  if (!value) return '';
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return '';
  }
  return trimmed;
}

function applyUserDisplay(name, role) {
  if (name && document.getElementById('UserName')) {
    document.getElementById('UserName').textContent = name;
  }
  if (role && document.getElementById('UserRole')) {
    document.getElementById('UserRole').textContent = role;
  }
}

function getDefaultDisplay(userId) {
  const onSuperAdmin = typeof window !== 'undefined' && window.location.pathname.includes('SuperAdmin');
  const defaultName = userId ? `User ${userId}` : onSuperAdmin ? 'Super Admin User' : 'Admin User';
  const defaultRole = onSuperAdmin ? 'Super Admin' : 'Administrator';
  return { defaultName, defaultRole };
}

// ============================================
// MAIN USER LOAD FUNCTION
// ============================================

async function loadUserDetails() {
  try {
    const sanitizeId = (value) => {
      const v = sanitizeStoredValue(value);
      return v || null;
    };
    
    let userId = sanitizeId(localStorage.getItem('id')) || 
                 sanitizeId(localStorage.getItem('user_id')) || 
                 sanitizeId(localStorage.getItem('userId')) || 
                 sanitizeId(localStorage.getItem('currentUserId'));
    
    console.log('👤 Admin Dashboard - Retrieved userId from localStorage:', userId);
    console.log('📦 localStorage contents:', {...localStorage});

    const storedUserName = sanitizeStoredValue(localStorage.getItem('user_name') || localStorage.getItem('userName'));
    const storedUserRole = sanitizeStoredValue(localStorage.getItem('user_role') || localStorage.getItem('userRole'));
    const defaults = getDefaultDisplay(userId);
    
    // Show stored data while fetching
    if (storedUserName || storedUserRole) {
      applyUserDisplay(storedUserName || 'Loading...', storedUserRole || '');
    }

    if (!userId) {
      console.log('⚠️ No user ID found in localStorage. User not logged in.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Not logged in';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'No role';
      return;
    }

    // Try to fetch profile from users table using Supabase
    console.log('🔍 Attempting to fetch user data from Supabase...');
    const userData = await fetchUserData();

    console.log('📋 Admin Dashboard - User query result:', userData);

    if (!userData) {
      console.warn('⚠️ Error fetching user or user not found. Using fallback display.');
      
      // Fallback: Use stored user info from localStorage
      if (storedUserName || storedUserRole) {
        console.log('💾 Using stored user data from localStorage');
        applyUserDisplay(storedUserName, storedUserRole);
      } else {
        console.log('🔧 Using generic fallback user display');
        applyUserDisplay(defaults.defaultName, defaults.defaultRole);
        localStorage.setItem('user_name', defaults.defaultName);
        localStorage.setItem('user_role', defaults.defaultRole);
      }
      return;
    }

    // Successfully fetched data from database
    const fetchedName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    const fetchedRole = userData.role_name || '';
    const resolvedName = sanitizeStoredValue(fetchedName) || storedUserName || defaults.defaultName;
    const resolvedRole = sanitizeStoredValue(fetchedRole) || storedUserRole || defaults.defaultRole;
    
    console.log('✅ Admin Dashboard - User data fetched successfully:', { fetchedName, fetchedRole, resolvedName, resolvedRole });
    
    applyUserDisplay(resolvedName, resolvedRole);
    
    // Update localStorage with fresh data
    if (resolvedName) localStorage.setItem('user_name', resolvedName);
    if (resolvedRole) localStorage.setItem('user_role', resolvedRole);
    if (userData.id) localStorage.setItem('id', userData.id);
    
  } catch (err) {
    console.error('❌ Admin Dashboard - loadUserDetails error:', err);
    console.log('🔄 Using fallback due to error');
    
    // Error fallback
    const fallbackName = sanitizeStoredValue(localStorage.getItem('user_name') || localStorage.getItem('userName'));
    const fallbackRole = sanitizeStoredValue(localStorage.getItem('user_role') || localStorage.getItem('userRole'));
    const defaults = getDefaultDisplay(localStorage.getItem('id'));
    
    if (fallbackName || fallbackRole) {
      applyUserDisplay(fallbackName || 'Admin User', fallbackRole || 'Administrator');
    } else {
      applyUserDisplay(defaults.defaultName, defaults.defaultRole);
    }
  }
}

// ============================================
// INITIALIZATION
// ============================================

function waitForSupabaseAndLoadUser() {
  const client = getSupabaseClient();
  if (client) {
    console.log('✅ Supabase client ready, loading user details...');
    loadUserDetails();
  } else {
    console.log('⏳ Waiting for Supabase client to initialize...');
    setTimeout(waitForSupabaseAndLoadUser, 200);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 Admin Dashboard - DOM loaded, waiting for Supabase client...');
  setTimeout(waitForSupabaseAndLoadUser, 500);
});

// Also call if DOM is already loaded
if (document.readyState !== 'loading') {
  console.log('📄 Admin Dashboard - DOM already loaded, initializing...');
  setTimeout(waitForSupabaseAndLoadUser, 500);
}

// Listen for storage changes (login/logout from other tabs)
window.addEventListener('storage', (event) => {
  if (event.key === 'id' || event.key === 'user_id' || event.key === 'userId' || event.key === 'currentUserId') {
    console.log('🔄 Admin Dashboard - User login state changed in another tab');
    loadUserDetails();
  }
});

// ============================================
// GLOBAL EXPORTS
// ============================================

window.loadUserDetails = loadUserDetails;
window.getSupabase = getSupabase;
window.fetchUserData = fetchUserData;