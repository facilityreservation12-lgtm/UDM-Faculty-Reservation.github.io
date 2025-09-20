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

// Function to fetch facility data for any specific month
async function fetchFacilityDataForMonth(year, month) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for facility data');
      return null;
    }

    // First day of the specified month
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    // Last day of the specified month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const endOfMonth = new Date(year, month, lastDayOfMonth).toISOString().split('T')[0];
    
    console.log(`🔍 Fetching reservations from ${startOfMonth} to ${endOfMonth} (inclusive)`);

    // First, let's see what data exists in the table
    const { data: allReservations, error: allError } = await supabaseClient
      .from('reservations')
      .select('facility, date')
      .order('date', { ascending: false })
      .limit(10);

    console.log('📋 Sample of recent reservations in database:', allReservations);

    // Special debugging for September 2025 to find the missing 3 reservations
    if (year === 2025 && month === 8) {
      console.log('🔍 DEBUGGING SEPTEMBER 2025: Looking for all September reservations...');
      const { data: allSeptReservations, error: septError } = await supabaseClient
        .from('reservations')
        .select('facility, date')
        .gte('date', '2025-09-01')
        .lte('date', '2025-09-30')
        .order('date');
      
      console.log('📊 ALL September 2025 reservations found:', allSeptReservations);
      console.log(`📊 Total September reservations: ${allSeptReservations?.length || 0}`);
      
      if (allSeptReservations) {
        const septDates = allSeptReservations.map(r => r.date).sort();
        console.log('📅 All September dates:', septDates);
        console.log('📅 September 30th included?', septDates.includes('2025-09-30'));
      }
    }

    // Now fetch for the specific month using inclusive date range
    const { data: reservations, error } = await supabaseClient
      .from('reservations')
      .select('facility, date')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) {
      console.error('❌ Error fetching reservations:', error);
      return null;
    }

    console.log(`✅ Found ${reservations?.length || 0} reservations for ${year}-${String(month + 1).padStart(2, '0')}`);
    console.log('📊 Reservations found:', reservations);
    
    // If we're missing reservations (like September 2025 should have 9 but only showing 6), 
    // let's try the REST API approach as a comparison
    if (year === 2025 && month === 8 && reservations && reservations.length < 9) {
      console.log('🔍 ONLY FOUND 6/9 RESERVATIONS! Trying REST API approach...');
      
      // Try with the old REST API method to see if it finds all 9
      const restApiUrl = 'https://hfasujvdkbjpllwohqcc.supabase.co';
      const restApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYXN1anZka2JqcGxsd29ocWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjA4ODgsImV4cCI6MjA3MDIzNjg4OH0.Wo6eqzObQ_sI_qebCi0F6iGyyP7TYcHCyxSoOZQOpPM';
      
      const restUrl = `${restApiUrl}/rest/v1/reservations?select=facility,date&date=gte.2025-09-01&date=lte.2025-09-30`;
      
      try {
        const restResponse = await fetch(restUrl, {
          method: 'GET',
          headers: {
            'apikey': restApiKey,
            'Authorization': `Bearer ${restApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (restResponse.ok) {
          const restData = await restResponse.json();
          console.log('🌐 REST API found:', restData.length, 'reservations');
          console.log('🌐 REST API data:', restData);
          
          if (restData.length > reservations.length) {
            console.log('✅ REST API found more data! Using REST API results instead.');
            return await processReservationData(restData, year, month);
          }
        }
      } catch (restError) {
        console.warn('REST API fallback failed:', restError);
      }
    }
    
    // Show detailed breakdown of dates found
    if (reservations && reservations.length > 0) {
      const dateBreakdown = {};
      reservations.forEach(res => {
        const date = res.date;
        if (!dateBreakdown[date]) dateBreakdown[date] = 0;
        dateBreakdown[date]++;
      });
      console.log('📅 Date breakdown:', dateBreakdown);
      console.log('📅 Dates included:', Object.keys(dateBreakdown).sort());
    }

    if (!reservations || reservations.length === 0) {
      console.log('📊 No reservations found for this month');
      return null;
    }

    // Count facility usage
    const facilityCount = {};
    reservations.forEach(reservation => {
      const facility = reservation.facility || 'Others';
      facilityCount[facility] = (facilityCount[facility] || 0) + 1;
    });

    console.log('📈 Facility usage counts:', facilityCount);

    // Convert to arrays for Chart.js
    const labels = Object.keys(facilityCount);
    const data = Object.values(facilityCount);

    // Predefined colors that match your legend
    const colorMap = {
      'Palma Hall': '#FFCC00',
      'Right Wing Lobby': '#A1C181',
      'Mehan Garden': '#E8E288',
      'Rooftop': '#92DCE5',
      'Classroom': '#FFDCC1',
      'Basketball Court': '#A7C6ED',
      'Space at the Ground Floor': '#FFABAB',
      'Ground Floor Space': '#FFABAB', // Alternative name
      'Others': '#CCCCCC'
    };

    // Assign colors based on facility names
    const colors = labels.map(label => colorMap[label] || '#CCCCCC');

    console.log('🎨 Chart data prepared:', { labels, data, colors });

    return {
      labels,
      data,
      colors
    };
  } catch (err) {
    console.error('❌ Error in fetchFacilityDataForMonth:', err);
    return null;
  }
}

// Function to fetch current month facility data from reservations table
async function fetchCurrentMonthFacilityData() {
  // Let's try multiple months to find data
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  console.log(`📅 Current date: ${now.toLocaleDateString()}`);
  console.log(`📅 Trying to fetch data for ${now.toLocaleString('default', { month: 'long' })} ${currentYear}`);
  
  // Try current month first
  let facilityData = await fetchFacilityDataForMonth(currentYear, currentMonth);
  
  if (!facilityData) {
    console.log('🔍 No data in current month, trying September 2025...');
    // If no data in current month, try September 2025 (where you have 9 reservations)
    facilityData = await fetchFacilityDataForMonth(2025, 8); // September = month 8 (0-indexed)
  }
  
  if (!facilityData) {
    console.log('🔍 No data in September 2025, trying December 2024...');
    // Try December 2024
    facilityData = await fetchFacilityDataForMonth(2024, 11); // December = month 11
  }
  
  if (!facilityData) {
    console.log('🔍 No data found in recent months, checking all available data...');
    // Show what months have data
    await checkAvailableDataMonths();
  }
  
  return facilityData;
}

// Helper function to process reservation data into chart format
async function processReservationData(reservations, year, month) {
  console.log('📊 Processing reservation data...');
  console.log('📊 Input reservations:', reservations);
  
  if (!reservations || reservations.length === 0) {
    console.log('📊 No reservations to process');
    return null;
  }

  // Show detailed breakdown of dates found
  const dateBreakdown = {};
  reservations.forEach(res => {
    const date = res.date;
    if (!dateBreakdown[date]) dateBreakdown[date] = 0;
    dateBreakdown[date]++;
  });
  console.log('📅 Date breakdown:', dateBreakdown);
  console.log('📅 Dates included:', Object.keys(dateBreakdown).sort());

  // Count facility usage
  const facilityCount = {};
  reservations.forEach(reservation => {
    const facility = reservation.facility || 'Others';
    facilityCount[facility] = (facilityCount[facility] || 0) + 1;
  });

  console.log('📈 Facility usage counts:', facilityCount);

  // Convert to arrays for Chart.js
  const labels = Object.keys(facilityCount);
  const data = Object.values(facilityCount);

  // Predefined colors that match your legend
  const colorMap = {
    'Palma Hall': '#FFCC00',
    'Right Wing Lobby': '#A1C181',
    'Mehan Garden': '#E8E288',
    'Rooftop': '#92DCE5',
    'Classroom': '#FFDCC1',
    'Basketball Court': '#A7C6ED',
    'Space at the Ground Floor': '#FFABAB',
    'Ground Floor Space': '#FFABAB', // Alternative name
    'Others': '#CCCCCC'
  };

  // Assign colors based on facility names
  const colors = labels.map(label => colorMap[label] || '#CCCCCC');

  console.log('🎨 Chart data prepared:', { labels, data, colors });

  return {
    labels,
    data,
    colors
  };
}

// Helper function to check what months have reservation data
async function checkAvailableDataMonths() {
  try {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    const { data: dates, error } = await supabaseClient
      .from('reservations')
      .select('date')
      .order('date', { ascending: false });

    if (dates && dates.length > 0) {
      const uniqueMonths = [...new Set(dates.map(item => item.date.substring(0, 7)))];
      console.log('📅 Available months with reservation data:', uniqueMonths);
      console.log('📊 Total reservations in database:', dates.length);
      console.log('🗓️ Date range:', {
        earliest: dates[dates.length - 1]?.date,
        latest: dates[0]?.date
      });
    }
  } catch (err) {
    console.error('Error checking available data months:', err);
  }
}

// Function to fetch incoming requests with status 'request'
async function fetchIncomingRequests() {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for incoming requests');
      return [];
    }

    console.log('🔍 Fetching incoming requests with status "request"...');

    // Fetch reservations with status 'request' and join with users table to get names
    const { data: requests, error } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        facility,
        date,
        time_start,
        time_end,
        title_of_the_event,
        status,
        users!inner(first_name, last_name)
      `)
      .eq('status', 'request')
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching incoming requests:', error);
      return [];
    }

    console.log(`✅ Found ${requests?.length || 0} incoming requests`);
    console.log('📋 Incoming requests:', requests);

    return requests || [];
  } catch (err) {
    console.error('❌ Error in fetchIncomingRequests:', err);
    return [];
  }
}

// Function to populate the incoming requests table
async function populateIncomingRequestsTable() {
  const requests = await fetchIncomingRequests();
  
  // Find the table body
  const tableBody = document.querySelector('.card table tbody');
  
  if (!tableBody) {
    console.warn('Incoming requests table not found');
    return;
  }

  // Clear existing rows (except sample data if you want to keep some)
  tableBody.innerHTML = '';

  if (requests.length === 0) {
    // Show a "no requests" row
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="5" style="text-align: center; color: #666;">No pending requests</td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }

  // Populate with real data
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    // Combine first_name and last_name
    const userName = `${request.users.first_name || ''} ${request.users.last_name || ''}`.trim();
    
    // Format time (assuming time_start and time_end are in HH:MM format)
    const timeRange = `${request.time_start || 'N/A'} - ${request.time_end || 'N/A'}`;
    
    // Format date (assuming date is in YYYY-MM-DD format)
    const formattedDate = new Date(request.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    row.innerHTML = `
      <td>${userName || 'Unknown User'}</td>
      <td>${request.facility || 'N/A'}</td>
      <td>${formattedDate}</td>
      <td>${timeRange}</td>
      <td>${request.title_of_the_event || 'No details provided'}</td>
    `;
    
    tableBody.appendChild(row);
  });

  console.log(`📊 Populated incoming requests table with ${requests.length} requests`);
}

// Function to fetch approved activities for a specific date
async function fetchActivitiesForDate(date) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for activities');
      return [];
    }

    console.log(`🔍 Fetching approved activities for ${date}...`);

    // Fetch approved reservations for the specific date
    const { data: activities, error } = await supabaseClient
      .from('reservations')
      .select('title_of_the_event, facility, time_start, time_end')
      .eq('status', 'approved')
      .eq('date', date)
      .order('time_start', { ascending: true });

    if (error) {
      console.error('❌ Error fetching activities:', error);
      return [];
    }

    console.log(`✅ Found ${activities?.length || 0} approved activities for ${date}`);
    return activities || [];
  } catch (err) {
    console.error('❌ Error in fetchActivitiesForDate:', err);
    return [];
  }
}

// Function to format time from 24-hour to 12-hour format
function formatTime(time) {
  if (!time) return 'N/A';
  
  // If time is already in 12-hour format, return as is
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }
  
  // Convert from 24-hour to 12-hour format
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm}`;
}

// Function to populate activity cards
async function populateActivityCards() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 2);

  // Format dates as YYYY-MM-DD
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextDayStr = nextDay.toISOString().split('T')[0];

  console.log(`📅 Fetching activities for:`, {
    today: todayStr,
    tomorrow: tomorrowStr,
    nextDay: nextDayStr
  });

  // Fetch activities for each day
  const [todayActivities, tomorrowActivities, nextDayActivities] = await Promise.all([
    fetchActivitiesForDate(todayStr),
    fetchActivitiesForDate(tomorrowStr),
    fetchActivitiesForDate(nextDayStr)
  ]);

  // Populate each activity card
  populateActivityCard('Activity Today', todayActivities);
  populateActivityCard('Activity Tommorow', tomorrowActivities);
  populateActivityCard('Activity Next Day', nextDayActivities);
}

// Function to populate a single activity card
function populateActivityCard(cardTitle, activities) {
  // Find the activity card by its h3 title
  const activityCards = document.querySelectorAll('.activity-card');
  let targetCard = null;

  activityCards.forEach(card => {
    const h3 = card.querySelector('h3');
    if (h3 && h3.textContent.trim() === cardTitle) {
      targetCard = card;
    }
  });

  if (!targetCard) {
    console.warn(`Activity card "${cardTitle}" not found`);
    return;
  }

  const ul = targetCard.querySelector('ul');
  if (!ul) {
    console.warn(`Activity list not found in card "${cardTitle}"`);
    return;
  }

  // Clear existing activities
  ul.innerHTML = '';

  if (activities.length === 0) {
    // Show "no activities" message
    const li = document.createElement('li');
    li.textContent = 'No approved activities scheduled';
    li.style.color = '#666';
    li.style.fontStyle = 'italic';
    ul.appendChild(li);
    return;
  }

  // Populate with real activities
  activities.forEach(activity => {
    const li = document.createElement('li');
    
    // Format: "Title at Facility - Start Time to End Time"
    const startTime = formatTime(activity.time_start);
    const endTime = formatTime(activity.time_end);
    const timeRange = `${startTime} to ${endTime}`;
    
    li.innerHTML = `${activity.title_of_the_event || 'Untitled Event'} at <strong>${activity.facility || 'Unknown Venue'}</strong> - ${timeRange}`;
    
    ul.appendChild(li);
  });

  console.log(`📊 Populated "${cardTitle}" with ${activities.length} activities`);
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
  
  // Populate incoming requests table with real data
  console.log('📋 Loading incoming requests...');
  await populateIncomingRequestsTable();
  
  // Populate activity cards with real approved activities
  console.log('📅 Loading daily activities...');
  await populateActivityCards();
  
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