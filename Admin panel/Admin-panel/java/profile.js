
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
