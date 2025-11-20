// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  setupSendEmailButton();
});

// Send Email handler
function setupSendEmailButton() {
  const btn = document.getElementById('sendEmailBtn');
  
  if (!btn) {
    console.error('❌ Send Email button not found!');
    return;
  }

  btn.addEventListener('click', async function() {
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const to = 'facility.reservation12@gmail.com';
    const subject = 'Venue Reservation Form - Approval Required';
    
    // Get slip data (adjust selectors based on your HTML structure)
    const venueName = document.querySelector('.venue-name')?.textContent || 'N/A';
    const requesterName = document.querySelector('.requester-name')?.textContent || 'N/A';
    const eventDate = document.querySelector('.event-date')?.textContent || 'N/A';
    const eventTime = document.querySelector('.event-time')?.textContent || 'N/A';
    const reservationId = document.querySelector('.reservation-id')?.textContent || 'N/A';
    
    // Professional email template
    const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #0066cc; }
    .button { display: inline-block; background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🏢 Venue Reservation Form</h1>
      <p>Universidad de Manila - Facility Reservation System</p>
    </div>
    
    <div class="content">
      <p>Dear Administrator,</p>
      
      <p>A new venue reservation request has been submitted and requires your review and approval.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #0066cc;">📋 Reservation Details</h3>
        <div class="info-row">
          <span class="label">Reservation ID:</span> ${reservationId}
        </div>
        <div class="info-row">
          <span class="label">Venue:</span> ${venueName}
        </div>
        <div class="info-row">
          <span class="label">Requested by:</span> ${requesterName}
        </div>
        <div class="info-row">
          <span class="label">Event Date:</span> ${eventDate}
        </div>
        <div class="info-row">
          <span class="label">Event Time:</span> ${eventTime}
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="http://localhost:5500/SuperAdmin%20panel/SuperAdmin-panel/SA_Slip.html" class="button">
          📄 View Full VRF Details
        </a>
        <br>
        <a href="http://localhost:5500/SuperAdmin%20panel/SuperAdmin-panel/SA_Slip.html?download=true" class="button" style="background: #28a745;">
          ⬇️ Download VRF
        </a>
      </div>
      
      <p style="margin-top: 30px;">Please review the reservation details and take appropriate action.</p>
      
      <p>Thank you,<br>
      <strong>UDM Facility Reservation System</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated message from the Universidad de Manila Facility Reservation System.</p>
      <p>© 2024 Universidad de Manila. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const emailData = {
        to: to,
        subject: subject,
        html: bodyHtml
      };

      const res = await fetch('http://localhost:8000/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      const data = await res.json().catch(() => ({}));
      
      if (res.ok && data.success) {
        alert('✅ Email sent successfully! Check your Mailtrap inbox.');
      } else {
        alert('❌ Send failed: ' + (data.error || res.status));
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '📧 Send Email';
    }
  });
}