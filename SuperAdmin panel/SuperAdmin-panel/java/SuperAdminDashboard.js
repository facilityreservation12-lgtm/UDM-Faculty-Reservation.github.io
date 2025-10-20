// Admin Dashboard User Loading Functions

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
  
  if (typeof window !== 'undefined') {
    if (window.supabase) return window.supabase;
    if (window._supabase) return window._supabase;
    if (window.sb) return window.sb;
  }
  
  const supabaseProps = typeof window !== 'undefined' ? 
    Object.keys(window).filter(key => key.toLowerCase().includes('supabase')) : [];
  
  console.error('❌ Supabase client not found.');
  console.log('🔍 Available Supabase-related properties:', supabaseProps);
  
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
    let userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 localStorage.getItem('userId') || 
                 localStorage.getItem('currentUserId');
    
    console.log('Admin Dashboard - Retrieved userId from localStorage:', userId);

    if (!userId) {
      console.log('No user ID found in localStorage. User not logged in.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Not logged in';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'No role';
      return;
    }

    console.log('Attempting to fetch user data from Supabase using client...');
    const { data, error } = await fetchUserData(userId);

    console.log('Admin Dashboard - User query result:', { data, error });

    if (error || !data) {
      console.warn('Error fetching user or user not found. Using fallback display.');
      
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
        console.log('Using generic fallback user display');
        const displayName = userId === 'A001' ? 'Admin User' : `User ${userId}`;
        const displayRole = userId === 'A001' ? 'Administrator' : 'User';
        
        if (document.getElementById('UserName')) {
          document.getElementById('UserName').textContent = displayName;
        }
        if (document.getElementById('UserRole')) {
          document.getElementById('UserRole').textContent = displayRole;
        }
        
        localStorage.setItem('user_name', displayName);
        localStorage.setItem('user_role', displayRole);
      }
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const userRole = data.role_name || '';
    
    console.log('Admin Dashboard - User data fetched successfully:', { userName, userRole });
    
    if (document.getElementById('UserName')) {
      document.getElementById('UserName').textContent = userName || 'Unknown User';
    }
    if (document.getElementById('UserRole')) {
      document.getElementById('UserRole').textContent = userRole || 'No Role';
    }
    
    localStorage.setItem('user_name', userName);
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('id', data.id);
    
  } catch (err) {
    console.error('Admin Dashboard - loadUserDetails error:', err);
    console.log('Using fallback due to error');
    
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

document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin Dashboard - DOM loaded, waiting for Supabase client...');
  setTimeout(waitForSupabaseAndLoadUser, 500);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(waitForSupabaseAndLoadUser, 500);
  });
} else {
  setTimeout(waitForSupabaseAndLoadUser, 500);
}

window.addEventListener('storage', (event) => {
  if (event.key === 'id' || event.key === 'user_id' || event.key === 'userId' || event.key === 'currentUserId') {
    console.log('Admin Dashboard - User login state changed in another tab');
    loadUserDetails();
  }
});

// ========== FACILITY USAGE DATA FUNCTIONS ==========

// Function to fetch internal facility data (from reservations table with status 'approved')
async function fetchInternalFacilityData(year, month) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for facility data');
      return null;
    }

    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const endOfMonth = new Date(year, month, lastDayOfMonth).toISOString().split('T')[0];
    
    console.log(`📊 Fetching INTERNAL reservations from ${startOfMonth} to ${endOfMonth}`);

    const { data: reservations, error } = await supabaseClient
      .from('reservations')
      .select('facility, date, status')
      .eq('status', 'approved')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) {
      console.error('❌ Error fetching internal reservations:', error);
      return null;
    }

    console.log(`✅ Found ${reservations?.length || 0} internal reservations`);

    if (!reservations || reservations.length === 0) {
      return null;
    }

    const facilityCount = {};
    reservations.forEach(reservation => {
      const facility = reservation.facility || 'Others';
      facilityCount[facility] = (facilityCount[facility] || 0) + 1;
    });

    return facilityCount;
  } catch (err) {
    console.error('❌ Error in fetchInternalFacilityData:', err);
    return null;
  }
}

// Function to fetch external facility data (from manual_events table)
async function fetchExternalFacilityData(year, month) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for external facility data');
      return null;
    }

    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const endOfMonth = new Date(year, month, lastDayOfMonth).toISOString().split('T')[0];
    
    console.log(`📊 Fetching EXTERNAL events from ${startOfMonth} to ${endOfMonth}`);

    const { data: events, error } = await supabaseClient
      .from('manual_events')
      .select('facility, date')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) {
      console.error('❌ Error fetching external events:', error);
      return null;
    }

    console.log(`✅ Found ${events?.length || 0} external events`);

    if (!events || events.length === 0) {
      return null;
    }

    const facilityCount = {};
    events.forEach(event => {
      const facility = event.facility || 'Others';
      facilityCount[facility] = (facilityCount[facility] || 0) + 1;
    });

    return facilityCount;
  } catch (err) {
    console.error('❌ Error in fetchExternalFacilityData:', err);
    return null;
  }
}

// Function to combine internal and external data
function combineFacilityData(internalData, externalData) {
  const combined = {};
  
  // Add internal data
  if (internalData) {
    Object.keys(internalData).forEach(facility => {
      combined[facility] = (combined[facility] || 0) + internalData[facility];
    });
  }
  
  // Add external data
  if (externalData) {
    Object.keys(externalData).forEach(facility => {
      combined[facility] = (combined[facility] || 0) + externalData[facility];
    });
  }
  
  return combined;
}

// Function to prepare chart data from facility counts
function prepareChartData(facilityCount) {
  if (!facilityCount || Object.keys(facilityCount).length === 0) {
    return null;
  }

  const colorMap = {
    'Palma Hall': '#FFCC00',
    'Right Wing Lobby': '#A1C181',
    'Mehan Garden': '#E8E288',
    'Rooftop': '#92DCE5',
    'Classroom': '#FFDCC1',
    'Basketball Court': '#A7C6ED',
    'Space at the Ground Floor': '#FFABAB',
    'Ground Floor Space': '#FFABAB',
    'Others': '#CCCCCC'
  };

  const labels = Object.keys(facilityCount);
  const data = Object.values(facilityCount);
  const colors = labels.map(label => colorMap[label] || '#CCCCCC');

  return { labels, data, colors };
}

// Function to create a pie chart
function createPieChart(canvasId, chartData, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas with ID "${canvasId}" not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: chartData.colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        datalabels: {
          color: '#000',
          font: {
            weight: 'bold',
            size: 12
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
}

// Function to populate the facility table
function populateFacilityTable(internalData, externalData, totalData) {
  const tableBody = document.querySelector('#facilityTable tbody');
  if (!tableBody) {
    console.warn('Facility table body not found');
    return;
  }

  tableBody.innerHTML = '';

  const allFacilities = new Set([
    ...Object.keys(internalData || {}),
    ...Object.keys(externalData || {}),
    ...Object.keys(totalData || {})
  ]);

  const colorMap = {
    'Palma Hall': '#FFCC00',
    'Right Wing Lobby': '#A1C181',
    'Mehan Garden': '#E8E288',
    'Rooftop': '#92DCE5',
    'Classroom': '#FFDCC1',
    'Basketball Court': '#A7C6ED',
    'Space at the Ground Floor': '#FFABAB',
    'Ground Floor Space': '#FFABAB',
    'Others': '#CCCCCC'
  };

  allFacilities.forEach(facility => {
    const row = document.createElement('tr');
    const color = colorMap[facility] || '#CCCCCC';
    
    row.innerHTML = `
      <td>
        <span style="display: inline-block; width: 20px; height: 20px; background-color: ${color}; margin-right: 8px; vertical-align: middle; border-radius: 3px;"></span>
        ${facility}
      </td>
      <td style="text-align: center;">${internalData?.[facility] || 0}</td>
      <td style="text-align: center;">${externalData?.[facility] || 0}</td>
      <td style="text-align: center; font-weight: bold;">${totalData?.[facility] || 0}</td>
    `;
    
    tableBody.appendChild(row);
  });
}

// ========== INCOMING REQUESTS FUNCTIONS ==========

async function fetchIncomingRequests() {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for incoming requests');
      return [];
    }

    console.log('🔍 Fetching incoming requests with status "request"...');

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
    return requests || [];
  } catch (err) {
    console.error('❌ Error in fetchIncomingRequests:', err);
    return [];
  }
}

async function populateIncomingRequestsTable() {
  const requests = await fetchIncomingRequests();
  
  // Update selector to target incoming-requests-table specifically
  const tableBody = document.querySelector('.incoming-requests-table tbody');
  
  if (!tableBody) {
    console.warn('Incoming requests table not found');
    return;
  }

  tableBody.innerHTML = '';

  if (requests.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="5" style="text-align: center; color: #666;">No pending requests</td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }

  requests.forEach(request => {
    const row = document.createElement('tr');
    
    const userName = `${request.users.first_name || ''} ${request.users.last_name || ''}`.trim();
    const timeRange = `${request.time_start || 'N/A'} - ${request.time_end || 'N/A'}`;
    
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

// ========== ACTIVITY CARDS FUNCTIONS ==========

async function fetchActivitiesForDate(date) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available for activities');
      return [];
    }

    console.log(`🔍 Fetching approved activities for ${date}...`);

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

function formatTime(time) {
  if (!time) return 'N/A';
  
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm}`;
}

async function populateActivityCards() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 2);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextDayStr = nextDay.toISOString().split('T')[0];

  console.log(`📅 Fetching activities for:`, {
    today: todayStr,
    tomorrow: tomorrowStr,
    nextDay: nextDayStr
  });

  const [todayActivities, tomorrowActivities, nextDayActivities] = await Promise.all([
    fetchActivitiesForDate(todayStr),
    fetchActivitiesForDate(tomorrowStr),
    fetchActivitiesForDate(nextDayStr)
  ]);

  populateActivityCard('Activity Today', todayActivities);
  populateActivityCard('Activity Tommorow', tomorrowActivities);
  populateActivityCard('Activity Next Day', nextDayActivities);
}

function populateActivityCard(cardTitle, activities) {
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

  ul.innerHTML = '';

  if (activities.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No approved activities scheduled';
    li.style.color = '#666';
    li.style.fontStyle = 'italic';
    ul.appendChild(li);
    return;
  }

  activities.forEach(activity => {
    const li = document.createElement('li');
    
    const startTime = formatTime(activity.time_start);
    const endTime = formatTime(activity.time_end);
    const timeRange = `${startTime} to ${endTime}`;
    
    li.innerHTML = `${activity.title_of_the_event || 'Untitled Event'} at <strong>${activity.facility || 'Unknown Venue'}</strong> - ${timeRange}`;
    
    ul.appendChild(li);
  });

  console.log(`📊 Populated "${cardTitle}" with ${activities.length} activities`);
}

// ========== MAIN INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing Admin Dashboard...');

  // Update usage title
  function updateUsageTitle() {
    const titleElement = document.getElementById('usage-title');
    if (titleElement) {
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      titleElement.textContent = `USAGE PERCENTAGE OF FACILITIES FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`;
    }
  }

  updateUsageTitle();

  // Fetch facility data for current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  console.log(`📊 Fetching facility data for ${now.toLocaleString('default', { month: 'long' })} ${currentYear}...`);

  const internalData = await fetchInternalFacilityData(currentYear, currentMonth);
  const externalData = await fetchExternalFacilityData(currentYear, currentMonth);
  const totalData = combineFacilityData(internalData, externalData);

  console.log('Internal data:', internalData);
  console.log('External data:', externalData);
  console.log('Total data:', totalData);

  // Prepare chart data
  const internalChartData = prepareChartData(internalData);
  const externalChartData = prepareChartData(externalData);
  const totalChartData = prepareChartData(totalData);

  // Create pie charts
  if (internalChartData) {
    createPieChart('internalPieChart', internalChartData, 'Internal');
  }
  if (externalChartData) {
    createPieChart('externalPieChart', externalChartData, 'External');
  }
  if (totalChartData) {
    createPieChart('totalPieChart', totalChartData, 'Total');
  }

  // Populate facility table
  populateFacilityTable(internalData, externalData, totalData);

  // Populate incoming requests table
  console.log('📋 Loading incoming requests...');
  await populateIncomingRequestsTable();

  // Populate activity cards
  console.log('📅 Loading daily activities...');
  await populateActivityCards();

  // Set active menu item
  document.querySelectorAll('.menu a').forEach(link => {
    if (link.href && window.location.pathname.endsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });

  console.log('✅ Admin Dashboard initialization complete!');
});