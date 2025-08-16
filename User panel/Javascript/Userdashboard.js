const supabase = window.supabaseClient;

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function loadReservations() {
  const tbody = document.getElementById('facilityTableBody');
  tbody.innerHTML = "";
  let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
  reservations.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.user}<br /></td>
      <td>${r.codeId}</td>
      <td>${r.facility}</td>
      <td>${r.dateOfEvent}</td>
      <td>${formatTime12hr(r.timeStart)} - ${formatTime12hr(r.timeEnd)}</td>
      <td class="status-pending">${r.status}</td>
      <td><button class="cancel-btn" onclick="cancelReservation('${r.codeId}')">Cancel</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadUserDetails() {
  const userId = localStorage.getItem('user_id');
  console.log('user_id from localStorage:', userId); // Debug
  if (!userId) {
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
    console.warn('No user_id found in localStorage');
    return;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase client not initialized');
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Supabase error:', error);
  }
  console.log('Supabase user fetch result:', data); // Debug
  if (data) {
    const userName = `${data.first_name} ${data.last_name}`.trim() || 'Unknown User';
    const firstName = data.first_name || 'Unknown';
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || 'Unknown Role';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    console.log('User data:', data);
  } else {
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
    console.warn('No user data found for id:', userId);
  }
}

if (document.getElementById('UserName') && document.getElementById('UserRole')) {
  loadUserDetails();
}

window.onload = function() {
  loadReservations();
  updateDateTime();
};

function cancelReservation(codeId) {
  let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
  reservations = reservations.filter(r => r.codeId !== codeId);
  localStorage.setItem('reservations', JSON.stringify(reservations));
  loadReservations();
}

function updateDateTime() {
  const dateElem = document.getElementById('currentDate');
  const timeElem = document.getElementById('currentTime');
  const now = new Date();

  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  dateElem.textContent = now.toLocaleDateString('en-US', dateOptions);

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  timeElem.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

setInterval(updateDateTime, 1000);

// Call this after successful login, passing the user's email or username
async function fetchAndStoreUserIdByEmail(userEmail) {
  if (typeof supabase === 'undefined') return;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  if (data && data.id) {
    localStorage.setItem('user_id', data.id);
  } else {
    console.warn('No user found for email:', userEmail);
  }
}
