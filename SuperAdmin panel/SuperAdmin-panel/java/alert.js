// alerts.js

// Custom Alert
function showCustomAlert(title, message, type = 'info') {
  const modal = document.getElementById('customAlertModal');
  const icon = document.getElementById('alertIcon');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const buttonsEl = document.getElementById('alertButtons');

  if (!modal) {
    alert(`${title}\n\n${message}`);
    return;
  }

  titleEl.textContent = title;
  messageEl.innerHTML = message;

  icon.className = `modal-icon ${type}`;
  switch (type) {
    case 'success': icon.innerHTML = '✓'; break;
    case 'error': icon.innerHTML = '✕'; break;
    case 'warning': icon.innerHTML = '⚠'; break;
    case 'info': default: icon.innerHTML = 'ℹ'; break;
  }

  buttonsEl.innerHTML = '<button class="modal-btn primary" onclick="closeCustomAlert()">OK</button>';
  modal.classList.add('show');

  setTimeout(() => {
    const okBtn = buttonsEl.querySelector('.modal-btn');
    if (okBtn) okBtn.focus();
  }, 100);
}

// Custom Confirm
function showCustomConfirm(title, message, callback) {
  const modal = document.getElementById('customAlertModal');
  const icon = document.getElementById('alertIcon');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const buttonsEl = document.getElementById('alertButtons');

  if (!modal) {
    if (confirm(message)) callback();
    return;
  }

  titleEl.textContent = title;
  messageEl.innerHTML = message;

  icon.className = 'modal-icon warning';
  icon.innerHTML = '?';

  buttonsEl.innerHTML = `
    <button class="modal-btn secondary" onclick="closeCustomAlert()">Cancel</button>
    <button class="modal-btn danger" id="confirmBtn">Confirm</button>
  `;

  // attach listener dynamically
  setTimeout(() => {
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        closeCustomAlert();
        if (typeof callback === 'function') callback();
      });
    }
  }, 50);

  modal.classList.add('show');
}

// Close Alert
function closeCustomAlert() {
  const modal = document.getElementById('customAlertModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Loading
function showLoading(text = 'Loading...', subtext = 'Please wait') {
  const modal = document.getElementById('loadingModal');
  const textEl = document.getElementById('loadingText');
  const subtextEl = document.getElementById('loadingSubtext');

  if (modal && textEl && subtextEl) {
    textEl.textContent = text;
    subtextEl.textContent = subtext;
    modal.classList.add('show');
  }
}

function hideLoading() {
  const modal = document.getElementById('loadingModal');
  if (modal) {
    setTimeout(() => {
      modal.classList.remove('show');
    }, 1500); // 1.5s bago mawala para hindi mag-flash
  }
}

// Conflict modal shortcut
function showConflictModal(messageHtml) {
  showCustomAlert('Facility Conflict', messageHtml, 'warning');
}

// Event listeners for closing
document.addEventListener('DOMContentLoaded', function () {
  const customModal = document.getElementById('customAlertModal');
  if (customModal) {
    customModal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeCustomAlert();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeCustomAlert();
      hideLoading();
    }
  });
});
