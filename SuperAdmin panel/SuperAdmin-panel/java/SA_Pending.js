(function() {
  if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
    window.pendingSupabase = window.supabaseClient;
  } else if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.pendingSupabase = window.supabase.createClient(
      'https://tryytusvitsztadzqihq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA'
    );
  } else {
    console.error('Supabase library not loaded!');
    return;
  }
  console.log('Supabase client initialized for SA_Pending');
})();

document.getElementById('closeStatusModalBtn').onclick = function() {
  document.getElementById('statusModal').style.display = 'none';
};

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
    const { data, error } = await window.pendingSupabase
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

// Fetch and display reservations with status = 'pending'
async function loadPendingRequests() {
  try {
    const tableBody = document.getElementById('pendingTableBody');
    if (!tableBody) {
      console.warn('pendingTableBody not found');
      return;
    }
    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    const { data: reservations, error } = await window.pendingSupabase
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

    // Batch fetch user names for all reservations to avoid per-row queries
    const userIds = Array.from(new Set(reservations.map(r => r.id).filter(Boolean)));
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await window.pendingSupabase
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
      const userName = usersMap[reservation.id] || 'Unknown User';
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const timeRange = (timeStart || timeEnd) ? `${timeStart} - ${timeEnd}` : '';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeRange}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td><button class="status-btn" data-request-id="${reservation.request_id}">Accept / Reject</button></td>
      `;
      tableBody.appendChild(row);
    }
  } catch (err) {
    console.error('loadPendingRequests error:', err);
  }
}

// --- New: delegated handlers for dynamic .status-btn and modal actions ---

let currentRequestId = null;

document.addEventListener('DOMContentLoaded', function() {
  // attach delegated click handler to tbody for dynamic buttons
  const tableBody = document.getElementById('pendingTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      const btn = e.target.closest('.status-btn');
      if (!btn) return;
      currentRequestId = btn.dataset.requestId;
      // store the button element so we can optimistically update/remove the row after success
      tableBody.dataset.currentButtonId = currentRequestId;
      document.getElementById('statusModal').style.display = 'flex';
    });
  }

  // modal controls
  const closeBtn = document.getElementById('closeStatusModalBtn');
  if (closeBtn) closeBtn.onclick = () => document.getElementById('statusModal').style.display = 'none';

  const approveBtn = document.getElementById('approveBtn');
  if (approveBtn) approveBtn.onclick = async function () {
    if (!currentRequestId) return;
    approveBtn.disabled = true;
    const disapproveBtn = document.getElementById('disapproveBtn');
    if (disapproveBtn) disapproveBtn.disabled = true;
    try {
      const { error } = await window.pendingSupabase
        .from('reservations')
        .update({ status: 'approved' })
        .eq('request_id', currentRequestId);
      if (error) {
        console.error('Approve error:', error);
        alert('Could not approve. See console.');
      } else {
        // Log the acceptance activity
        if (typeof logActivity === 'function') {
          logActivity('Request Accepted', currentRequestId);
        }
        
        // Send approval email notification to user
        sendApprovalEmail(currentRequestId).then(emailSent => {
          if (emailSent) {
            console.log('✅ Approval email notification sent');
            showEmailNotificationToast('Request approved and email notification sent!', true);
          } else {
            console.log('⚠️ Approval email could not be sent (user may not have email on file)');
            showEmailNotificationToast('Request approved (no email on file for user)', false);
          }
        });
        
        // hide modal and remove the row for this request
        document.getElementById('statusModal').style.display = 'none';
        // remove the table row that has the matching data-request-id button
        const tableBody = document.getElementById('pendingTableBody');
        if (tableBody) {
          const btn = tableBody.querySelector(`.status-btn[data-request-id="${currentRequestId}"]`);
          if (btn) {
            const row = btn.closest('tr');
            if (row) row.remove();
          }
        }
        currentRequestId = null;
      }
    } catch (err) {
      console.error('Approve exception:', err);
      alert('Error approving. See console.');
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
      // Actually reject the request by setting status to 'rejected'
      const { error } = await window.pendingSupabase
        .from('reservations')
        .update({ status: 'rejected' })
        .eq('request_id', currentRequestId);
      if (error) {
        console.error('Reject error:', error);
        alert('Could not reject. See console.');
      } else {
        // Log the rejection activity
        if (typeof logActivity === 'function') {
          logActivity('Request Rejected', currentRequestId);
        }
        
        // Send rejection email notification to user
        sendRejectionEmail(currentRequestId).then(emailSent => {
          if (emailSent) {
            console.log('✅ Rejection email notification sent');
            showEmailNotificationToast('Request rejected and email notification sent!', true);
          } else {
            console.log('⚠️ Rejection email could not be sent (user may not have email on file)');
            showEmailNotificationToast('Request rejected (no email on file for user)', false);
          }
        });
        
        // Close modal and remove the row (request is now rejected)
        document.getElementById('statusModal').style.display = 'none';
        const tableBody = document.getElementById('pendingTableBody');
        if (tableBody) {
          const btn = tableBody.querySelector(`.status-btn[data-request-id="${currentRequestId}"]`);
          if (btn) {
            const row = btn.closest('tr');
            if (row) row.remove();
          }
        }
        currentRequestId = null;
      }
    } catch (err) {
      console.error('Reject exception:', err);
      alert('Error rejecting. See console.');
    } finally {
      disapproveBtn.disabled = false;
      if (approveBtn) approveBtn.disabled = false;
    }
  };

  // initial load & optional polling
  loadPendingRequests().catch(err => console.error(err));
  setInterval(() => loadPendingRequests().catch(err => console.error(err)), 10000);
});