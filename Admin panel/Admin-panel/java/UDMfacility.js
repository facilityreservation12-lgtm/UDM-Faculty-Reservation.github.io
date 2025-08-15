const facilities = [
      {
        name: "UDM - Palma Hall",
        data: [
          { code: "PH 000001", user: "Jasmine Cruz", date: "June 2, 2025", time: "9:00 AM", details: "Student council meeting" },
        ]
      },
      {
        name: "UDM - Right Wing Lobby",
        data: [
          { code: "RW 000001", user: "Elena Ramos", date: "June 3, 2025", time: "10:00 AM", details: "Art exhibit prep" }
        ]
      },
      {
        name: "UDM - Mehan Garden",
        data: [
          { code: "MG 000001", user: "Jon Santos", date: "June 5, 2025", time: "1:30 PM", details: "Botanical tour" }
        ]
      },
      {
        name: "UDM - Rooftop",
        data: [
          { code: "RT 000001", user: "Sam Bautista", date: "June 6, 2025", time: "3:00 PM", details: "Photoshoot" }
        ]
      },
      {
        name: "UDM - Classrooms",
        data: [
          { code: "CR 101001", user: "Trixie Tan", date: "June 7, 2025", time: "8:00 AM", details: "Quiz Bee - Room 101" },
          { code: "CR 102001", user: "Marco Dela Cruz", date: "June 7, 2025", time: "10:00 AM", details: "Thesis defense - Room 102" }
        ]
      },
      {
        name: "UDM - Basketball Court",
        data: [
          { code: "BC 000001", user: "Zeke Mendoza", date: "June 8, 2025", time: "2:00 PM", details: "Basketball tryouts" }
        ]
      },
      {
        name: "UDM - Space at the Ground Floor",
        data: [
          { code: "GF 000001", user: "Kim Uy", date: "June 10, 2025", time: "11:00 AM", details: "Merch booth setup" }
        ]
      },
      {
        name: "UDM - Others",
        data: [
          { code: "OT 000001", user: "Gelo Fernandez", date: "June 11, 2025", time: "9:00 AM", details: "External seminar" }
        ]
      }
    ];

    const urlParams = new URLSearchParams(window.location.search);
    const facilityParam = urlParams.get('facility');
    const facilityIndex = facilities.findIndex(f => f.name.toLowerCase() === `udm - ${facilityParam}`.toLowerCase());
    let currentFacility = facilityIndex >= 0 ? facilityIndex : 0;

    function renderTable() {
      const venue = facilities[currentFacility];
      document.getElementById("venue-title").textContent = venue.name;
      document.getElementById("facilitySelect").value = currentFacility;

      const table = document.getElementById("facility-table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Code</th>
            <th>End User</th>
            <th>Date</th>
            <th>Time</th>
            <th>Details</th>
            <th>Requirements</th>
          </tr>
        </thead>
        <tbody>
          ${venue.data.map(row => `
            <tr>
              <td>${row.code}</td>
              <td><strong>${row.user}</strong></td>
              <td>${row.date}</td>
              <td>${row.time}</td>
              <td>${row.details}</td>
              <td><button onclick="window.location.href='Relevantdocuments.html'" class="view-btn">View Requirements</button></td>
            </tr>
          `).join("")}
        </tbody>
      `;
    }

    function nextFacility() {
      currentFacility = (currentFacility + 1) % facilities.length;
      renderTable();
    }

    function prevFacility() {
      currentFacility = (currentFacility - 1 + facilities.length) % facilities.length;
      renderTable();
    }

    function jumpToFacility() {
      currentFacility = parseInt(document.getElementById("facilitySelect").value);
      renderTable();
    }

    window.onload = renderTable;