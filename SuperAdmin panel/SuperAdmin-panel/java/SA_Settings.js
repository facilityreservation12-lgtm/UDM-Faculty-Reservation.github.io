document.addEventListener("DOMContentLoaded", function () {
  // Account Settings Form
  document.querySelector("#accountSettingsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    alert("✅ Account settings saved successfully!");
  });

  // Personal Preferences Form
  document.querySelector("#personalPreferencesForm").addEventListener("submit", function (e) {
    e.preventDefault();
    alert("✅ Personal preferences saved successfully!");
  });

  // Super Admin Settings Form
  document.querySelector("#superAdminSettingsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    alert("✅ Super admin settings saved successfully!");
  });

  // Backup Button
  document.getElementById("backupBtn").addEventListener("click", function () {
    alert("🗂️ Database backup has been initiated!");
  });

  // Toggle Maintenance Mode
  document.getElementById("maintenanceToggle").addEventListener("change", function () {
    const status = this.checked ? "enabled" : "disabled";
    alert(`⚙️ Maintenance mode has been ${status}.`);
  });
});