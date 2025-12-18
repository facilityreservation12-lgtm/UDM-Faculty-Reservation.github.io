// Initialize Supabase client
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Helper: format date
function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Helper: format time (HH:MM) -> h:mm AM/PM
function formatTime(timeString) {
  if (!timeString) return '';
  const [hh, mm] = timeString.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${mm} ${ampm}`;
}

// Get user display name (ensure FirstName LastName; never return raw id)
async function getUserFullName(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('first_name,last_name,full_name,name')
      .eq('id', userId)
      .limit(1);
    if (error || !data || data.length === 0) return 'Unknown User';
    const u = data[0];

    // Prefer explicit first_name + last_name when available
    const fn = (u.first_name || '').toString().trim();
    const ln = (u.last_name || '').toString().trim();
    if (fn || ln) {
      return `${fn} ${ln}`.trim();
    }

    // If only full_name or name present, try to split into first and last
    const candidate = (u.full_name || u.name || '').toString().trim();
    if (candidate) {
      const parts = candidate.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0];
      // return first and last parts
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }

    // Do not reveal id; show friendly placeholder instead
    return 'Unknown User';
  } catch (err) {
    console.error('getUserFullName error:', err);
    return 'Unknown User';
  }
}

const STATUS_META = {
  pending: { label: 'Awaiting Super Admin', pillClass: 'status-pill--pending' },
  request: { label: 'Awaiting Print', pillClass: 'status-pill--pending' },
  approved: { label: 'Approved', pillClass: 'status-pill--approved' },
  rejected: { label: 'Disapproved', pillClass: 'status-pill--rejected' }
};

function getStatusMeta(status) {
  const key = (status || 'pending').toLowerCase();
  return STATUS_META[key] || { label: key || 'Pending', pillClass: 'status-pill--default' };
}

// Fetch and display reservations with statuses that admins need to track
async function loadPendingRequests() {
  try {
    const tableBody = document.getElementById('pendingTableBody');
    if (!tableBody) {
      console.warn('pendingTableBody not found');
      return;
    }
    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .in('status', ['request', 'pending', 'approved', 'rejected'])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching pending reservations:', error);
      tableBody.innerHTML = `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
      return;
    }

    if (!reservations || reservations.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No pending requests found.</td></tr>';
      return;
    }

    // Batch fetch user names for all reservations to avoid per-row queries
    const userIds = Array.from(new Set(reservations.map(r => r.user_id).filter(Boolean)));
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
      if (usersErr) {
        console.warn('Could not fetch users in batch:', usersErr);
      } else if (users && users.length) {
        usersMap = users.reduce((m, u) => {
          const fn = (u.first_name || '').trim();
          const ln = (u.last_name || '').trim();
          m[u.id] = (fn || ln) ? `${fn} ${ln}`.trim() : 'Unknown User';
          return m;
        }, {});
      }
    }

    tableBody.innerHTML = '';
    for (const reservation of reservations) {
      // prefer batch-fetched name, fallback to 'Unknown User'
      const userName = usersMap[reservation.user_id] || 'Unknown User';
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const timeRange = (timeStart || timeEnd) ? `${timeStart} - ${timeEnd}` : '';
      const row = document.createElement('tr');
      const statusMeta = getStatusMeta(reservation.status);
      row.classList.toggle('row-is-rejected', statusMeta.label === 'Disapproved');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeRange}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td><span class="status-pill ${statusMeta.pillClass}">${statusMeta.label}</span></td>
      `;
      tableBody.appendChild(row);
    }
  } catch (err) {
    console.error('loadPendingRequests error:', err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadPendingRequests().catch(err => console.error(err));
  setInterval(() => loadPendingRequests().catch(err => console.error(err)), 10000);
});