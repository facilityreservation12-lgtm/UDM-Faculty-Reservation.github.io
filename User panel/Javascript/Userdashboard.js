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