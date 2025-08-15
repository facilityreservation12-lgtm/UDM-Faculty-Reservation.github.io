const logs = [
  {
    date: "May 20, 2025",
    time: "1:30 PM",
    user: "JUAN B. BATUMBAKAL",
    role: "Admin 001",
    action: "LOGGED OUT",
    ip: "192.168.01.10"
  },
  {
    date: "May 20, 2025",
    time: "1:00 PM",
    user: "JUAN B. BATUMBAKAL",
    role: "Admin 001",
    action: "Edited the calendar",
    ip: "192.168.01.10"
  },
  {
    date: "May 20, 2025",
    time: "12:30 PM",
    user: "JUAN B. BATUMBAKAL",
    role: "Admin 001",
    action: "LOGGED IN",
    ip: "192.168.01.10"
  }
];

function loadLogs() {
  const container = document.getElementById("logEntries");
  container.innerHTML = "";

  logs.forEach(log => {
    container.innerHTML += `
      <div class="log-entry">
        <div>
          <div>${log.date}</div>
          <small>${log.time}</small>
        </div>
        <div>
          <strong>${log.user}</strong><br/>
          <small>${log.role}</small>
        </div>
        <div>${log.action}</div>
        <div>${log.ip}</div>
      </div>
    `;
  });
}

function toggleFilter() {
  const section = document.getElementById("filterSection");
  section.style.display = section.style.display === "none" ? "flex" : "none";
}

window.onload = loadLogs;
