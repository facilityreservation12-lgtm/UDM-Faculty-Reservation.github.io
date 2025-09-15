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

async function getReservationsForDay(year, month, day) {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      return [];
    }

    // Get current user ID from localStorage (users table based login)
    const userId = localStorage.getItem('id');

    // Format the target date
    const targetDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (!userId) {
      // No user logged in, show all reservations
      // Fetch all reservations for the date if no user is logged in
      const { data: reservations, error } = await sb
        .from('reservations')
        .select('facility, time_start, time_end, title_of_the_event')
        .eq('date', targetDate);

      if (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }

      return reservations || [];
    }

    // Fetch reservations from database for the specific user and date
    // Note: id in reservations table is FK to users.id, request_id is the PK
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, time_start, time_end, title_of_the_event')
      .eq('id', userId)
      .eq('date', targetDate);

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return reservations || [];
  } catch (err) {
    console.error('getReservationsForDay error:', err);
    return [];
  }
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
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    // Get user ID from localStorage (users table based login)
    // Check multiple possible keys that might be used by your login system
    let userId = localStorage.getItem('id') || 
                 localStorage.getItem('user_id') || 
                 localStorage.getItem('userId') || 
                 localStorage.getItem('currentUserId');
    
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('localStorage contents:', {...localStorage});
    console.log('Retrieved userId from localStorage:', userId);

    if (!userId) {
      console.log('No user ID found in localStorage. User not logged in.');
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = '';
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
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = '';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const firstName = data.first_name || '';
    console.log('User data fetched successfully:', { userName, role: data.role_name, firstName });
    
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || '';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    // ensure localStorage has current user id
    localStorage.setItem('id', data.id);
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

// call on load (always attempt to populate UI)
loadUserDetails();

// Listen for storage changes to detect login/logout from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'id') {
    console.log('User login state changed in another tab');
    loadUserDetails();
    // Refresh calendar to show user-specific reservations
    renderCalendar(currentDate);
  }
});

async function renderCalendar(date) {
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

    day.innerHTML = `
      <div class="day-number">${d}</div>
      <div class="events"></div>
    `;

    // Get reservations for this day from database
    try {
      const reservations = await getReservationsForDay(year, month, d);

      if (reservations.length > 0) {
        day.classList.add("booked");
        // Show all reservations for this day (facility, event title, time)
        day.querySelector('.events').innerHTML = reservations.map(r =>
          `<div>
            <strong>${r.facility || 'Unknown Facility'}</strong><br>
            <span>${r.title_of_the_event || ''}</span><br>
            <span>${formatTime12hr(r.time_start)} - ${formatTime12hr(r.time_end)}</span>
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
    } catch (err) {
      console.error('Error loading reservations for day', d, ':', err);
      // Still allow clicking even if there's an error loading reservations
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

async function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  await renderCalendar(currentDate);
}

async function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  await renderCalendar(currentDate);
}

// Initialize calendar when page loads
(async function initCalendar() {
  await renderCalendar(currentDate);
})();

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