const facilityCodes = {
  "Palma Hall": "PH",
  "Right Wing Lobby": "RW",
  "Mehan Garden": "MG",
  "Rooftop": "RT",
  "Classroom": "CR",
  "Basketball Court": "BC",
  "Ground Floor Space": "GF",
  "Space at the Ground Floor": "GF",
  "Others": "OT"
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function toYMD(dateOrString) {
  if (!dateOrString) return null;
  const d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
  if (isNaN(d)) return null;
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function facilityListFromString(s) {
  if (!s) return [];
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function getLocalDatetimeLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function getCodePrefix(fac) {
  if (!fac) return "PH";
  if (facilityCodes[fac]) return facilityCodes[fac];
  const f = fac.toLowerCase();
  if (f.includes("palma")) return "PH";
  if (f.includes("right wing") || f.includes("rightwing") || f.includes("right")) return "RW";
  if (f.includes("mehan")) return "MG";
  if (f.includes("rooftop")) return "RT";
  if (f.includes("classroom") || f.includes("room")) return "CR";
  if (f.includes("basket") || f.includes("court")) return "BC";
  if (f.includes("ground") || f.includes("floor")) return "GF";
  return "PH";
}

// Initialize Supabase client from the global variable
const supabase = window.supabaseClient;

document.addEventListener('DOMContentLoaded', function() {
  // Dropdown logic
  document.querySelectorAll('.dropdown-btn').forEach(btn => {
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      this.parentElement.classList.toggle('active');
    });
  });

  window.addEventListener('click', function (e) {
    document.querySelectorAll('.dropdown').forEach(drop => {
      if (!drop.contains(e.target)) drop.classList.remove('active');
    });
  });

  // Calendar date click -> Date of Event
  document.querySelectorAll('.calendar-date-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', function () {
      selectDateFromCalendar(this.dataset.date);
    });
  });

  const reservationForm = document.getElementById('reservationForm');
  if (!reservationForm) return;

  const dateFiledInput = reservationForm.querySelector('input[name="dateFiled"], input#dateFiled, input[id="dateFiled"]');
  const dateReceivedInput = reservationForm.querySelector('input[name="dateReceived"], input#dateReceived, input[id="dateReceived"]');
  const dateOfEventInput = reservationForm.querySelector('input[name="dateOfEvent"], input#dateOfEvent, input[id="dateOfEvent"]');
  const timeStartInput = reservationForm.querySelector('input[name="timeStart"], input#timeStart, input[id="timeStart"]');
  const timeEndInput = reservationForm.querySelector('input[name="timeEnd"], input#timeEnd, input[id="timeEnd"]');
  const eventTitleInput = reservationForm.querySelector('input[name="eventTitle"], textarea[name="eventTitle"], #eventTitle');

  const todayYMD = toYMD(new Date());
  if (dateFiledInput) {
    dateFiledInput.value = todayYMD;
    dateFiledInput.readOnly = true;
  }
  if (dateReceivedInput) {
    dateReceivedInput.value = getLocalDatetimeLocal();
    dateReceivedInput.readOnly = true;
  }

  // If coming from calendar page, fill date of event
  const rawSelectedDate = localStorage.getItem('selectedDate');
  if (rawSelectedDate && dateOfEventInput) {
    const normalized = toYMD(rawSelectedDate) || rawSelectedDate;
    dateOfEventInput.value = normalized;
    localStorage.removeItem('selectedDate');
  }

  // Form submission
  reservationForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;

    // Facilities
    let selectedFacilities = Array.from(form.querySelectorAll('input[name="facility"]:checked')).map(i => i.value.trim());
    if (selectedFacilities.length === 0) {
      const facilitySelect = form.querySelector('select[name="facility"], select#facility');
      if (facilitySelect && facilitySelect.value) selectedFacilities = [facilitySelect.value.trim()];
    }
    if (selectedFacilities.length === 0) {
      alert("Please select a facility.");
      return;
    }

    // Date of Event
    const dateOfEventVal = dateOfEventInput && dateOfEventInput.value ? toYMD(dateOfEventInput.value) : null;
    if (!dateOfEventVal) {
      alert("Please choose a valid Date of Event.");
      return;
    }

    // Time validation
    const newStart = parseTimeToMinutes(timeStartInput && timeStartInput.value ? timeStartInput.value : null);
    const newEnd = parseTimeToMinutes(timeEndInput && timeEndInput.value ? timeEndInput.value : null);
    if (newStart === null || newEnd === null) {
      alert("Please provide valid start and end times (HH:MM).");
      return;
    }
    if (newStart >= newEnd) {
      alert("Start time must be earlier than end time.");
      return;
    }

    // Check conflicts
    let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
    for (let facility of selectedFacilities) {
      const conflict = reservations.some(r => {
        const rDate = toYMD(r.dateOfEvent) || r.dateOfEvent;
        if (rDate !== dateOfEventVal) return false;
        const rFacilities = facilityListFromString(r.facility || "");
        if (!rFacilities.includes(facility)) return false;
        const rStart = parseTimeToMinutes(r.timeStart);
        const rEnd = parseTimeToMinutes(r.timeEnd);
        if (rStart === null || rEnd === null) return true;
        return (newStart < rEnd && newEnd > rStart);
      });
      if (conflict) {
        alert(`The facility "${facility}" is already reserved for ${dateOfEventVal} during the selected time.`);
        return;
      }
    }

    // Generate sequential code for the facility
    const firstFacility = selectedFacilities[0];
    const codePrefix = getCodePrefix(firstFacility);
    
    // Get the last request_id for this facility type from Supabase
    const { data: lastRequest, error: countError } = await supabase
      .from('reservations')
      .select('request_id')
      .like('request_id', `${codePrefix}-%`)
      .order('request_id', { ascending: false })
      .limit(1)
      .single();

    let sequentialNumber = 1;
    if (lastRequest && lastRequest.request_id) {
      // Extract the number from the last request_id (e.g., "PH-0001" -> 1)
      const lastNumber = parseInt(lastRequest.request_id.substring(3), 10);
      sequentialNumber = lastNumber + 1;
    }

    // Create the new code ID with padding (e.g., PH-0001)
    const codeId = `${codePrefix}-${String(sequentialNumber).padStart(4, '0')}`;

    // Get all form data
    const unitOffice = document.querySelector('#unitOffice, input[name="unitOffice"]').value;
    const attendees = document.querySelector('#attendees, input[name="attendees"]').value;
    const additionalReq = document.querySelector('#additionalReq, input[name="additionalReq"]').value;

    // Get setup details
    const setupDetails = Array.from(form.querySelectorAll('input[name="setup"]:checked')).map(input => {
      const extraInput = input.parentElement.querySelector('.extra-input');
      return extraInput && extraInput.value ? 
        `${input.value} (${extraInput.value})` : 
        input.value;
    }).join(', ');

    // Create reservation object for Supabase
    const supabaseReservation = {
      id: localStorage.getItem('user_id'), // user's ID from login
      request_id: codeId,
      facility: selectedFacilities.join(", "),
      date: dateOfEventVal,
      time_start: timeStartInput.value,
      time_end: timeEndInput.value
    };

    // Create reservation object for localStorage (keeping old format for compatibility)
    const reservation = {
      user: "JUAN B. BATUMBAKAL",
      codeId: codeId,
      facility: selectedFacilities.join(", "),
      dateFiled: dateFiledInput && dateFiledInput.value ? dateFiledInput.value : todayYMD,
      dateReceived: dateReceivedInput && dateReceivedInput.value ? dateReceivedInput.value : getLocalDatetimeLocal(),
      dateOfEvent: dateOfEventVal,
      timeStart: timeStartInput && timeStartInput.value ? timeStartInput.value : "",
      timeEnd: timeEndInput && timeEndInput.value ? timeEndInput.value : "",
      eventTitle: eventTitleInput && eventTitleInput.value ? eventTitleInput.value : "",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      userId: localStorage.getItem('user_id')
    };

    // First save to Supabase
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([supabaseReservation]);

      if (error) throw error;

      // Generate PDF
      const element = document.querySelector('.form-container');
      const options = {
        margin: 1,
        filename: `VRF-${codeId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(element).save();

      // Save to localStorage for local display
      reservations.push(reservation);
      localStorage.setItem('reservations', JSON.stringify(reservations));
      localStorage.removeItem('selectedDate');

      alert('Reservation submitted successfully! PDF has been generated.');
      window.location.href = "Userdashboard.html";
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    }
  });
});

// Called when a calendar cell is clicked
function selectDateFromCalendar(dateString) {
  const dateOfEventInput = document.querySelector('input[name="dateOfEvent"], input#dateOfEvent, input[id="dateOfEvent"]');
  const normalized = toYMD(dateString) || dateString;
  if (dateOfEventInput) {
    dateOfEventInput.value = normalized;
    dateOfEventInput.focus();
    return;
  }
  // If not on form, store for later
  localStorage.setItem('selectedDate', normalized);
  window.location.href = "ReservationForm.html";
}
