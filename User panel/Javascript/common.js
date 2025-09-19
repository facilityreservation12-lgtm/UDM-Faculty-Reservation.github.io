// Common JavaScript functions for User panel
// This file contains shared functions used across multiple pages

// Notification panel toggle function
function toggleNotificationPanel() {
  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");
  
  if (panel && overlay) {
    panel.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

// Menu active state handler
document.addEventListener('DOMContentLoaded', function() {
  // Set active menu item based on current page
  document.querySelectorAll('.menu a').forEach(link => {
    if (
      link.href &&
      window.location.pathname.endsWith(link.getAttribute('href'))
    ) {
      link.classList.add('active');
    }
  });

  // Add notification overlay click handler
  const overlay = document.getElementById("notificationOverlay");
  if (overlay) {
    overlay.addEventListener("click", toggleNotificationPanel);
  }
});

console.log('Common user panel functions loaded');