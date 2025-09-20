// Admin Dashboard User Loading Functions

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

// Function to sign out user (for the logout button)
function signOutUser() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to sign out?')) {
    console.log('Admin - User signing out...');
    
    // Clear all user session data from localStorage
    localStorage.removeItem('id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('reservations');
    localStorage.removeItem('userReservations');
    localStorage.removeItem('selectedDate');
    
    // Clear any other session data
    sessionStorage.clear();
    
    // Sign out from Supabase if available
    const supabaseClient = getSupabaseClient();
    if (supabaseClient && supabaseClient.auth) {
      supabaseClient.auth.signOut().catch(error => {
        console.warn('Error signing out from Supabase:', error);
      });
    }
    
    console.log('Admin - User signed out successfully');
    
    // Redirect to landing page
    window.location.href = '../../landingPage.html';
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

// ========== EXISTING ADMIN DASHBOARD CODE BELOW ==========

// Direct fetch to Supabase REST API (no library needed)
async function fetchFromSupabase(table, select = '*', startDate, endDate) {
  const supabaseUrl = 'https://nwudopvjzrlppahylpev.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dWRvcHZqenJscHBhaHlscGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyMjU4NDgsImV4cCI6MjA0ODgwMTg0OH0.fhcCkzQfFMZqTAYpgVMQgDcIKbBMZ6YgUjH4mUH5-vU';
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=${select}`;
  
  // Add date filters if provided
  if (startDate) {
    url += `&date=gte.${startDate}`;
  }
  if (endDate) {
    url += `&date=lt.${endDate}`;
  }
  
  console.log('Fetching from Supabase REST API:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched data:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return { data: null, error };
  }
}

// Function to fetch current month facility data
async function fetchCurrentMonthFacilityData() {
  // For now, skip the network call and use sample data due to connectivity issues
  console.log('Skipping Supabase fetch due to network connectivity issues');
  console.log('Using sample facility data for demonstration');
  return null;

  /* Commented out until network connectivity is resolved
  try {
    // Get current month range (December 2024)
    const now = new Date();
    const year = now.getFullYear(); // 2024
    const month = now.getMonth(); // 0-based (December = 11)
    
    console.log(`Debug: Current date is ${now.toISOString()}, year: ${year}, month: ${month}`);
    
    // First day of current month
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    // First day of next month
    const startOfNextMonth = new Date(year, month + 1, 1).toISOString().split('T')[0];
    
    console.log(`Fetching reservations for ${startOfMonth} to ${startOfNextMonth}...`);

    // Fetch reservations for current month using direct REST API
    const { data: reservations, error } = await fetchFromSupabase(
      'reservations', 
      'facility,date', 
      startOfMonth,
      startOfNextMonth
    );

    if (error) {
      console.error('Error fetching reservations:', error);
      return null;
    }

    console.log(`Found ${reservations.length} reservations for current month:`, reservations);

    if (!reservations || reservations.length === 0) {
      console.log('No reservations found for current month');
      return null;
    }

    // Count facility usage
    const facilityCount = {};
    reservations.forEach(reservation => {
      const facility = reservation.facility || 'Others';
      facilityCount[facility] = (facilityCount[facility] || 0) + 1;
    });

    // Convert to arrays for Chart.js
    const labels = Object.keys(facilityCount);
    const data = Object.values(facilityCount);

    // Predefined colors for consistency
    const colors = [
      '#FFCC00', '#A1C181', '#E8E288', '#92DCE5', 
      '#FFDCC1', '#A7C6ED', '#FFABAB', '#CCCCCC',
      '#FFB6C1', '#98FB98', '#DDA0DD', '#F0E68C'
    ];

    console.log('Facility usage for current month:', { labels, data });

    return {
      labels,
      data,
      colors: colors.slice(0, labels.length)
    };
  } catch (err) {
    console.error('Error in fetchCurrentMonthFacilityData:', err);
    return null;
  }
  */
}

// Function to get sample chart data as fallback
function getSampleChartData() {
  return {
    labels: [
      'Palma Hall',
      'Right Wing Lobby', 
      'Mehan Garden',
      'Rooftop',
      'Classroom',
      'Basketball Court',
      'Space at the Ground Floor',
      'Others'
    ],
    data: [30, 20, 15, 14, 6, 5, 5, 5],
    colors: [
      '#FFCC00',
      '#A1C181',
      '#E8E288',
      '#92DCE5',
      '#FFDCC1',
      '#A7C6ED',
      '#FFABAB',
      '#CCCCCC'
    ]
  };
}

// Wait for DOM to load before initializing chart
document.addEventListener('DOMContentLoaded', async function() {
  const canvasElement = document.getElementById('UsagePieChart');
  
  if (!canvasElement) {
    console.error('Canvas element with ID "UsagePieChart" not found. Make sure your HTML includes: <canvas id="UsagePieChart"></canvas>');
    return;
  }

  const ctx = canvasElement.getContext('2d');

  // Try to fetch real data for current month
  console.log('Fetching current month facility usage data...');
  const facilityData = await fetchCurrentMonthFacilityData();
  
  let chartData;
  if (facilityData && facilityData.labels.length > 0) {
    console.log('Using real facility data for current month:', facilityData);
    chartData = {
      labels: facilityData.labels,
      datasets: [{
        data: facilityData.data,
        backgroundColor: facilityData.colors
      }]
    };
  } else {
    console.warn('No current month data found, using sample data');
    const sampleData = getSampleChartData();
    chartData = {
      labels: sampleData.labels,
      datasets: [{
        data: sampleData.data,
        backgroundColor: sampleData.colors
      }]
    };
  }

  // Create the pie chart
  new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          color: '#000',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, ctx) => {
            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            let percentage = (value * 100 / sum).toFixed(1) + "%";
            return percentage;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // Update usage title function
  function updateUsageTitle() {
    const titleElement = document.getElementById('usage-title');
    if (!titleElement) {
      console.warn('Element with ID "usage-title" not found');
      return;
    }
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    titleElement.textContent = `USAGE PERCENTAGE OF FACILITIES FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`;
  }

  // Call it once on page load
  updateUsageTitle();
  
  // Optional: refresh it every day (in case the month changes)
  setInterval(updateUsageTitle, 24 * 60 * 60 * 1000);

  // Set active menu item
  document.querySelectorAll('.menu a').forEach(link => {
    if (
      link.href &&
      window.location.pathname.endsWith(link.getAttribute('href'))
    ) {
      link.classList.add('active');
    }
  });
});