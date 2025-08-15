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