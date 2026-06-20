/**
 * SuperAdmin sendEmail.js
 * Email functionality for SuperAdmin panel - converted to EmailJS
 * Works on both localhost and GitHub Pages with dynamic URLs
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
 * Get the base URL dynamically - works on localhost AND GitHub Pages
 */
function getAppBaseUrl() {
    const hostname = window.location.hostname;
    
    // For localhost (development)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin;
    }
    
    // For GitHub Pages (production) - adjust repo name as needed
    return window.location.origin + '/UDM-Faculty-Reservation.github.io';
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

        try {
            // Prepare email template parameters - matching existing template variables
            const templateParams = {
                to_email: 'facility.reservation12@gmail.com',
                request_id: reservationId,
                facility: venueName,
                event_date: eventDate,
                event_title: requesterName,
                document_upload_url: docUploadUrl
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
