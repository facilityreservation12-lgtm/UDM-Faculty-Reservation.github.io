const calendarGrid = document.getElementById("calendarGrid");
const monthYear = document.getElementById("monthYear");
let currentDate = new Date();

function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function getReservationsForDay(year, month, day) {
  let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
  return reservations.filter(r => {
    const d = new Date(r.dateOfEvent);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

// helper to locate the initialized Supabase client
function getSupabase() {
	// most of your files use window.supabaseClient, some include the UMD as `supabase`
	// prefer the initialized client first
	if (typeof window !== 'undefined') {
		if (window.supabaseClient) return window.supabaseClient;
		if (window.supabase) return window.supabase;
	}
	// fallback to global variable `supabase` if present
	if (typeof supabase !== 'undefined') return supabase;
	return null;
}

async function loadUserDetails() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found. Ensure supabaseClient.js is loaded before this script.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      return;
    }

    // Prefer session-based user id; safe-guarded to avoid AuthSessionMissingError
    let userId = null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      } else {
        // No active session, do not call getUser() (it will throw AuthSessionMissingError)
        console.log('No active session from getSession(), will try localStorage fallback');
      }
    } catch (sessionErr) {
      // getSession rarely throws, but if it does, fallback to localStorage
      console.warn('getSession error (falling back to localStorage):', sessionErr);
    }

    // If we didn't obtain userId from session, try stored user_id
    if (!userId) userId = localStorage.getItem('user_id');

    if (!userId) {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = '';
      console.warn('No user_id available from session or localStorage');
      return;
    }

    // Fetch profile from users table
    const { data, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error fetching user:', error);
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown User';
    const firstName = data.first_name || '';
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || 'Unknown Role';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    // ensure localStorage has current user id
    localStorage.setItem('user_id', data.id);
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

// call on load (always attempt to populate UI)
loadUserDetails();

// subscribe to auth changes to refresh UI when login state changes
const sbClient = getSupabase();
if (sbClient && sbClient.auth && sbClient.auth.onAuthStateChange) {
  sbClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth event', event, session?.user?.id);
    // on sign in/out, reload user details (session-aware)
    loadUserDetails();
  });
} else {
  console.warn('Supabase auth.onAuthStateChange not available - skipping subscription.');
}

function renderCalendar(date) {
  calendarGrid.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = date.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  monthYear.textContent = `${monthName} ${year}`;

  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement("div");
    day.classList.add("calendar-day");

    // Get reservations for this day
    const reservations = getReservationsForDay(year, month, d);

    day.innerHTML = `
      <div class="day-number">${d}</div>
      <div class="events"></div>
    `;

    if (reservations.length > 0) {
      day.classList.add("booked");
      // Show all reservations for this day (facility, event title, time)
      day.querySelector('.events').innerHTML = reservations.map(r =>
        `<div>
          <strong>${r.facility}</strong><br>
          <span>${r.eventTitle ? r.eventTitle : ''}</span><br>
          <span>${formatTime12hr(r.timeStart)} - ${formatTime12hr(r.timeEnd)}</span>
        </div>`
      ).join("<hr>");
      day.title = "Reserved";
      // Allow reserving even if there are existing reservations
      day.addEventListener("click", () => {
        const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        showCustomConfirm("Do you want to reserve this date?", () => {
          window.location.href = `VRF.html?date=${formattedDate}`;
        });
      });
    } else {
      day.addEventListener("click", () => {
        const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        showCustomConfirm("Are you sure you want to reserve this date?", () => {
          window.location.href = `VRF.html?date=${formattedDate}`;
        });
      });
    }

    calendarGrid.appendChild(day);
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
}

renderCalendar(currentDate);

// Custom Alert Modal
function showCustomAlert(message) {
  const alertBox = document.getElementById("customAlert");
  const alertMessage = document.getElementById("alertMessage");
  alertMessage.textContent = message;
  alertBox.style.display = "flex";
}

function closeAlert() {
  document.getElementById("customAlert").style.display = "none";
}

// Custom Confirm Modal
function showCustomConfirm(message, onConfirm) {
  const confirmBox = document.getElementById("customConfirm");
  const confirmMessage = document.getElementById("confirmMessage");
  confirmMessage.textContent = message;

  const yesBtn = document.getElementById("confirmYes");
  const clone = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(clone, yesBtn);

  clone.addEventListener("click", () => {
    confirmBox.style.display = "none";
    onConfirm();
  });

  document.getElementById("confirmNo").onclick = () => {
    confirmBox.style.display = "none";
  };

  confirmBox.style.display = "flex";
}