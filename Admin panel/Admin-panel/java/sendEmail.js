/**
 * Admin sendEmail.js
 * Email functionality for Admin panel - converted to EmailJS
 * Works on localhost, Vercel, and GitHub Pages with dynamic URLs
 */

// EmailJS Configuration - Using existing templates
const EMAILJS_CONFIG = {
    publicKey: 'nobu3vJGbaY1kN5dz',
    serviceId: 'service_uu6zn4a',
    // Using existing approval template - modify template in EmailJS dashboard to match your needs
    templateId: 'template_ekz42oi'
};

// Initialize EmailJS when script loads
(function initializeAdminEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('✅ EmailJS initialized for Admin panel');
    } else {
        console.warn('⚠️ EmailJS not loaded yet. Make sure the SDK is included in the HTML.');
    }
})();

/**
 * Get the base URL dynamically - works on all environments (localhost, Vercel, GitHub Pages)
 */
function getAppBaseUrl() {
    // Works for all environments - just use the current origin
    return window.location.origin;
}

document.addEventListener('DOMContentLoaded', () => {
    setupSendEmailButton();
});

function setupSendEmailButton() {
    const btn = document.getElementById('sendEmailBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        // Show the email modal instead of directly sending
        const modal = document.getElementById('emailModal');
        const emailInput = document.getElementById('emailInput');
        if (modal) {
            modal.style.display = 'flex';
            if (emailInput) {
                emailInput.value = ''; // Clear previous input
                emailInput.focus();
            }
        }
    });
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function sendEmailWithAddress() {
    const emailInput = document.getElementById('emailInput');
    const recipientEmail = emailInput?.value?.trim();
    
    if (!recipientEmail) {
        alert('Please enter an email address.');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
        alert('Please enter a valid email address.');
        return;
    }

    closeEmailModal();

    const btn = document.getElementById('sendEmailBtn');
    const modalButtons = document.getElementById('emailModalButtons');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
    }
    if (modalButtons) {
        modalButtons.style.display = 'none';
    }

    const details = collectSlipDetails();

    try {
        // Use EmailJS to send the email
        const baseUrl = getAppBaseUrl();
        
        // Build dynamic URLs
        const slipUrl = `${baseUrl}/Admin%20panel/Admin-panel/Slip.html${details.reservationId !== 'N/A' ? '?request_id=' + encodeURIComponent(details.reservationId) : ''}`;
        const docUploadUrl = `${baseUrl}/User%20panel/DocumentUpload.html${details.reservationId !== 'N/A' ? '?request_id=' + encodeURIComponent(details.reservationId) : ''}`;

        // Prepare email template parameters - matching existing template variables
        const templateParams = {
            to_email: recipientEmail,
            request_id: details.reservationId,
            facility: details.facility || details.eventName || 'N/A',
            event_date: details.inclusiveDates || 'N/A',
            event_title: details.eventName || 'N/A',
            document_upload_url: docUploadUrl
        };

        // Send via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );

        console.log('✅ Email sent successfully!', response.status, response.text);
        alert('✅ Email sent successfully to ' + recipientEmail + '!');

    } catch (error) {
        console.error('❌ Email send failed:', error);
        alert('❌ Send failed: ' + (error.message || 'Unknown error'));
    } finally {
        const btn = document.getElementById('sendEmailBtn');
        const modalButtons = document.getElementById('emailModalButtons');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📧 Send Email';
        }
        if (modalButtons) {
            modalButtons.style.display = 'flex';
        }
    }
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
        facility: facilityValues.join(', '),
        setups: setupValues.join(', '),
        remarks: remarksValues.join(', ')
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
