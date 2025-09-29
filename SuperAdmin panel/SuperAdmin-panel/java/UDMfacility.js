// UDM Facility Reservations - Real Database Integration

// Facility names
const facilities = [
  'Palma Hall',
  'Right Wing Lobby', 
  'Mehan Garden',
  'Rooftop',
  'Classroom',
  'Basketball Court',
  'Space at the Ground Floor',
  'Others'
];

let currentFacilityIndex = 0;

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
  
  console.error('❌ Supabase client not found');
  return null;
}

// Function to fetch approved reservations for a specific facility
async function fetchApprovedReservations(facility) {
  try {
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
      console.warn('Supabase client not available');
      return [];
    }

    console.log(`🔍 Fetching approved reservations for ${facility}...`);

    // Fetch approved reservations for the specific facility with user data
    const { data: reservations, error } = await supabaseClient
      .from('reservations')
      .select(`
        request_id,
        date,
        time_start,
        time_end,
        title_of_the_event,
        facility,
        status,
        users!inner(first_name, last_name)
      `)
      .eq('status', 'approved')
      .eq('facility', facility)
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

    if (error) {
      console.error('❌ Error fetching reservations:', error);
      return [];
    }

    console.log(`✅ Found ${reservations?.length || 0} approved reservations for ${facility}`);
    return reservations || [];
  } catch (err) {
    console.error('❌ Error in fetchApprovedReservations:', err);
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

// Function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Function to populate the facility table
async function populateFacilityTable() {
  const facility = facilities[currentFacilityIndex];
  console.log(`🔄 Populating table for facility: ${facility}`);

  const reservations = await fetchApprovedReservations(facility);
  console.log(`✅ Reservations fetched:`, reservations);

  const table = document.getElementById('facility-table');
  if (!table) {
    console.error('❌ Facility table not found in the DOM. Check if the table element exists with id="facility-table".');
    return;
  }

  // Clear existing content
  table.innerHTML = '';

  // Create table header
  const headerRow = table.insertRow();
  headerRow.innerHTML = `
    <th>Code</th>
    <th>End User</th>
    <th>Date</th>
    <th>Time</th>
    <th>Details</th>
    <th>Action</th>
  `;
  headerRow.style.backgroundColor = '#f5f5f5';

  if (reservations.length === 0) {
    console.warn(`⚠️ No approved reservations found for facility: ${facility}`);
    const noDataRow = table.insertRow();
    noDataRow.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 20px; color: #666; font-style: italic;">
        No approved reservations for ${facility}
      </td>
    `;
    return;
  }

  // Populate with real reservation data
  reservations.forEach((reservation, index) => {
    console.log(`🔍 Processing reservation ${index + 1}:`, reservation);

    const row = table.insertRow();

    // Combine first_name and last_name
    const userName = `${reservation.users?.first_name || ''} ${reservation.users?.last_name || ''}`.trim();
    if (!userName) {
      console.warn(`⚠️ User name missing for reservation ID: ${reservation.request_id}`);
    }

    // Format time range
    const startTime = formatTime(reservation.time_start);
    const endTime = formatTime(reservation.time_end);
    const timeRange = `${startTime} - ${endTime}`;

    // Format date
    const formattedDate = formatDate(reservation.date);

    // Create cells safely
    const codeCell = row.insertCell();
    codeCell.textContent = reservation.request_id || 'N/A';

    const userCell = row.insertCell();
    userCell.textContent = userName || 'Unknown User';

    const dateCell = row.insertCell();
    dateCell.textContent = formattedDate;

    const timeCell = row.insertCell();
    timeCell.textContent = timeRange;

    const detailsCell = row.insertCell();
    detailsCell.textContent = reservation.title_of_the_event || 'No details provided';

    const actionCell = row.insertCell();
    const btn = document.createElement('button');
    btn.className = 'view-btn';
    btn.type = 'button';
    btn.textContent = 'View Requirements';
    btn.addEventListener('click', async () => {
      const reqId = reservation.request_id || '';
      const url = `SA_Relevantdocuments.html?request_id=${encodeURIComponent(reqId)}`;
      console.log('View Requirements clicked. request_id=', reqId, 'url=', url);

      try {
        window.location.href = url;
      } catch (navErr) {
        console.error('❌ Navigation attempt failed for', url, navErr);
        alert('Failed to navigate to Relevant Documents. See console for details.');
      }
    });
    actionCell.appendChild(btn);
  });

  console.log(`📊 Successfully populated ${facility} table with ${reservations.length} approved reservations.`);
}

// Function to update the venue title
function updateVenueTitle() {
  const facility = facilities[currentFacilityIndex];
  const titleElement = document.getElementById('venue-title');
  if (titleElement) {
    titleElement.textContent = `UDM - ${facility}`;
  }
  
  // Update the select dropdown
  const select = document.getElementById('facilitySelect');
  if (select) {
    select.value = currentFacilityIndex;
  }
}

// Function to jump to a specific facility
async function jumpToFacility() {
  const select = document.getElementById('facilitySelect');
  if (select) {
    currentFacilityIndex = parseInt(select.value);
    updateVenueTitle();
    await populateFacilityTable();
  }
}

// Function to go to previous facility
async function prevFacility() {
  currentFacilityIndex = currentFacilityIndex > 0 ? 
    currentFacilityIndex - 1 : 
    facilities.length - 1;
  
  updateVenueTitle();
  await populateFacilityTable();
}

// Function to go to next facility
async function nextFacility() {
  currentFacilityIndex = currentFacilityIndex < facilities.length - 1 ? 
    currentFacilityIndex + 1 : 
    0;
  
  updateVenueTitle();
  await populateFacilityTable();
}

// Function to view requirements (placeholder - you can implement this)
function viewRequirements(reservationId) {
  console.log('View requirements for reservation:', reservationId);
  // You can implement this to show detailed requirements
  alert(`Viewing requirements for reservation ID: ${reservationId}`);
}

// Function to update user details
function updateUserDetails() {
  const userNameElement = document.getElementById('UserName');
  const userRoleElement = document.getElementById('UserRole');

  if (!userNameElement) {
    console.error('❌ UserName element not found in the DOM. Ensure an element with id="UserName" exists.');
  }

  if (!userRoleElement) {
    console.error('❌ UserRole element not found in the DOM. Ensure an element with id="UserRole" exists.');
  }

  if (userNameElement) userNameElement.textContent = 'Loading...';
  if (userRoleElement) userRoleElement.textContent = 'Loading...';

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase client not initialized. Cannot fetch user details.');
    if (userNameElement) userNameElement.textContent = 'Unknown User';
    if (userRoleElement) userRoleElement.textContent = 'Unknown Role';
    return;
  }

  const userId = localStorage.getItem('user_id');
  if (!userId) {
    console.warn('⚠️ No user_id found in localStorage. Defaulting to Unknown User.');
    if (userNameElement) userNameElement.textContent = 'Unknown User';
    if (userRoleElement) userRoleElement.textContent = 'Unknown Role';
    return;
  }

  console.log(`🔍 Fetching user details for user_id: ${userId}`);

  supabase
    .from('users')
    .select('first_name, last_name, role_name')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error fetching user details:', error);
        if (userNameElement) userNameElement.textContent = 'Unknown User';
        if (userRoleElement) userRoleElement.textContent = 'Unknown Role';
        return;
      }

      if (!data) {
        console.warn('⚠️ No user data found for user_id:', userId);
        if (userNameElement) userNameElement.textContent = 'Unknown User';
        if (userRoleElement) userRoleElement.textContent = 'Unknown Role';
        return;
      }

      const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const userRole = data.role_name || 'Unknown Role';

      console.log(`✅ User details fetched: Name=${userName}, Role=${userRole}`);

      if (userNameElement) {
        userNameElement.textContent = userName || 'Unknown User';
      }

      if (userRoleElement) {
        userRoleElement.textContent = userRole;
      }
    })
    .catch((fetchError) => {
      console.error('❌ Unexpected error fetching user details:', fetchError);
      if (userNameElement) userNameElement.textContent = 'Unknown User';
      if (userRoleElement) userRoleElement.textContent = 'Unknown Role';
    });
}

// Wait for Supabase client to be ready, then initialize
function waitForSupabaseAndInit() {
  const client = getSupabaseClient();
  if (client) {
    console.log('✅ Supabase client ready, initializing facility view...');
    updateVenueTitle();
    populateFacilityTable();
    updateUserDetails();
  } else {
    console.log('⏳ Waiting for Supabase client to initialize...');
    setTimeout(waitForSupabaseAndInit, 200);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('UDM Facility - DOM loaded, waiting for Supabase client...');
  setTimeout(waitForSupabaseAndInit, 500);
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(waitForSupabaseAndInit, 500);
  });
} else {
  setTimeout(waitForSupabaseAndInit, 500);
}

// Call updateUserDetails on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔄 Initializing user details update...');
  updateUserDetails();
});

// Make functions globally available
window.jumpToFacility = jumpToFacility;
window.prevFacility = prevFacility;
window.nextFacility = nextFacility;
window.viewRequirements = viewRequirements;