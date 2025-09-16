const ctx = document.getElementById('UsagePieChart').getContext('2d');

new Chart(ctx, {
  type: 'pie',
  data: {
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
    datasets: [{
      data: [30, 20, 15, 14, 6, 5, 5, 5],
      backgroundColor: [
        '#FFCC00',
        '#A1C181',
        '#E8E288',
        '#92DCE5',
        '#FFDCC1',
        '#A7C6ED',
        '#FFABAB',
        '#CCCCCC'
      ]
    }]
  },
  options: {
    responsive: false,
    plugins: {
      legend: {
        display: false
      },
      datalabels: {
        color: '#000', // text color
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
 function updateUsageTitle() {
    const titleElement = document.getElementById('usage-title');
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    titleElement.textContent = `USAGE PERCENTAGE OF FACILITIES FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`;
  }

  // Call it once on page load
  updateUsageTitle();

  // Optional: refresh it every day (in case the month changes)
  setInterval(updateUsageTitle, 24 * 60 * 60 * 1000);

  document.querySelectorAll('.menu a').forEach(link => {
  if (
    link.href &&
    window.location.pathname.endsWith(link.getAttribute('href'))
  ) {
    link.classList.add('active');
  }
});