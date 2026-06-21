// Admin Dashboard User Loading Functions

// Format internal role names to display names
function formatRoleDisplay(role) {
  if (!role) return '';
  const roleMap = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'faculty': 'Faculty',
    'student_organization': 'Student Organization'
  };
  return roleMap[role] || role;
}

// Helper to get Supabase client from supabaseConfig.js
function getSupabaseClient() {
  // First, check if supabaseConfig.js has initialized the client
  if (typeof window !== 'undefined' && window.supabaseClient) {
    // Validate that it has the expected Supabase client methods
    if (typeof window.supabaseClient.from === 'function') {
      console.log('✅ Found valid supabaseClient from supabaseConfig.js');
      return window.supabaseClient;
    } else {
      console.warn('⚠️ window.supabaseClient exists but is not a valid Supabase client');
    }
  }
  
  // Check if global supabaseClient variable exists and is valid
  if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof supabaseClient.from === 'function') {
    console.log('✅ Found valid global supabaseClient variable');
    return supabaseClient;
  }
  
  // Check other possible exports
  if (typeof window !== 'undefined') {
    if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
    if (window._supabase && typeof window._supabase.from === 'function') return window._supabase;
    if (window.sb && typeof window.sb.from === 'function') return window.sb;
    
    // Try to create client from window.supabase if it exists
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      console.log('🔧 Creating Supabase client from window.supabase');
      const newClient = window.supabase.createClient(
        'https://tryytusvitsztadzqihq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA'
      );
      window.supabaseClient = newClient;
      return newClient;
    }
  }
  
  // Log available properties for debugging
  const supabaseProps = typeof window !== 'undefined' ? 
    Object.keys(window).filter(key => key.toLowerCase().includes('supabase')) : [];
  
  console.error('❌ Valid Supabase client not found.');
  console.log('🔍 Available Supabase-related properties:', supabaseProps);
  console.log('🔍 window.supabase:', typeof window.supabase, window.supabase);
  console.log('🔍 window.supabaseClient:', typeof window.supabaseClient, window.supabaseClient);
  
  return null;
}

// Fetch user data using Supabase client from supabaseConfig.js
async function fetchUserData(userId) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.error('Supabase client not available');
      return { data: null, error: 'Supabase client not found' };
    }
    
    console.log('Fetching user data using Supabase client for userId:', userId);
    
    // Query the users table
    const { data, error } = await supabaseClient
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();
    
    console.log('Supabase query result:', { data, error });
    
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
    // Get user ID from localStorage (users table based login)
    let userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 localStorage.getItem('userId') || 
                 localStorage.getItem('currentUserId');
    
    console.log('Admin Dashboard - Retrieved userId from localStorage:', userId);
    console.log('localStorage contents:', {...localStorage});

    if (!userId) {
      console.log('No user ID found in localStorage. User not logged in.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Not logged in';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'No role';
      return;
    }

    // Try to fetch profile from users table using Supabase client
    console.log('Attempting to fetch user data from Supabase using client...');
    const { data, error } = await fetchUserData(userId);

    console.log('Admin Dashboard - User query result:', { data, error });

    if (error || !data) {
      console.warn('Error fetching user or user not found. Using fallback display.');
      
      // Fallback: Use stored user info from localStorage or show generic admin info
      const storedUserName = localStorage.getItem('user_name') || localStorage.getItem('userName');
      const storedUserRole = localStorage.getItem('user_role') || localStorage.getItem('userRole');
      
      if (storedUserName && storedUserRole) {
        console.log('Using stored user data from localStorage');
        if (document.getElementById('UserName')) {
          document.getElementById('UserName').textContent = storedUserName;
        }
        if (document.getElementById('UserRole')) {
          document.getElementById('UserRole').textContent = formatRoleDisplay(storedUserRole);
        }
      } else {
        // Generic fallback based on user ID
        console.log('Using generic fallback user display');
        const displayName = userId === 'A001' ? 'Admin User' : `User ${userId}`;
        const displayRole = userId === 'A001' ? 'Administrator' : 'User';
        
        if (document.getElementById('UserName')) {
          document.getElementById('UserName').textContent = displayName;
        }
        if (document.getElementById('UserRole')) {
          document.getElementById('UserRole').textContent = formatRoleDisplay(displayRole);
        }
        
        // Store for future use
        localStorage.setItem('user_name', displayName);
        localStorage.setItem('user_role', displayRole);
      }
      return;
    }

    // Successfully fetched data from database
    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const userRole = data.role_name || '';
    
    console.log('Admin Dashboard - User data fetched successfully:', { userName, userRole });
    
    // Update the DOM elements
    if (document.getElementById('UserName')) {
      document.getElementById('UserName').textContent = userName || 'Unknown User';
    }
    if (document.getElementById('UserRole')) {
      document.getElementById('UserRole').textContent = formatRoleDisplay(userRole) || 'No Role';
    }
    
    // Store in localStorage for fallback use
    localStorage.setItem('user_name', userName);
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('id', data.id);
    
  } catch (err) {
    console.error('Admin Dashboard - loadUserDetails error:', err);
    console.log('Using fallback due to error');
    
    // Error fallback - similar to network issue fallback
    const storedUserName = localStorage.getItem('user_name') || localStorage.getItem('userName') || 'Admin User';
    const storedUserRole = localStorage.getItem('user_role') || localStorage.getItem('userRole') || 'Administrator';
    
    if (document.getElementById('UserName')) {
      document.getElementById('UserName').textContent = storedUserName;
    }
    if (document.getElementById('UserRole')) {
      document.getElementById('UserRole').textContent = formatRoleDisplay(storedUserRole);
    }
  }
}

// Wait for Supabase client to be ready, then load user details
function waitForSupabaseAndLoadUser() {
  const client = getSupabaseClient();
  if (client) {
    console.log('✅ Supabase client ready, loading user details...');
    loadUserDetails();
  } else {
    console.log('⏳ Waiting for Supabase client to initialize...');
    setTimeout(waitForSupabaseAndLoadUser, 200); // Check again in 200ms
  }
}

// Initialize user loading when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin Dashboard - DOM loaded, waiting for Supabase client...');
  setTimeout(waitForSupabaseAndLoadUser, 500); // Give supabaseConfig.js time to initialize
});

// Also call it immediately in case DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(waitForSupabaseAndLoadUser, 500);
  });
} else {
  setTimeout(waitForSupabaseAndLoadUser, 500);
}

// Listen for storage changes to detect login/logout from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'id' || event.key === 'user_id' || event.key === 'userId' || event.key === 'currentUserId') {
    console.log('Admin Dashboard - User login state changed in another tab');
    loadUserDetails();
  }
});
