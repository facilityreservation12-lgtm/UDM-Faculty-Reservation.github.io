const monthYear = document.getElementById('monthYear');
const daysContainer = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

let currentDate = new Date();
let events = JSON.parse(localStorage.getItem('calendarEvents') || '{}');
let supabaseEvents = {};

// Helper function to get current user ID
async function getCurrentUserId() {
  try {
    // Method 1: Check localStorage for 'user_id' key directly
    const userIdDirect = localStorage.getItem('user_id');
    if (userIdDirect) {
      console.log('Found user ID in localStorage.user_id:', userIdDirect);
      return userIdDirect;
    }

    // Method 2: Check localStorage for 'id' key
    const idDirect = localStorage.getItem('id');
    if (idDirect) {
      console.log('Found user ID in localStorage.id:', idDirect);
      return idDirect;
    }

    // Method 3: Try localStorage currentUser object
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) {
          console.log('Found user ID in localStorage.currentUser:', parsed.id);
          return parsed.id;
        }
        if (parsed?.user_id) {
          console.log('Found user ID in localStorage.currentUser.user_id:', parsed.user_id);
          return parsed.user_id;
        }
      } catch (e) {
        console.warn('Error parsing localStorage currentUser:', e);
      }
    }

    // Method 4: Try window.currentUser
    if (window.currentUser?.id) {
      console.log('Found user ID in window.currentUser.id:', window.currentUser.id);
      return window.currentUser.id;
    }
    if (window.currentUser?.user_id) {
      console.log('Found user ID in window.currentUser.user_id:', window.currentUser.user_id);
      return window.currentUser.user_id;
    }

    // Method 5: Try sessionStorage
    const sessionUserId = sessionStorage.getItem('user_id');
    if (sessionUserId) {
      console.log('Found user ID in sessionStorage.user_id:', sessionUserId);
      return sessionUserId;
    }

    const sessionId = sessionStorage.getItem('id');
    if (sessionId) {
      console.log('Found user ID in sessionStorage.id:', sessionId);
      return sessionId;
    }

    // Method 6: Try Supabase client
    const supabaseClient = window.supabaseClient;
    if (supabaseClient) {
      // Try to get from session
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (!sessionError && session?.user?.id) {
        console.log('Found user ID in Supabase session:', session.user.id);
        return session.user.id;
      }

      // Try to get from user
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && user?.id) {
        console.log('Found user ID in Supabase user:', user.id);
        return user.id;
      }
    }

    console.error('No user ID found in any location');
    return null;
  } catch (err) {
    console.error('Error getting user ID:', err);
    return null;
  }
}

// Fetch approved reservations from Supabase
async function fetchApprovedReservations() {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.warn('Supabase client not available');
      return {};
    }

    const sb = window.supabaseClient;
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, id')
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching approved reservations:', error);
      return {};
    }

    if (!reservations || reservations.length === 0) {
      return {};
    }

    const userIds = Array.from(new Set(reservations.map(ev => ev.id).filter(Boolean)));
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
    reservations.forEach(ev => {
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
  } catch (err) {
    console.error('Unexpected error fetching reservations:', err);
    return {};
  }
}

// Merge manual and Supabase events
async function getAllEvents() {
  try {
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
  } catch (err) {
    console.error('Error merging events:', err);
    return { ...events };
  }
}

// Save event - FIXED: Auto-generate ID, user ID in reserved_by only
async function saveEvent(startDateStr) {
  const title = document.getElementById('title').value.trim();
  const facility = document.getElementById('facility').value.trim();
  const startTime = document.getElementById('startTime').value.trim();
  const endTime = document.getElementById('endTime').value.trim();
  const person = document.getElementById('person').value.trim();
  const duration = parseInt(document.getElementById('duration').value);

  if (!title || !facility || !startTime || !endTime || !person || isNaN(duration) || duration < 1) {
    showCustomAlert('Validation Error', 'Please fill in all fields correctly.', 'warning');
    return;
  }

  try {
    const supabaseClient = window.supabaseClient;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.error('User ID detection failed. Debug info:');
      console.log('localStorage.currentUser:', localStorage.getItem('currentUser'));
      console.log('window.currentUser:', window.currentUser);
      console.log('sessionStorage.currentUser:', sessionStorage.getItem('currentUser'));
      
      showCustomConfirm('Debug Information', 'Unable to get user ID. Click OK to see debug info in console, or Cancel to go back.', () => {
        console.log('=== DEBUG INFO ===');
        console.log('All localStorage:', { ...localStorage });
        console.log('All window properties with "user":', Object.keys(window).filter(k => k.toLowerCase().includes('user')));
      });
      return;
    }
    
    console.log('Using user ID:', userId);

    if (!supabaseClient) {
      showCustomAlert('Connection Error', 'Supabase client not available. Cannot save event.', 'error');
      return;
    }

    const startDate = new Date(startDateStr);
    const savedEvents = [];
    
    for (let i = 0; i < duration; i++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + i);
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      
      const eventId = `manual-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Save to Supabase with auto-generated ID and user ID in reserved_by
      try {
        const { data, error } = await supabaseClient
          .from('manual_events')
          .insert([{
            facility: facility,
            date: dateStr,
            time_start: startTime,
            time_end: endTime,
            title_of_the_event: title,
            reserved_by: userId
          }])
          .select();

        if (error) {
          console.error('Error saving to Supabase:', error);
          showCustomAlert('Database Error', 'Error saving to database: ' + error.message, 'error');
          return;
        }
        
        console.log('Successfully saved to Supabase:', data);
      } catch (dbErr) {
        console.error('Database error:', dbErr);
        showCustomAlert('Database Error', 'Database error: ' + dbErr.message, 'error');
        return;
      }

      const newEvent = {
        id: eventId,
        title,
        facility,
        startTime,
        endTime,
        person,
        source: 'manual'
      };
      
      if (!events[dateStr]) events[dateStr] = [];
      events[dateStr].push(newEvent);
      savedEvents.push(dateStr);
    }

    localStorage.setItem('calendarEvents', JSON.stringify(events));
    closeModal();
    renderCalendar(currentDate);
    showCustomAlert('Success', 'Event saved successfully!', 'success');

  } catch (err) {
    showCustomAlert('Error', 'Error saving event: ' + err.message, 'error');
    console.error('Save event error:', err);
  }
}

// Save edited event - FIXED: Update using reserved_by
async function saveEditedEvent(dateStr, index) {
  const title = document.getElementById('editTitle').value.trim();
  const facility = document.getElementById('editFacility').value.trim();
  const startTime = document.getElementById('editStartTime').value.trim();
  const endTime = document.getElementById('editEndTime').value.trim();
  const person = document.getElementById('editPerson').value.trim();

  if (!title || !facility || !startTime || !endTime || !person) {
    showCustomAlert('Validation Error', 'Please fill in all fields correctly.', 'warning');
    return;
  }

  try {
    const supabaseClient = window.supabaseClient;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      showCustomAlert('Authentication Error', 'Unable to get user ID. Please make sure you are logged in.', 'error');
      return;
    }
    
    const originalEvent = events[dateStr][index];
    if (!originalEvent) {
      throw new Error('Event not found.');
    }
    
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('manual_events')
          .update({
            facility: facility,
            time_start: startTime,
            time_end: endTime,
            title_of_the_event: title
          })
          .eq('reserved_by', userId)
          .eq('date', dateStr)
          .eq('time_start', originalEvent.startTime)
          .eq('facility', originalEvent.facility)
          .select();

        if (error) {
          console.error('Error updating in Supabase:', error);
          showCustomAlert('Database Error', 'Error updating in database: ' + error.message, 'error');
          return;
        }
        
        console.log('Successfully updated in Supabase:', data);
      } catch (dbErr) {
        console.error('Database error:', dbErr);
        showCustomAlert('Database Error', 'Database error: ' + dbErr.message, 'error');
        return;
      }
    }

    const updatedEvent = {
      id: originalEvent.id,
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
    showCustomAlert('Success', 'Event updated successfully!', 'success');

  } catch (err) {
    showCustomAlert('Error', 'Error updating event: ' + err.message, 'error');
    console.error('Update event error:', err);
  }
}

// Duplicate event - FIXED: Auto-generate ID, user ID in reserved_by
async function confirmDuplicate(origDateStr, index) {
  const targetDate = document.getElementById('dup_startDate')?.value;
  const duration = parseInt(document.getElementById('dup_duration')?.value || '0', 10);
  
  if (!targetDate || isNaN(duration) || duration < 1) { 
    showCustomAlert('Validation Error', 'Provide a valid target date and duration', 'warning'); 
    return; 
  }

  try {
    const supabaseClient = window.supabaseClient;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      showCustomAlert('Authentication Error', 'Unable to get user ID. Please make sure you are logged in.', 'error');
      return;
    }
    
    const all = await getAllEvents();
    const ev = all[origDateStr] && all[origDateStr][index];
    if (!ev || ev.source !== 'manual') { 
      showCustomAlert('Error', 'Cannot duplicate this event', 'error'); 
      return; 
    }

    const startDate = new Date(targetDate);
    
    for (let i = 0; i < duration; i++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + i);
      const newDateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      
      const eventId = `manual-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('manual_events')
            .insert([{
              facility: ev.facility,
              date: newDateStr,
              time_start: ev.startTime,
              time_end: ev.endTime,
              title_of_the_event: ev.title,
              reserved_by: userId
            }])
            .select();

          if (error) {
            console.error('Error duplicating to Supabase:', error);
            showCustomAlert('Database Error', 'Error duplicating to database: ' + error.message, 'error');
            return;
          }
          
          console.log('Successfully duplicated to Supabase:', data);
        } catch (dbErr) {
          console.error('Database error:', dbErr);
          showCustomAlert('Database Error', 'Database error: ' + dbErr.message, 'error');
          return;
        }
      }

      const duplicatedEvent = {
        id: eventId,
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
    showCustomAlert('Success', 'Event duplicated successfully!', 'success');

  } catch (err) {
    showCustomAlert('Error', 'Error duplicating event: ' + err.message, 'error');
    console.error('Duplicate event error:', err);
  }
}

// Delete event - FIXED: Delete using reserved_by
async function deleteEvent(dateStr, index) {
  try {
    const supabaseClient = window.supabaseClient;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      showCustomAlert('Authentication Error', 'Unable to get user ID. Please make sure you are logged in.', 'error');
      return;
    }
    
    const eventToDelete = events[dateStr]?.[index];
    if (!eventToDelete) {
      throw new Error('Event not found.');
    }
    
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('manual_events')
          .delete()
          .eq('reserved_by', userId)
          .eq('date', dateStr)
          .eq('time_start', eventToDelete.startTime)
          .eq('facility', eventToDelete.facility)
          .eq('title_of_the_event', eventToDelete.title);

        if (error) {
          console.error('Error deleting from Supabase:', error);
          showCustomAlert('Database Error', 'Error deleting from database: ' + error.message, 'error');
          return;
        }
        
        console.log('Successfully deleted from Supabase');
      } catch (dbErr) {
        console.error('Database error:', dbErr);
        showCustomAlert('Database Error', 'Database error: ' + dbErr.message, 'error');
        return;
      }
    }

    events[dateStr].splice(index, 1);
    if (events[dateStr].length === 0) delete events[dateStr];
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    closeDeleteModal();
    renderCalendar(currentDate);
    showCustomAlert('Success', 'Event deleted successfully!', 'success');

  } catch (err) {
    showCustomAlert('Error', 'Error deleting event: ' + err.message, 'error');
    console.error('Delete event error:', err);
    closeDeleteModal();
  }
}

function convertTo24Hour(timeStr) {
  if (!timeStr) return 0;
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
  const r = parseInt(hexcolor.substr(1,2), 16);
  const g = parseInt(hexcolor.substr(3,2), 16);
  const b = parseInt(hexcolor.substr(5,2), 16);
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
        <div class="eo-info">${escapeHtml(ev.facility)} – ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)}</div>
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
  
  const facilitySelect = document.getElementById('editFacility');
  updateFacilityColor(facilitySelect);
}

function closeEditModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.remove();
}

function openDuplicateModal(dateStr, index) {
  closeManualOptions();
  getAllEvents().then(all => {
    const ev = all[dateStr] && all[dateStr][index];
    if (!ev || ev.source !== 'manual') { showCustomAlert('Error', 'Cannot duplicate this event', 'error'); return; }
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
    setTimeout(() => document.getElementById('dup_startDate')?.focus(), 50);
  });
}

function closeDuplicateModal() {
  const modal = document.getElementById('duplicateWrapper');
  if (modal) modal.remove();
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

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

renderCalendar(currentDate);
setInterval(() => renderCalendar(currentDate), 30000);