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

document.addEventListener("DOMContentLoaded", function () {
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
  reservationForm.addEventListener('submit', function (e) {
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

    // Generate code & save
    const firstFacility = selectedFacilities[0];
    const codePrefix = getCodePrefix(firstFacility);
    const codeId = codePrefix + "-" + Math.floor(Math.random() * 100000);
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
      createdAt: new Date().toISOString()
    };
    reservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(reservations));
    localStorage.removeItem('selectedDate');
    window.location.href = "Userdashboard.html";
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
