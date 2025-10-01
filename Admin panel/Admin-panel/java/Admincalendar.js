const monthYear = document.getElementById('monthYear');
const daysContainer = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

let currentDate = new Date();
let events = JSON.parse(localStorage.getItem('calendarEvents') || '{}');
let supabaseEvents = {}; // Store approved reservations from Supabase

// Fetch approved reservations from Supabase
async function fetchApprovedReservations() {
  if (typeof window.supabaseClient !== 'undefined') {
    const sb = window.supabaseClient;
    const { data, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, id') // <-- use id, not user_id
      .eq('status', 'approved');
    if (error) {
      console.error('Error fetching approved reservations:', error);
      return {};
    }
    // Group by date
    const grouped = {};
    (data || []).forEach(ev => {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push({
        title: ev.title_of_the_event,
        facility: ev.facility,
        startTime: ev.time_start,
        endTime: ev.time_end,
        person: ev.id // <-- use id for user reference
      });
    });
    return grouped;
  }
  return {};
}

// Merge manual and Supabase events
async function getAllEvents() {
  supabaseEvents = await fetchApprovedReservations();
  // Merge: Supabase events take priority for approved slots
  const merged = { ...events };
  Object.keys(supabaseEvents).forEach(dateStr => {
    if (!merged[dateStr]) merged[dateStr] = [];
    // Avoid duplicates: only add if not already present
    supabaseEvents[dateStr].forEach(ev => {
      const exists = merged[dateStr].some(e =>
        e.facility === ev.facility &&
        e.startTime === ev.startTime &&
        e.endTime === ev.endTime &&
        e.title === ev.title
      );
      if (!exists) merged[dateStr].push(ev);
    });
  });
  return merged;
}

async function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();

  monthYear.textContent = `${firstDayOfMonth.toLocaleString('default', { month: 'long' })} ${year}`;
  daysContainer.innerHTML = '';
  const allEvents = await getAllEvents();

  for (let i = 0; i < startDay; i++) {
    daysContainer.innerHTML += `<div></div>`;
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.innerHTML = `<span>${day}</span>`;

    if (allEvents[dateStr]) {
      const ul = document.createElement('ul');
      ul.className = 'event-list';
      // Sort events by start time
      const sortedEvents = [...allEvents[dateStr]].sort((a, b) => convertTo24Hour(a.startTime) - convertTo24Hour(b.startTime));
      sortedEvents.forEach((ev, index) => {
        const li = document.createElement('li');
        li.className = 'event';
        li.textContent = `${ev.facility} - ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)} - ${ev.person} (${ev.title})`;
        li.title = 'Click to remove';
        li.style.cursor = 'pointer';
        li.onclick = (e) => {
          e.stopPropagation();
          confirmDeleteEvent(dateStr, index);
        };
        ul.appendChild(li);
      });
      cell.appendChild(ul);
    }

    cell.addEventListener('click', () => openEventModal(dateStr));
    daysContainer.appendChild(cell);
  }
}

function convertTo24Hour(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  let [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function openEventModal(dateStr) {
  const modalHtml = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>Add Event - ${dateStr}</h3>
        <label>Event Title (e.g., Campus Week, CET Webinar):</label>
        <input type="text" id="title">
        <label>Facility:</label>
        <input type="text" id="facility">
        <label>Start Time:</label>
        <input type="time" id="startTime">
        <label>End Time:</label>
        <input type="time" id="endTime">
        <label>Reserved By:</label>
        <input type="text" id="person">
        <label>Duration (days):</label>
        <input type="number" id="duration" min="1" value="1">
        <div class="modal-buttons">
          <button onclick="saveEvent('${dateStr}')">Save</button>
          <button onclick="closeModal()">Cancel</button>
        </div>
      </div>
    </div>
  `;
  const modal = document.createElement('div');
  modal.innerHTML = modalHtml;
  modal.id = 'eventModal';
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.remove();
}

function saveEvent(startDateStr) {
  const title = document.getElementById('title').value.trim();
  const facility = document.getElementById('facility').value.trim();
  const startTime = document.getElementById('startTime').value.trim();
  const endTime = document.getElementById('endTime').value.trim();
  const person = document.getElementById('person').value.trim();
  const duration = parseInt(document.getElementById('duration').value);

  if (!title || !facility || !startTime || !endTime || !person || isNaN(duration) || duration < 1) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const startDate = new Date(startDateStr);

  for (let i = 0; i < duration; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const newEvent = { title, facility, startTime, endTime, person };
    if (!events[dateStr]) events[dateStr] = [];
    events[dateStr].push(newEvent);
  }

  localStorage.setItem('calendarEvents', JSON.stringify(events));
  closeModal();
  renderCalendar(currentDate);
}

function confirmDeleteEvent(dateStr, index) {
  const modalHtml = `
    <div class="delete-modal-overlay">
      <div class="delete-modal">
        <h4>Delete Event?</h4>
        <p>Are you sure you want to remove this event?</p>
        <div class="delete-modal-buttons">
          <button class="confirm" onclick="deleteEvent('${dateStr}', ${index})">Yes, Delete</button>
          <button class="cancel" onclick="closeDeleteModal()">Cancel</button>
        </div>
      </div>
    </div>
  `;
  const modal = document.createElement('div');
  modal.innerHTML = modalHtml;
  modal.id = 'deleteModal';
  document.body.appendChild(modal);
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) modal.remove();
}

function deleteEvent(dateStr, index) {
  events[dateStr].splice(index, 1);
  if (events[dateStr].length === 0) delete events[dateStr];
  localStorage.setItem('calendarEvents', JSON.stringify(events));
  closeDeleteModal();
  renderCalendar(currentDate);
}

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

renderCalendar(currentDate);

// Refresh calendar every 30 seconds to show new approved reservations
setInterval(() => renderCalendar(currentDate), 30000);
