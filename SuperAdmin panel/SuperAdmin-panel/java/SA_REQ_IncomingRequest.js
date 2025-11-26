const STATUS_META = {
  request: { label: 'Awaiting Admin Print', pillClass: 'status-pill--pending' },
  pending: { label: 'Awaiting Decision', pillClass: 'status-pill--pending' },
  approved: { label: 'Approved', pillClass: 'status-pill--approved' },
  rejected: { label: 'Disapproved', pillClass: 'status-pill--rejected' }
};

function getStatusMeta(status) {
  const key = (status || 'request').toLowerCase();
  return STATUS_META[key] || { label: key || 'Request', pillClass: 'status-pill--default' };
}

function getSupabase() {
  if (typeof window === 'undefined') return null;
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY) {
    try {
      return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
    }
  }
  return null;
}

const supabase = getSupabase();

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

async function getUserFullName(userId) {
  if (!supabase) return `User ${userId}`;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('first_name,last_name,full_name,name')
      .eq('id', userId)
      .limit(1);
    if (error || !data || data.length === 0) return `User ${userId}`;
    const record = data[0];
    const fn = (record.first_name || '').trim();
    const ln = (record.last_name || '').trim();
    if (fn || ln) return `${fn} ${ln}`.trim();
    const fallback = (record.full_name || record.name || '').trim();
    if (fallback) return fallback;
    return `User ${userId}`;
  } catch (err) {
    console.error('getUserFullName error:', err);
    return `User ${userId}`;
  }
}

async function loadIncomingRequests() {
  const tableBody = document.getElementById('requestTableBody');
  if (!tableBody) return;

  if (!supabase) {
    tableBody.innerHTML = '<tr><td colspan="6">Supabase client not available.</td></tr>';
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  try {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'request')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching incoming requests:', error);
      tableBody.innerHTML = `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
      return;
    }

    if (!reservations || reservations.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No incoming requests found.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    for (const reservation of reservations) {
      const userName = await getUserFullName(reservation.id);
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const statusMeta = getStatusMeta(reservation.status);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeStart} - ${timeEnd}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td><span class="status-pill ${statusMeta.pillClass}">${statusMeta.label}</span></td>
      `;
      tableBody.appendChild(row);
    }
  } catch (err) {
    console.error('loadIncomingRequests error:', err);
    tableBody.innerHTML = `<tr><td colspan="6">Error loading data: ${err.message}</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadIncomingRequests();
  setInterval(loadIncomingRequests, 10000);
});

