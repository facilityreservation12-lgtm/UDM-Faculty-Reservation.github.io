(function() {
  if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
    window.approvedSupabase = window.supabaseClient;
  } else if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.approvedSupabase = window.supabase.createClient(
      'https://tryytusvitsztadzqihq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA'
    );
  } else {
    console.error('Supabase library not loaded!');
    return;
  }
})();

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

// Load and render approved reservations
async function loadApprovedRequests() {
  try {
    const tableBody = document.getElementById('approvedTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    const { data: reservations, error } = await window.approvedSupabase
      .from('reservations')
      .select('*')
      .eq('status', 'approved')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching approved reservations:', error);
      tableBody.innerHTML = `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
      return;
    }

    if (!reservations || reservations.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No approved requests found.</td></tr>';
      return;
    }

    // Batch fetch user names for performance
    const userIds = Array.from(new Set(reservations.map(r => r.id).filter(Boolean)));
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await window.approvedSupabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
      if (usersErr) {
        console.warn('Could not fetch users in batch for approved:', usersErr);
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
      const userName = usersMap[reservation.id] || 'Unknown User';
      const timeStart = formatTime(reservation.time_start);
      const timeEnd = formatTime(reservation.time_end);
      const timeRange = (timeStart || timeEnd) ? `${timeStart} - ${timeEnd}` : '';
      // keep Slip button; optionally add request id to querystring if you want per-slip links
      const slipHref = `Slip.html?request_id=${encodeURIComponent(reservation.request_id)}`;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userName}</td>
        <td><strong>${reservation.facility || 'N/A'}</strong></td>
        <td>${formatDate(reservation.date)}</td>
        <td>${timeRange}</td>
        <td>${reservation.title_of_the_event || 'No title provided'}</td>
        <td><button class="slip-btn" onclick="window.location.href='${slipHref}'">View Slip</button></td>
      `;
      tableBody.appendChild(row);
    }
  } catch (err) {
    console.error('loadApprovedRequests error:', err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadApprovedRequests().catch(err => console.error(err));
  // optional: refresh every 10s
  setInterval(() => loadApprovedRequests().catch(err => console.error(err)), 10000);
});