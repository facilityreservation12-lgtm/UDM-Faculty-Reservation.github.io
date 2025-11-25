document.addEventListener('DOMContentLoaded', () => {
  setupSendEmailButton();
});

function setupSendEmailButton() {
  const btn = document.getElementById('sendEmailBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const details = collectSlipDetails();
    const emailBody = buildEmailTemplate(details);

    try {
      const payload = {
        to: 'facility.reservation12@gmail.com',
        subject: `Facility Reservation Form – ${details.eventName || 'FRF'}`,
        html: emailBody
      };

      const res = await fetch('http://localhost:8000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        alert('✅ Email sent successfully!');
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

function collectSlipDetails() {
  const queryParams = new URLSearchParams(window.location.search);
  const reservationId = queryParams.get('request_id') || 'N/A';
  const dateFiled = document.querySelector('.row .column input[type="date"]')?.value || 'N/A';
  const slipNumber = document.querySelector('.row .column input[type="text"]')?.value || 'N/A';

  const sectionRowInputs = document.querySelectorAll('.section .row .column input[type="text"]');
  const unitOffice = sectionRowInputs[0]?.value || 'N/A';
  const inclusiveDates = sectionRowInputs[1]?.value || 'N/A';

  let eventInput = null;
  document.querySelectorAll('.section input[type="text"]').forEach(input => {
    const isCheckboxChild = input.closest('.checkbox-group');
    const isRowChild = input.closest('.row');
    if (!isCheckboxChild && !isRowChild && !eventInput) {
      eventInput = input;
    }
  });
  const eventName = eventInput?.value || 'N/A';

  const sectionGroups = document.querySelectorAll('.section .checkbox-group');
  const facilityValues = getCheckedLabels(sectionGroups[0], {
    classroomCheckbox: label => {
      const room = document.getElementById('classroomInput')?.value.trim();
      return room ? `${label} ${room}` : label;
    },
    othersFacilityCheckbox: label => {
      const others = document.getElementById('othersFacilityInput')?.value.trim();
      return others ? `${label} – ${others}` : label;
    }
  });

  const setupValues = getCheckedLabels(sectionGroups[1], {
    othersSetupCheckbox: label => {
      const others = document.getElementById('othersSetupInput')?.value.trim();
      return others ? `${label} – ${others}` : label;
    }
  });

  const remarksValues = getCheckedLabels(sectionGroups[2], {
    othersRemarksCheckbox: () => {
      const text = document.getElementById('othersRemarksInput')?.value.trim();
      return text || 'Others';
    }
  });

  return {
    reservationId,
    dateFiled,
    slipNumber,
    unitOffice,
    inclusiveDates,
    eventName,
    facilities: facilityValues,
    setups: setupValues,
    remarks: remarksValues,
    slipHtml: document.querySelector('.container')?.outerHTML || ''
  };
}

function getCheckedLabels(groupEl, transforms = {}) {
  if (!groupEl) return [];
  const labels = [];

  groupEl.querySelectorAll('label').forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (!checkbox || !checkbox.checked) return;

    const transformFn = transforms[checkbox.id];
    const text = label.textContent.trim();
    labels.push(transformFn ? transformFn(text) : text);
  });

  return labels.length ? labels : ['None selected'];
}

function buildEmailTemplate(details) {
  const baseUrl = 'http://localhost:5500/Admin%20panel/Admin-panel/Slip.html';
  const hasRequest = details.reservationId && details.reservationId !== 'N/A';
  const slipUrl = hasRequest ? `${baseUrl}?request_id=${encodeURIComponent(details.reservationId)}` : baseUrl;
  const downloadUrl = `${slipUrl}${slipUrl.includes('?') ? '&' : '?'}download=true`;

  const facilities = details.facilities.join(', ');
  const setups = details.setups.join(', ');
  const remarks = details.remarks.join(', ');
  const slipPreview = details.slipHtml
    ? `<div class="slip-preview">${details.slipHtml}</div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7fb; color: #333; }
    .email-container { max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }
    .header { background: linear-gradient(135deg, #0066cc, #004999); color: #fff; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 24px; }
    .content { padding: 24px; }
    .info-box { border: 1px solid #dde3f0; border-radius: 10px; padding: 16px; margin-bottom: 16px; background: #f9fbff; }
    .label { font-weight: bold; color: #004999; display: block; margin-bottom: 4px; }
    .button-row { text-align: center; margin: 24px 0; }
    .button { display: inline-block; margin: 8px; padding: 12px 28px; border-radius: 24px; background: #0066cc; color: #fff; text-decoration: none; font-weight: bold; }
    .button.secondary { background: #28a745; }
    .slip-preview { margin-top: 24px; border: 1px dashed #cbd2e1; border-radius: 10px; padding: 16px; overflow-x: auto; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Venue Reservation Request</h1>
      <p>Universidad de Manila Facility Reservation System</p>
    </div>
    <div class="content">
      <p>Good day,</p>
      <p>Please review the latest venue reservation request. Key details are summarized below:</p>

      <div class="info-box">
        <span class="label">Reservation ID</span>
        <div>${details.reservationId}</div>
      </div>
      <div class="info-box">
        <span class="label">Venue Slip No.</span>
        <div>${details.slipNumber}</div>
      </div>
      <div class="info-box">
        <span class="label">Unit / Office / College</span>
        <div>${details.unitOffice}</div>
      </div>
      <div class="info-box">
        <span class="label">Event / Activity</span>
        <div>${details.eventName}</div>
      </div>
      <div class="info-box">
        <span class="label">Inclusive Dates</span>
        <div>${details.inclusiveDates}</div>
      </div>
      <div class="info-box">
        <span class="label">Facilities Requested</span>
        <div>${facilities}</div>
      </div>
      <div class="info-box">
        <span class="label">Setup Requirements</span>
        <div>${setups}</div>
      </div>
      <div class="info-box">
        <span class="label">Remarks</span>
        <div>${remarks}</div>
      </div>

      <div class="button-row">
        <a class="button" href="${slipUrl}" target="_blank">View Full FRF</a>
        <a class="button secondary" href="${downloadUrl}" target="_blank">Download / Print</a>
      </div>

      ${slipPreview}

      <p style="margin-top:24px;">Thank you,<br><strong>UDM Facility Reservation System</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply directly.</p>
      <p>© ${new Date().getFullYear()} Universidad de Manila</p>
    </div>
  </div>
</body>
</html>
  `;
}

