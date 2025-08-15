cument.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("bugForm");
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("bugName").value.trim();
    const email = document.getElementById("bugEmail").value.trim();
    const page = document.getElementById("bugPage").value.trim();
    const description = document.getElementById("bugDescription").value.trim();
    const steps = document.getElementById("bugSteps").value.trim();
    const screenshot = document.getElementById("bugScreenshot").value.trim();

    console.log("Bug Report Submitted:", {
      name, email, page, description, steps, screenshot
    });

    alert("✅ Thank you! Your bug report has been submitted.");

    form.reset();
  });
});