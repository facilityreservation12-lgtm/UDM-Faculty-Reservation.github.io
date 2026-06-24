/**
 * SuperAdmin sendEmail.js
 * Email functionality for SuperAdmin panel - converted to EmailJS
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
(function initializeSuperAdminEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('✅ EmailJS initialized for SuperAdmin panel');
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
        
        // Get slip data (adjust selectors based on your HTML structure)
        const venueName = document.querySelector('.venue-name')?.textContent || 'N/A';
        const requesterName = document.querySelector('.requester-name')?.textContent || 'N/A';
        const eventDate = document.querySelector('.event-date')?.textContent || 'N/A';
        const eventTime = document.querySelector('.event-time')?.textContent || 'N/A';
        const reservationId = document.querySelector('.reservation-id')?.textContent || 'N/A';
        
        // Get dynamic base URL
        const baseUrl = getAppBaseUrl();
        
        // Build dynamic URLs
        const slipUrl = `${baseUrl}/Admin%20panel/Admin-panel/Slip.html`;
        const docUploadUrl = `${baseUrl}/User%20panel/DocumentUpload.html${reservationId !== 'N/A' ? '?request_id=' + encodeURIComponent(reservationId) : ''}`;

        // Fetch uploaded documents for this reservation
        const uploadedDocuments = await getUploadedDocuments(reservationId);
        console.log('Uploaded documents:', uploadedDocuments);
        
        // Build documents HTML list for email
        const documentsListHtml = buildDocumentsListHtml(uploadedDocuments);

        try {
            // Prepare email template parameters - matching existing template variables
            // Include uploaded document URLs if available
            const templateParams = {
                to_email: 'facility.reservation12@gmail.com',
                request_id: reservationId,
                facility: venueName,
                event_date: eventDate,
                event_title: requesterName,
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

            // Send via EmailJS
            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                templateParams
            );

            console.log('✅ Email sent successfully!', response.status, response.text);
            alert('✅ Email sent successfully!');

        } catch (error) {
            console.error('❌ Email send failed:', error);
            alert('❌ Send failed: ' + (error.message || 'Unknown error'));
        } finally {
            btn.disabled = false;
            btn.textContent = '📧 Send Email';
        }
    });
}
