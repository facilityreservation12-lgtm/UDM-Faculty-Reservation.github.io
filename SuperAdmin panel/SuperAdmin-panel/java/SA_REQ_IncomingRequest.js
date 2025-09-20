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
  
  console.error('❌ Supabase client not found.');
  return null;
}

// Get Supabase client dynamically when needed
function getSupabase() {
  return getSupabaseClient();
}

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
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return `User ${userId}`;
    }
    
    let { data, error } = await supabase
      .from('users')
      .select('first_name, last_name, role')
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
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return false;
    }
    
    // count only reservations with status = 'request'
    const { count, error } = await supabase
      .from('reservations')
      .select('request_id', { count: 'exact', head: true })
      .eq('status', 'request');

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
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      tableBody.innerHTML = '<tr><td colspan="6">Supabase client not available</td></tr>';
      return;
    }
    
    // Fetch only reservations with status 'request' from Supabase
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'request')
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

// Helper: fetch with timeout
async function fetchWithTimeout(url, opts = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal, method: opts.method || 'HEAD' });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// add helper to mark a reservation as PENDING and refresh the list
async function markAsPending(requestId) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }
    
    // set to lowercase 'pending' so it won't appear in the "request" list (which filters for 'request')
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'pending' })
      .eq('request_id', requestId);

    if (error) {
      console.warn('Failed to mark reservation as PENDING:', error);
      return;
    }
    console.log(`Reservation ${requestId} marked as PENDING.`);
    // refresh the incoming requests list so UI updates
    try { loadIncomingRequests(true); } catch (e) { console.warn('Could not refresh incoming list:', e); }
  } catch (err) {
    console.error('markAsPending error:', err);
  }
}

// Function to handle VRF printing (placeholder)
async function printVRF(requestId) {
  try {
    if (!requestId) {
      alert('Invalid request id');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      alert('Supabase client not available');
      return;
    }

    // 1) Try fetch pdf_url from reservations row
    const { data: row, error: rowErr } = await supabase
      .from('reservations')
      .select('pdf_url')
      .eq('request_id', requestId)
      .single();

    if (rowErr) {
      console.error('Error fetching reservation row:', rowErr);
      alert('Failed to fetch reservation. See console for details.');
      return;
    }

    // prefer validated public url
    async function validateAndOpen(url) {
      try {
        // Try HEAD first to confirm existence (may fail due to CORS, handle by falling back)
        const res = await fetchWithTimeout(url, { method: 'HEAD' }, 5000);
        if (res && (res.status === 200 || res.status === 0)) {
          window.open(url, '_blank');
          return true;
        }
        // status not OK -> treat as invalid
        console.warn('HEAD returned status', res.status, 'for', url);
        return false;
      } catch (err) {
        // network/CORS/timeout - still try GET as a last resort
        console.warn('HEAD fetch failed for', url, err);
        try {
          const res2 = await fetchWithTimeout(url, { method: 'GET' }, 7000);
          if (res2 && (res2.status === 200 || res2.status === 0)) {
            window.open(url, '_blank');
            return true;
          }
          console.warn('GET returned status', res2.status, 'for', url);
          return false;
        } catch (err2) {
          console.warn('GET also failed for', url, err2);
          return false;
        }
      }
    }

    if (row?.pdf_url) {
      try {
        const ok = await validateAndOpen(row.pdf_url);
        if (ok) {
          await markAsPending(requestId); // <--- mark pending on success
          return;
        }
        console.warn('Stored pdf_url is not accessible, will attempt storage lookup.');
      } catch (e) {
        console.warn('Validation error for stored pdf_url:', e);
      }
    }

    // 2) Try storage lookups
    const candidateBuckets = [
      'facilityreservation',
      'facility-reservation',
      'facility_reservation',
    ];
    const folder = 'Reserved Facilities';
    const fileName = `VRF-${requestId}.pdf`;
    const path = `${folder}/${fileName}`;

    let foundPublicUrl = null;
    let foundBucket = null;

    for (const bucket of candidateBuckets) {
      // Try getPublicUrl
      try {
        const { data: urlData, error: urlErr } = supabase
          .storage
          .from(bucket)
          .getPublicUrl(path);

        if (urlErr) {
          const msg = (urlErr.message || '').toLowerCase();
          console.warn(`getPublicUrl error for bucket="${bucket}" path="${path}":`, urlErr);
          // if bucket not found, try next candidate
        } else {
          const publicUrl = urlData?.publicUrl || urlData?.public_url || null;
          if (publicUrl) {
            const ok = await validateAndOpen(publicUrl);
            if (ok) {
              foundPublicUrl = publicUrl;
              foundBucket = bucket;
              // update reservations.pdf_url with the working public URL
              const { error: updErr } = await supabase
                .from('reservations')
                .update({ pdf_url: publicUrl })
                .eq('request_id', requestId);
              if (updErr) console.warn('Failed to update reservations.pdf_url:', updErr);
              await markAsPending(requestId); // <--- mark pending on success
              return;
            } else {
              console.warn('Public URL returned but validation failed for', publicUrl);
            }
          }
        }
      } catch (err) {
        console.warn(`getPublicUrl threw for bucket="${bucket}":`, err);
      }

      // Try signed URL (short-lived)
      try {
        const { data: signedData, error: signedErr } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(path, 120); // 2 minutes

        if (!signedErr && signedData?.signedUrl) {
          const signedUrl = signedData.signedUrl;
          const ok = await validateAndOpen(signedUrl);
          if (ok) {
            // don't overwrite pdf_url with signed URL (short-lived)
            await markAsPending(requestId); // <--- mark pending when opening with signed URL
            return;
          } else {
            console.warn('Signed URL returned but validation failed for', signedUrl);
          }
        } else if (signedErr) {
          console.warn(`createSignedUrl error for "${bucket}":`, signedErr);
        }
      } catch (err) {
        console.warn(`createSignedUrl threw for "${bucket}":`, err);
      }

      // Try list folder to find actual filename variants
      try {
        const { data: listData, error: listErr } = await supabase
          .storage
          .from(bucket)
          .list(folder);

        if (listErr) {
          console.warn(`list error for bucket="${bucket}" folder="${folder}":`, listErr);
        } else if (Array.isArray(listData)) {
          // try to find file that includes requestId (tolerant)
          const found = listData.find(item => item.name && item.name.includes(requestId));
          if (found) {
            const filePath = `${folder}/${found.name}`;
            // try public url for found item
            try {
              const { data: urlData2, error: urlErr2 } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(filePath);
              const publicUrl2 = urlData2?.publicUrl || urlData2?.public_url || null;
              if (publicUrl2) {
                const ok2 = await validateAndOpen(publicUrl2);
                if (ok2) {
                  const { error: updErr2 } = await supabase
                    .from('reservations')
                    .update({ pdf_url: publicUrl2 })
                    .eq('request_id', requestId);
                  if (updErr2) console.warn('Failed to update reservations.pdf_url:', updErr2);
                  await markAsPending(requestId); // <--- mark pending on success
                  return;
                }
              }
            } catch (e) {
              console.warn('Error fetching public URL for found file:', e);
            }

            // as last fallback for found file, try signed URL
            try {
              const { data: signedData2, error: signedErr2 } = await supabase
                .storage
                .from(bucket)
                .createSignedUrl(filePath, 120);
              if (!signedErr2 && signedData2?.signedUrl) {
                const ok3 = await validateAndOpen(signedData2.signedUrl);
                if (ok3) return;
              }
            } catch (e) {
              console.warn('Error creating signed URL for found file:', e);
            }
          }
        }
      } catch (err) {
        console.warn(`Listing threw for bucket="${bucket}":`, err);
      }
    } // end for buckets

    // Nothing worked
    alert('PDF not available for this request. Confirm the file exists in the bucket "facilityreservation" under "Reserved Facilities" as VRF-<request_id>.pdf, or check storage policies.');
  } catch (err) {
    console.error('printVRF error:', err);
    alert('Unexpected error. See console for details.');
  }
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
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase client not available for testing');
      return;
    }
    
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
