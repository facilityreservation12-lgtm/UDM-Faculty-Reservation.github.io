// Admin Dashboard User Loading Functions

const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:3000';

// Helper to get Supabase client from supabaseConfig.js
function getSupabaseClient() {
  // First, check if supabaseConfig.js has initialized the client
  if (typeof window !== 'undefined' && window.supabaseClient) {
    console.log('✅ Found supabaseClient from supabaseConfig.js');
    return window.supabaseClient;
  }
  
  // Check if global supabaseClient variable exists
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    console.log('✅ Found global supabaseClient variable');
    return supabaseClient;
  }
  
  // Check other possible exports
  if (typeof window !== 'undefined') {
    if (window.supabase) return window.supabase;
    if (window._supabase) return window._supabase;
    if (window.sb) return window.sb;
  }
  
  // Log available properties for debugging
  const supabaseProps = typeof window !== 'undefined' ? 
    Object.keys(window).filter(key => key.toLowerCase().includes('supabase')) : [];
  
  console.error('❌ Supabase client not found.');
  console.log('🔍 Available Supabase-related properties:', supabaseProps);
  console.log('🔍 Global supabaseClient exists:', typeof supabaseClient !== 'undefined');
  console.log('🔍 Window.supabaseClient exists:', typeof window !== 'undefined' && !!window.supabaseClient);
  
  return null;
}

async function fetchDecryptedUser(userId) {
  if (!API_BASE_URL) {
    return { data: null, error: 'API base URL not configured' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users?id=${encodeURIComponent(userId)}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message = errorPayload?.error?.message || errorPayload?.error || response.statusText;
      return { data: null, error: message || 'Failed to fetch decrypted user' };
    }

    const decryptedUser = await response.json();
    if (!decryptedUser) {
      return { data: null, error: 'User not found' };
    }

    return { data: decryptedUser, error: null };
  } catch (error) {
    console.error('Error fetching decrypted user:', error);
    return { data: null, error };
  }
}

// Fetch user data using Supabase client from supabaseConfig.js
async function fetchUserData(userId) {
  try {
    // First attempt: fetch decrypted data via Express API
    const decryptedResult = await fetchDecryptedUser(userId);
    if (decryptedResult.data && !decryptedResult.error) {
      return decryptedResult;
    }
    
    console.warn('Decrypted fetch failed or returned empty, falling back to direct Supabase query.');

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
          document.getElementById('UserRole').textContent = storedUserRole;
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
          document.getElementById('UserRole').textContent = displayRole;
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
      document.getElementById('UserRole').textContent = userRole || 'No Role';
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
      document.getElementById('UserRole').textContent = storedUserRole;
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
