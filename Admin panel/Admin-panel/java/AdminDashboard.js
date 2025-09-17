// Direct fetch to Supabase REST API (no library needed)
async function fetchFromSupabase(table, select = '*', startDate, endDate) {
  const supabaseUrl = 'https://nwudopvjzrlppahylpev.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dWRvcHZqenJscHBhaHlscGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyMjU4NDgsImV4cCI6MjA0ODgwMTg0OH0.fhcCkzQfFMZqTAYpgVMQgDcIKbBMZ6YgUjH4mUH5-vU';
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=${select}`;
  
  // Add date filters if provided
  if (startDate) {
    url += `&date=gte.${startDate}`;
  }
  if (endDate) {
    url += `&date=lt.${endDate}`;
  }
  
  console.log('Fetching from Supabase REST API:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched data:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return { data: null, error };
  }
}

// Function to fetch current month facility data
async function fetchCurrentMonthFacilityData() {
  // For now, skip the network call and use sample data due to connectivity issues
  console.log('Skipping Supabase fetch due to network connectivity issues');
  console.log('Using sample facility data for demonstration');
  return null;

  /* Commented out until network connectivity is resolved
  try {
    // Get current month range (December 2024)
    const now = new Date();
    const year = now.getFullYear(); // 2024
    const month = now.getMonth(); // 0-based (December = 11)
    
    console.log(`Debug: Current date is ${now.toISOString()}, year: ${year}, month: ${month}`);
    
    // First day of current month
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    // First day of next month
    const startOfNextMonth = new Date(year, month + 1, 1).toISOString().split('T')[0];
    
    console.log(`Fetching reservations for ${startOfMonth} to ${startOfNextMonth}...`);

    // Fetch reservations for current month using direct REST API
    const { data: reservations, error } = await fetchFromSupabase(
      'reservations', 
      'facility,date', 
      startOfMonth,
      startOfNextMonth
    );

    if (error) {
      console.error('Error fetching reservations:', error);
      return null;
    }

    console.log(`Found ${reservations.length} reservations for current month:`, reservations);

    if (!reservations || reservations.length === 0) {
      console.log('No reservations found for current month');
      return null;
    }

    // Count facility usage
    const facilityCount = {};
    reservations.forEach(reservation => {
      const facility = reservation.facility || 'Others';
      facilityCount[facility] = (facilityCount[facility] || 0) + 1;
    });

    // Convert to arrays for Chart.js
    const labels = Object.keys(facilityCount);
    const data = Object.values(facilityCount);

    // Predefined colors for consistency
    const colors = [
      '#FFCC00', '#A1C181', '#E8E288', '#92DCE5', 
      '#FFDCC1', '#A7C6ED', '#FFABAB', '#CCCCCC',
      '#FFB6C1', '#98FB98', '#DDA0DD', '#F0E68C'
    ];

    console.log('Facility usage for current month:', { labels, data });

    return {
      labels,
      data,
      colors: colors.slice(0, labels.length)
    };
  } catch (err) {
    console.error('Error in fetchCurrentMonthFacilityData:', err);
    return null;
  }
  */
}

// Function to get sample chart data as fallback
function getSampleChartData() {
  return {
    labels: [
      'Palma Hall',
      'Right Wing Lobby', 
      'Mehan Garden',
      'Rooftop',
      'Classroom',
      'Basketball Court',
      'Space at the Ground Floor',
      'Others'
    ],
    data: [30, 20, 15, 14, 6, 5, 5, 5],
    colors: [
      '#FFCC00',
      '#A1C181',
      '#E8E288',
      '#92DCE5',
      '#FFDCC1',
      '#A7C6ED',
      '#FFABAB',
      '#CCCCCC'
    ]
  };
}

// Wait for DOM to load before initializing chart
document.addEventListener('DOMContentLoaded', async function() {
  const canvasElement = document.getElementById('UsagePieChart');
  
  if (!canvasElement) {
    console.error('Canvas element with ID "UsagePieChart" not found. Make sure your HTML includes: <canvas id="UsagePieChart"></canvas>');
    return;
  }

  const ctx = canvasElement.getContext('2d');

  // Try to fetch real data for current month
  console.log('Fetching current month facility usage data...');
  const facilityData = await fetchCurrentMonthFacilityData();
  
  let chartData;
  if (facilityData && facilityData.labels.length > 0) {
    console.log('Using real facility data for current month:', facilityData);
    chartData = {
      labels: facilityData.labels,
      datasets: [{
        data: facilityData.data,
        backgroundColor: facilityData.colors
      }]
    };
  } else {
    console.warn('No current month data found, using sample data');
    const sampleData = getSampleChartData();
    chartData = {
      labels: sampleData.labels,
      datasets: [{
        data: sampleData.data,
        backgroundColor: sampleData.colors
      }]
    };
  }

  // Create the pie chart
  new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          color: '#000',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, ctx) => {
            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            let percentage = (value * 100 / sum).toFixed(1) + "%";
            return percentage;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // Update usage title function
  function updateUsageTitle() {
    const titleElement = document.getElementById('usage-title');
    if (!titleElement) {
      console.warn('Element with ID "usage-title" not found');
      return;
    }
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    titleElement.textContent = `USAGE PERCENTAGE OF FACILITIES FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`;
  }

  // Call it once on page load
  updateUsageTitle();
  
  // Optional: refresh it every day (in case the month changes)
  setInterval(updateUsageTitle, 24 * 60 * 60 * 1000);

  // Set active menu item
  document.querySelectorAll('.menu a').forEach(link => {
    if (
      link.href &&
      window.location.pathname.endsWith(link.getAttribute('href'))
    ) {
      link.classList.add('active');
    }
  });
});