document.getElementById('closeStatusModalBtn').onclick = function() {
  document.getElementById('statusModal').style.display = 'none';
};

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

const STATUS_META = {
  pending: { label: 'Awaiting Decision', pillClass: 'status-pill--pending' },
  approved: { label: 'Approved', pillClass: 'status-pill--approved' },
  rejected: { label: 'Disapproved', pillClass: 'status-pill--rejected' }
};

function getStatusMeta(status) {
  const key = (status || 'pending').toLowerCase();
  return STATUS_META[key] || { label: key || 'Pending', pillClass: 'status-pill--default' };
}

function showFeedback(title, message, type = 'info') {
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(title, message, type);
    return;
  }
  alert(`${title}\n${message}`);
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

    const fn = (u.first_name || '').toString().trim();
    const ln = (u.last_name || '').toString().trim();
    if (fn || ln) return `${fn} ${ln}`.trim();

    const candidate = (u.full_name || u.name || '').toString().trim();
    if (candidate) {
      const parts = candidate.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0];
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return 'Unknown User';
  } catch (err) {
    console.error('getUserFullName error:', err);
    return 'Unknown User';
  }
}

// Fetch and display reservations with status = 'pending'
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
      .eq('status', 'pending')
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

    const userIds = Array.from(new Set(reservations.map(r => r.id).filter(Boolean)));
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
      const userName = usersMap[reservation.user_id] || 'Unknown User';
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const timeRange = (timeStart || timeEnd) ? `${timeStart} - ${timeEnd}` : '';
      const statusMeta = getStatusMeta(reservation.status);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeRange}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td>
          <div class="status-cell">
            <span class="status-pill ${statusMeta.pillClass}">${statusMeta.label}</span>
            <button class="status-btn" data-request-id="${reservation.request_id}">Accept/Reject</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    }
  } catch (err) {
    console.error('loadPendingRequests error:', err);
  }
}

let currentRequestId = null;

async function updateReservationStatus(requestId, nextStatus) {
  const { error } = await supabase
    .from('reservations')
    .update({ status: nextStatus })
    .eq('request_id', requestId);
  if (error) {
    console.error(`Status update error (${nextStatus}):`, error);
    throw error;
  }
  const message = nextStatus === 'approved'
    ? 'Request approved and removed from the pending list.'
    : 'Request rejected and removed from the pending list.';
  showFeedback('Status Updated', message, nextStatus === 'approved' ? 'success' : 'warning');
}

document.addEventListener('DOMContentLoaded', function() {
  const tableBody = document.getElementById('pendingTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      const btn = e.target.closest('.status-btn');
      if (!btn) return;
      currentRequestId = btn.dataset.requestId;
      document.getElementById('statusModal').style.display = 'flex';
    });
  }

  const closeBtn = document.getElementById('closeStatusModalBtn');
  if (closeBtn) closeBtn.onclick = () => document.getElementById('statusModal').style.display = 'none';

  const approveBtn = document.getElementById('approveBtn');
  if (approveBtn) approveBtn.onclick = async function () {
    if (!currentRequestId) return;
    approveBtn.disabled = true;
    const disapproveBtn = document.getElementById('disapproveBtn');
    if (disapproveBtn) disapproveBtn.disabled = true;
    try {
      await updateReservationStatus(currentRequestId, 'approved');
      document.getElementById('statusModal').style.display = 'none';
      await loadPendingRequests();
      currentRequestId = null;
    } catch (err) {
      console.error('Approve exception:', err);
      showFeedback('Error', 'Error approving request. See console for details.', 'error');
    } finally {
      approveBtn.disabled = false;
      if (disapproveBtn) disapproveBtn.disabled = false;
    }
  };

  const disapproveBtn = document.getElementById('disapproveBtn');
  if (disapproveBtn) disapproveBtn.onclick = async function () {
    if (!currentRequestId) return;
    disapproveBtn.disabled = true;
    const approveBtn = document.getElementById('approveBtn');
    if (approveBtn) approveBtn.disabled = true;
    try {
      await updateReservationStatus(currentRequestId, 'rejected');
      document.getElementById('statusModal').style.display = 'none';
      await loadPendingRequests();
      currentRequestId = null;
    } catch (err) {
      console.error('Reject exception:', err);
      showFeedback('Error', 'Error rejecting request. See console for details.', 'error');
    } finally {
      disapproveBtn.disabled = false;
      if (approveBtn) approveBtn.disabled = false;
    }
  };

  loadPendingRequests().catch(err => console.error(err));
  setInterval(() => loadPendingRequests().catch(err => console.error(err)), 10000);
});