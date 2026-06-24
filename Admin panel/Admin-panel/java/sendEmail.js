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
    console.log('EmailJS Init: Checking emailjs...', typeof emailjs);
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

/**
 * Get Supabase client
 */
function getSupabase() {
    if (typeof window !== 'undefined') {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.supabase) return window.supabase;
    }
    if (typeof supabase !== 'undefined') return supabase;
    return null;
}

/**
 * Get human-readable label for document type
 */
function getDocumentLabel(docType) {
    const labels = {
        'frf': 'FRS',
        'signed_approval': 'Signed Approval',
        'approval': 'Approval',
        'venue_slip': 'Venue Slip',
        'cash_invoice': 'Cash Invoice',
        'permit_to_use_facility': 'Permit to Use Facility'
    };
    return labels[docType] || docType;
}

/**
 * Fetch uploaded documents for a reservation
 */
async function getUploadedDocuments(requestId) {
    if (!requestId || requestId === 'N/A') return [];
    
    const sb = getSupabase();
    if (!sb) {
        console.warn('Supabase client not available for fetching documents');
        return [];
    }
    
    try {
        // Try RPC first
        const { data: docs, error } = await sb
            .rpc('get_reservation_documents', { p_request_id: requestId });
        
        if (error) {
            console.warn('RPC error fetching documents, trying direct select:', error);
            // Fallback to direct select
            const { data: directDocs, error: selectError } = await sb
                .from('reservation_documents')
                .select('*')
                .eq('request_id', requestId);
            
            if (selectError) {
                console.error('Error fetching documents:', selectError);
                return [];
            }
            return directDocs || [];
        }
        return docs || [];
    } catch (err) {
        console.error('Error in getUploadedDocuments:', err);
        return [];
    }
}

/**
 * Build HTML list of uploaded documents for email
 */
function buildDocumentsListHtml(documents) {
    if (!documents || documents.length === 0) {
        return '<p>No documents uploaded yet.</p>';
    }
    
    let html = '<h4>Uploaded Documents:</h4><ul>';
    documents.forEach(doc => {
        const label = getDocumentLabel(doc.document_type);
        html += `<li><a href="${doc.file_url}" target="_blank">${label} - ${doc.filename}</a></li>`;
    });
    html += '</ul>';
    return html;
}

// Setup function that can be called manually if DOMContentLoaded already fired
function setupSendEmailButton() {
    console.log('setupSendEmailButton called');
    const btn = document.getElementById('sendEmailBtn');
    console.log('SendEmail button element:', btn);
    if (!btn) {
        console.error('SendEmail button not found in DOM');
        return;
    }

    // Remove any existing listeners to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async () => {
        console.log('SendEmail button clicked');
        // Show the email modal instead of directly sending
        const modal = document.getElementById('emailModal');
        const emailInput = document.getElementById('emailInput');
        console.log('Modal element:', modal);
        console.log('Email input element:', emailInput);
        if (modal) {
            modal.classList.add('show');
            console.log('Modal should now be visible');
            if (emailInput) {
                emailInput.value = ''; // Clear previous input
                emailInput.focus();
            }
        } else {
            console.error('Email modal not found in DOM');
        }
    });
}

// Try to setup immediately in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, setting up immediately');
    setupSendEmailButton();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    setupSendEmailButton();
});

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function sendEmailWithAddress() {
    console.log('sendEmailWithAddress called');
    const emailInput = document.getElementById('emailInput');
    const recipientEmail = emailInput?.value?.trim();
    console.log('Recipient email:', recipientEmail);
    
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
    console.log('Collected details:', details);

    try {
        // Use EmailJS to send the email
        const baseUrl = getAppBaseUrl();
        console.log('Base URL:', baseUrl);
        
        // Build dynamic URLs
        const slipUrl = baseUrl + '/Admin%20panel/Admin-panel/Slip.html' + (details.reservationId !== 'N/A' ? '?request_id=' + encodeURIComponent(details.reservationId) : '');
        const docUploadUrl = baseUrl + '/User%20panel/DocumentUpload.html' + (details.reservationId !== 'N/A' ? '?request_id=' + encodeURIComponent(details.reservationId) : '');
        console.log('Slip URL:', slipUrl);
        console.log('Doc Upload URL:', docUploadUrl);

        // Fetch uploaded documents for this reservation
        const uploadedDocuments = await getUploadedDocuments(details.reservationId);
        console.log('Uploaded documents:', uploadedDocuments);
        
        // Build documents HTML list for email
        const documentsListHtml = buildDocumentsListHtml(uploadedDocuments);

        // Prepare email template parameters - matching existing template variables
        // Include uploaded document URLs if available
        const templateParams = {
            to_email: recipientEmail,
            request_id: details.reservationId,
            facility: details.facility || details.eventName || 'N/A',
            event_date: details.inclusiveDates || 'N/A',
            event_title: details.eventName || 'N/A',
            document_upload_url: docUploadUrl,
            // Include uploaded documents list (for email templates that support HTML)
            uploaded_documents_html: documentsListHtml,
            // Also include individual document URLs if template supports them
            frf_url: uploadedDocuments.find(d => d.document_type === 'frf')?.file_url || '',
            signed_approval_url: uploadedDocuments.find(d => d.document_type === 'signed_approval')?.file_url || '',
            approval_url: uploadedDocuments.find(d => d.document_type === 'approval')?.file_url || '',
            venue_slip_url: uploadedDocuments.find(d => d.document_type === 'venue_slip')?.file_url || '',
            cash_invoice_url: uploadedDocuments.find(d => d.document_type === 'cash_invoice')?.file_url || '',
            permit_to_use_facility_url: uploadedDocuments.find(d => d.document_type === 'permit_to_use_facility')?.file_url || ''
        };
        console.log('Template params:', templateParams);

        console.log('Checking EmailJS...', typeof emailjs);
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS not loaded!');
        }

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
