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
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, id')
      .eq('status', 'approved');
    if (error) {
      console.error('Error fetching approved reservations:', error);
      return {};
    }
    const userIds = Array.from(new Set((reservations || []).map(ev => ev.id).filter(Boolean)));
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await sb
        .from('users')
        .select('id, first_name')
        .in('id', userIds);
      if (!usersErr && users && users.length) {
        usersMap = users.reduce((m, u) => {
          m[u.id] = u.first_name || u.id;
          return m;
        }, {});
      }
    }
    const grouped = {};
    (reservations || []).forEach(ev => {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push({
        id: `sb-${ev.id}-${ev.date}-${ev.time_start || ''}`,
        title: ev.title_of_the_event,
        facility: ev.facility,
        startTime: ev.time_start,
        endTime: ev.time_end,
        person: usersMap[ev.id] || ev.id,
        source: 'supabase'
      });
    });
    return grouped;
  }
  return {};
}

// Merge manual and Supabase events (unchanged logic)
async function getAllEvents() {
  supabaseEvents = await fetchApprovedReservations();
  const merged = { ...events };
  Object.keys(supabaseEvents).forEach(dateStr => {
    if (!merged[dateStr]) merged[dateStr] = [];
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

// Save event must add id and source
async function saveEvent(startDateStr) {
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

  const facilityColor = getFacilityColor(facility);

  const startDate = new Date(startDateStr);

  for (let i = 0; i < duration; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const newEvent = {
      id: `m-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      title,
      facility,
      facilityColor,
      startTime,
      endTime,
      person,
      source: 'manual'
    };
    if (!events[dateStr]) events[dateStr] = [];
    events[dateStr].push(newEvent);

    // Save to Supabase manual_events table
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      console.error('Supabase client not available');
      return;
    }

    const eventData = {
      facility: facility, // Use facility directly
      date: dateStr,
      time_start: startTime,
      time_end: endTime,
      title_of_the_event: title
    };

    const { data, error } = await supabaseClient
      .from('manual_events')
      .insert([eventData]);

    if (error) {
      console.error('Error saving event to Supabase:', error);
    } else {
      console.log('Event saved successfully:', data);
    }
  }

  localStorage.setItem('calendarEvents', JSON.stringify(events));
  closeModal();
  renderCalendar(currentDate);
}

function convertTo24Hour(timeStr) {
  // Handle missing or empty times gracefully
  if (!timeStr) return 0;
  // If time includes AM/PM, strip that and parse
  const clean = String(timeStr).trim().split(' ')[0];
  const parts = clean.split(':').map(Number);
  const hour = parts[0] || 0;
  const minute = parts[1] || 0;
  return hour * 60 + minute;
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
        <select id="facility" onchange="updateFacilityColor(this)">
          <option value="">Select a facility...</option>
          <option value="Palma Hall" data-color="#FFCC00">Palma Hall</option>
          <option value="Right Wing Lobby" data-color="#A1C181">Right Wing Lobby</option>
          <option value="Mehan Garden" data-color="#E8E288">Mehan Garden</option>
          <option value="Rooftop" data-color="#92DCE5">Rooftop</option>
          <option value="Classroom" data-color="#FFDCC1">Classroom</option>
          <option value="Basketball Court" data-color="#A7C6ED">Basketball Court</option>
          <option value="Ground Floor Space" data-color="#FFABAB">Ground Floor Space</option>
          <option value="Others" data-color="#CCCCCC">Others</option>
        </select>
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

function getFacilityColor(facilityName) {
  const colorMap = {
    'Palma Hall': '#FFCC00',
    'Right Wing Lobby': '#A1C181', 
    'Mehan Garden': '#E8E288',
    'Rooftop': '#92DCE5',
    'Classroom': '#FFDCC1',
    'Basketball Court': '#A7C6ED',
    'Ground Floor Space': '#FFABAB',
    'Others': '#CCCCCC'
  };
  return colorMap[facilityName] || '#CCCCCC';
}

function updateFacilityColor(select) {
  const color = select.options[select.selectedIndex].dataset.color;
  select.style.backgroundColor = color;
  select.style.color = getContrastColor(color);
}

function getContrastColor(hexcolor) {
  // Convert hex to RGB
  const r = parseInt(hexcolor.substr(1,2), 16);
  const g = parseInt(hexcolor.substr(3,2), 16);
  const b = parseInt(hexcolor.substr(5,2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function openEventModal(dateStr) {
  const modalHtml = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>Add Event - ${dateStr}</h3>
        <label>Event Title (e.g., Campus Week, CET Webinar):</label>
        <input type="text" id="title">
        <label>Facility:</label>
        <select id="facility" onchange="updateFacilityColor(this)">
          <option value="">Select a facility...</option>
          <option value="Palma Hall" data-color="#FFCC00">Palma Hall</option>
          <option value="Right Wing Lobby" data-color="#A1C181">Right Wing Lobby</option>
          <option value="Mehan Garden" data-color="#E8E288">Mehan Garden</option>
          <option value="Rooftop" data-color="#92DCE5">Rooftop</option>
          <option value="Classroom" data-color="#FFDCC1">Classroom</option>
          <option value="Basketball Court" data-color="#A7C6ED">Basketball Court</option>
          <option value="Ground Floor Space" data-color="#FFABAB">Ground Floor Space</option>
          <option value="Others" data-color="#CCCCCC">Others</option>
        </select>
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

// Render calendar - attach manual handlers (same approach as Admincalendar.js)
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
      const sortedEvents = [...allEvents[dateStr]].sort((a, b) => convertTo24Hour(a.startTime) - convertTo24Hour(b.startTime));
      sortedEvents.forEach((ev, index) => {
        const li = document.createElement('li');
        li.className = 'event';
        li.textContent = `${ev.facility} - ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)} - ${ev.person} (${ev.title})`;
        li.title = ev.source === 'manual' ? 'Click to edit / duplicate / delete' : 'Approved event';
        li.style.cursor = 'pointer';
        li.style.backgroundColor = getFacilityColor(ev.facility);
        li.style.color = getContrastColor(getFacilityColor(ev.facility));
        if (ev.source === 'manual') {
          li.onclick = (e) => { e.stopPropagation(); openManualEventOptions(dateStr, index, e.currentTarget); };
        } else {
          li.onclick = (e) => { e.stopPropagation(); viewSupabaseEvent(ev); };
        }
        ul.appendChild(li);
      });
      cell.appendChild(ul);
    }

    cell.addEventListener('click', () => openEventModal(dateStr));
    daysContainer.appendChild(cell);
  }
}

// Copy the same helper functions used in Admincalendar.js: openManualEventOptions, closeManualOptions,
// viewSupabaseEvent, openEditModal, saveEditedEvent, openDuplicateModal, confirmDuplicate, confirmDeleteEvent,
// closeDeleteModal, closeEditModal, closeDuplicateModal

function openManualEventOptions(dateStr, index, targetEl) {
  closeManualOptions();
  getAllEvents().then(all => {
    const ev = all[dateStr] && all[dateStr][index];
    if (!ev) return;

    const modal = document.createElement('div');
    modal.className = 'event-options-modal';
    modal.innerHTML = `
      <div class="event-options-inner">
        <div class="eo-title">${escapeHtml(ev.title)}</div>
        <div class="eo-info">${escapeHtml(ev.facility)} — ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)}</div>
        <div class="eo-person">Reserved by: ${escapeHtml(ev.person)}</div>
        <div class="eo-actions">
          <button class="eo-btn eo-edit">Edit</button>
          <button class="eo-btn eo-dup">Duplicate</button>
          <button class="eo-btn eo-del">Delete</button>
          <button class="eo-btn eo-close">Close</button>
        </div>
      </div>
      <div class="eo-arrow"></div>
    `;
    document.body.appendChild(modal);

    const rect = targetEl.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const padding = 8;
    let top = window.scrollY + rect.top - modalRect.height - padding;
    let left = window.scrollX + rect.left + (rect.width / 2) - (modalRect.width / 2);

    if (top < window.scrollY + 10) {
      top = window.scrollY + rect.bottom + padding;
      modal.classList.add('below');
    }
    if (left < 10) left = 10;
    if (left + modalRect.width > window.scrollX + document.documentElement.clientWidth - 10) {
      left = window.scrollX + document.documentElement.clientWidth - modalRect.width - 10;
    }

    modal.style.left = `${left}px`;
    modal.style.top = `${top}px`;

    modal.querySelector('.eo-close').onclick = () => closeManualOptions();
    modal.querySelector('.eo-edit').onclick = () => { closeManualOptions(); openEditModal(dateStr, index); };
    modal.querySelector('.eo-dup').onclick = () => { closeManualOptions(); openDuplicateModal(dateStr, index); };
    modal.querySelector('.eo-del').onclick = () => { closeManualOptions(); confirmDeleteEvent(dateStr, index); };

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    function handleOutsideClick(e) {
      if (!modal.contains(e.target)) closeManualOptions();
    }
    modal._outsideHandler = handleOutsideClick;
  });
}

function closeManualOptions() {
  const existing = document.querySelectorAll('.event-options-modal');
  existing.forEach(m => {
    if (m._outsideHandler) document.removeEventListener('click', m._outsideHandler);
    m.remove();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function viewSupabaseEvent(ev) {
  const modalHtml = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>Event Details</h3>
        <p><strong>Title:</strong> ${ev.title}</p>
        <p><strong>Facility:</strong> ${ev.facility}</p>
        <p><strong>Time:</strong> ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)}</p>
        <p><strong>Reserved By:</strong> ${ev.person}</p>
        <p><strong>Source:</strong> Approved Reservation</p>
        <div class="modal-buttons">
          <button onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>
  `;
  const modal = document.createElement('div');
  modal.innerHTML = modalHtml;
  modal.id = 'eventModal';
  document.body.appendChild(modal);
}

function openEditModal(dateStr, index) {
  const event = events[dateStr][index];
  const modalHtml = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>Edit Event - ${dateStr}</h3>
        <label>Event Title:</label>
        <input type="text" id="editTitle" value="${event.title}">
        <label>Facility:</label>
        <select id="editFacility" onchange="updateFacilityColor(this)">
          <option value="">Select a facility...</option>
          <option value="Palma Hall" data-color="#FFCC00" ${event.facility === 'Palma Hall' ? 'selected' : ''}>Palma Hall</option>
          <option value="Right Wing Lobby" data-color="#A1C181" ${event.facility === 'Right Wing Lobby' ? 'selected' : ''}>Right Wing Lobby</option>
          <option value="Mehan Garden" data-color="#E8E288" ${event.facility === 'Mehan Garden' ? 'selected' : ''}>Mehan Garden</option>
          <option value="Rooftop" data-color="#92DCE5" ${event.facility === 'Rooftop' ? 'selected' : ''}>Rooftop</option>
          <option value="Classroom" data-color="#FFDCC1" ${event.facility === 'Classroom' ? 'selected' : ''}>Classroom</option>
          <option value="Basketball Court" data-color="#A7C6ED" ${event.facility === 'Basketball Court' ? 'selected' : ''}>Basketball Court</option>
          <option value="Ground Floor Space" data-color="#FFABAB" ${event.facility === 'Ground Floor Space' ? 'selected' : ''}>Ground Floor Space</option>
          <option value="Others" data-color="#CCCCCC" ${event.facility === 'Others' ? 'selected' : ''}>Others</option>
        </select>
        <label>Start Time:</label>
        <input type="time" id="editStartTime" value="${event.startTime}">
        <label>End Time:</label>
        <input type="time" id="editEndTime" value="${event.endTime}">
        <label>Reserved By:</label>
        <input type="text" id="editPerson" value="${event.person}">
        <label>Duration (days):</label>
        <input type="number" id="editDuration" min="1" value="1">
        <div class="modal-buttons">
          <button onclick="saveEditedEvent('${dateStr}', ${index})">Save Changes</button>
          <button onclick="closeEditModal()">Cancel</button>
        </div>
      </div>
    </div>
  `;
  const modal = document.createElement('div');
  modal.innerHTML = modalHtml;
  modal.id = 'eventModal';
  document.body.appendChild(modal);
  
  // Set initial color of facility select
  const facilitySelect = document.getElementById('editFacility');
  updateFacilityColor(facilitySelect);
}

function closeEditModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.remove();
}

function saveEditedEvent(dateStr, index) {
  const title = document.getElementById('editTitle').value.trim();
  const facility = document.getElementById('editFacility').value.trim();
  const startTime = document.getElementById('editStartTime').value.trim();
  const endTime = document.getElementById('editEndTime').value.trim();
  const person = document.getElementById('editPerson').value.trim();
  const duration = parseInt(document.getElementById('editDuration').value);

  if (!title || !facility || !startTime || !endTime || !person || isNaN(duration) || duration < 1) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const updatedEvent = {
    id: events[dateStr][index].id,
    title,
    facility,
    startTime,
    endTime,
    person,
    source: 'manual'
  };

  events[dateStr][index] = updatedEvent;
  localStorage.setItem('calendarEvents', JSON.stringify(events));
  closeEditModal();
  renderCalendar(currentDate);
}

function openDuplicateModal(dateStr, index) {
  closeManualOptions();
  getAllEvents().then(all => {
    const ev = all[dateStr] && all[dateStr][index];
    if (!ev || ev.source !== 'manual') { alert('Cannot duplicate this event'); return; }
    const modalHtml = `
      <div class="modal-overlay" id="duplicateModal">
        <div class="modal-content">
          <h3>Duplicate Event</h3>
          <p><strong>${escapeHtml(ev.title)}</strong></p>
          <label>Target Start Date:</label>
          <input type="date" id="dup_startDate">
          <label>Duration (days):</label>
          <input type="number" id="dup_duration" min="1" value="1">
          <div class="modal-buttons">
            <button onclick="confirmDuplicate('${dateStr}', ${index})">Duplicate</button>
            <button onclick="closeDuplicateModal()">Cancel</button>
          </div>
        </div>
      </div>
    `;
    const modal = document.createElement('div');
    modal.innerHTML = modalHtml;
    modal.id = 'duplicateWrapper';
    document.body.appendChild(modal);
    // focus date input for convenience
    setTimeout(() => document.getElementById('dup_startDate')?.focus(), 50);
  });
}

function closeDuplicateModal() {
  const modal = document.getElementById('duplicateWrapper');
  if (modal) modal.remove();
}

function confirmDuplicate(origDateStr, index) {
  const targetDate = document.getElementById('dup_startDate')?.value;
  const duration = parseInt(document.getElementById('dup_duration')?.value || '0', 10);
  if (!targetDate || isNaN(duration) || duration < 1) { alert('Provide a valid target date and duration'); return; }

  getAllEvents().then(all => {
    const ev = all[origDateStr] && all[origDateStr][index];
    if (!ev || ev.source !== 'manual') { alert('Cannot duplicate this event'); return; }

    const startDate = new Date(targetDate);
    for (let i = 0; i < duration; i++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + i);
      const newDateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const duplicatedEvent = {
        id: `m-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        title: ev.title,
        facility: ev.facility,
        startTime: ev.startTime,
        endTime: ev.endTime,
        person: ev.person,
        source: 'manual'
      };
      if (!events[newDateStr]) events[newDateStr] = [];
      events[newDateStr].push(duplicatedEvent);
    }

    localStorage.setItem('calendarEvents', JSON.stringify(events));
    closeDuplicateModal();
    renderCalendar(currentDate);
  });
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
