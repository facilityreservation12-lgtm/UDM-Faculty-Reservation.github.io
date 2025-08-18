// Initialize Supabase client
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

// Function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

// Function to format time
function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Function to get user's full name from the users table
async function getUserFullName(userId) {
  try {
    console.log(`Fetching user details for ID: ${userId}`);
    
    // First try to get all available columns to see what's in the users table
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

    console.log(`User query result for ${userId}:`, { data, error });

    if (error) {
      console.error('Error fetching user:', error);
      return `User ${userId}`;
    }

    if (!data || data.length === 0) {
      console.log(`No user found with ID: ${userId}`);
      return `User ${userId}`;
    }

    const user = data[0];
    console.log(`User data for ${userId}:`, user);

    // Try different possible column combinations
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.full_name) {
      return user.full_name;
    } else if (user.name) {
      return user.name;
    } else {
      // If no name columns found, return a formatted version of the ID
      return `User ${userId}`;
    }
    
  } catch (error) {
    console.error('Error in getUserFullName:', error);
    return `User ${userId}`;
  }
}

// Global variable to track the last known count of reservations
let lastReservationCount = 0;

// Function to check if there are new reservations
async function checkForNewRequests() {
  try {
    const { count, error } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking for new requests:', error);
      return false;
    }

    console.log(`Current reservation count: ${count}, Last known count: ${lastReservationCount}`);
    
    if (count > lastReservationCount) {
      lastReservationCount = count;
      return true; // New requests found
    }
    
    return false; // No new requests
  } catch (error) {
    console.error('Error in checkForNewRequests:', error);
    return false;
  }
}

// Function to fetch and display reservations
async function loadIncomingRequests(forceReload = false) {
  console.log('Starting to load incoming requests...');
  
  try {
    // Check if we need to reload (only if forced or new requests detected)
    if (!forceReload) {
      const hasNewRequests = await checkForNewRequests();
      if (!hasNewRequests) {
        console.log('No new requests detected, skipping reload.');
        return;
      }
      console.log('New requests detected, reloading data...');
    }

    // Show loading message
    const tableBody = document.getElementById('requestTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    console.log('Fetching reservations from Supabase...');
    
    // Fetch all reservations from Supabase
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true });

    console.log('Supabase response:', { data: reservations, error });

    if (error) {
      console.error('Error fetching reservations:', error);
      tableBody.innerHTML = 
        `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
      return;
    }

    console.log(`Found ${reservations ? reservations.length : 0} reservations`);
    
    // Update the count for future comparisons
    lastReservationCount = reservations ? reservations.length : 0;
    
    if (!reservations || reservations.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No incoming requests found.</td></tr>';
      return;
    }

    // Clear existing content
    tableBody.innerHTML = '';

    console.log('Processing reservations...');

    // Process each reservation
    for (const reservation of reservations) {
      console.log('Processing reservation:', reservation);
      
      // Get user's full name
      const userName = await getUserFullName(reservation.id);
      
      // Format time range
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const timeRange = `${timeStart} - ${timeEnd}`;
      
      // Create table row
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeRange}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td><button class="print-btn" onclick="printVRF('${reservation.request_id}')">Print</button></td>
      `;
      
      tableBody.appendChild(row);
    }

    console.log(`Successfully loaded ${reservations.length} reservations`);
    
  } catch (error) {
    console.error('Error in loadIncomingRequests:', error);
    document.getElementById('requestTableBody').innerHTML = 
      `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
  }
}

// Function to handle VRF printing (placeholder)
function printVRF(requestId) {
  alert(`Print VRF for request: ${requestId}`);
  // TODO: Implement actual VRF printing functionality
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - starting initialization...');
  console.log('Window.supabase available:', !!window.supabase);
  console.log('SUPABASE_URL:', window.SUPABASE_URL);
  console.log('SUPABASE_KEY length:', window.SUPABASE_KEY ? window.SUPABASE_KEY.length : 'undefined');
  
  // Test Supabase connection
  testSupabaseConnection();
  
  // Load incoming requests (force initial load)
  loadIncomingRequests(true);
  
  // Set up smart refresh - check for new requests every 10 seconds
  setInterval(() => {
    console.log('Checking for new requests...');
    loadIncomingRequests(); // This will only reload if new requests are detected
  }, 10000); // 10 seconds
});

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('reservations')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful. Total reservations:', data);
    }
  } catch (error) {
    console.error('Supabase connection test error:', error);
  }
}
