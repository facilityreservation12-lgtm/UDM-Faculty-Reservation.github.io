/**
 * SA_EmailNotification.js
 * Email notification module for SuperAdmin approval/rejection actions
 * Uses EmailJS to send notifications to users
 */

// EmailJS Configuration
const EMAILJS_CONFIG = {
    publicKey: 'nobu3vJGbaY1kN5dz',
    serviceId: 'service_uu6zn4a',
    approvalTemplateId: 'template_ekz42oi',
    rejectionTemplateId: 'template_dsp9wzy'
};

// Initialize EmailJS (will be called when the script loads)
(function initializeEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('✅ EmailJS initialized successfully');
    } else {
        console.warn('⚠️ EmailJS not loaded yet. Make sure the SDK is included in the HTML.');
    }
})();

/**
 * Get Supabase client (helper function)
 */
function getSupabaseForEmail() {
    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
        return window.supabaseClient;
    } else if (window.supabase && typeof window.supabase.from === 'function') {
        return window.supabase;
    }
    return null;
}

/**
 * Get the base URL dynamically - works on all environments (localhost, Vercel, GitHub Pages)
 */
function getAppBaseUrl() {
    // Works for all environments - just use the current origin
    return window.location.origin;
}

/**
 * Format date to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "January 15, 2024")
 */
function formatDateForEmail(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format time to 12-hour format
 * @param {string} timeString - Time string (HH:MM:SS)
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
function formatTimeForEmail(timeString) {
    if (!timeString) return 'N/A';
    const [hour, minute] = timeString.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
}

/**
 * Fetch user email from database by user ID
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} User email or null if not found
 */
async function fetchUserEmail(userId) {
    if (!userId) {
        console.warn('No userId provided to fetchUserEmail');
        return null;
    }

    const sb = getSupabaseForEmail();
    if (!sb) {
        console.error('Supabase client not available');
        return null;
    }

    try {
        console.log(`Fetching email for userId: ${userId}`);
        
        const { data, error } = await sb
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user email:', error);
            return null;
        }

        console.log('User data fetched:', data);
        
        if (data?.email) {
            console.log(`Found email for ${userId}: ${data.email}`);
            return data.email;
        } else {
            console.warn(`No email found for user ${userId}`);
            return null;
        }
    } catch (err) {
        console.error('Exception fetching user email:', err);
        return null;
    }
}

/**
 * Fetch user full name from database by user ID
 * @param {string} userId - User ID
 * @returns {Promise<string>} User full name or 'Valued User' as fallback
 */
async function fetchUserName(userId) {
    if (!userId) return 'Valued User';

    const sb = getSupabaseForEmail();
    if (!sb) return 'Valued User';

    try {
        const { data, error } = await sb
            .from('users')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

        if (error || !data) return 'Valued User';

        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return fullName || 'Valued User';
    } catch (err) {
        console.error('Exception fetching user name:', err);
        return 'Valued User';
    }
}

/**
 * Fetch reservation details from database by request ID
 * @param {string} requestId - Reservation request ID
 * @returns {Promise<Object|null>} Reservation details or null if not found
 */
async function fetchReservationDetails(requestId) {
    if (!requestId) {
        console.warn('No requestId provided to fetchReservationDetails');
        return null;
    }

    const sb = getSupabaseForEmail();
    if (!sb) {
        console.error('Supabase client not available');
        return null;
    }

    try {
        console.log(`Fetching reservation details for requestId: ${requestId}`);
        
        const { data, error } = await sb
            .from('reservations')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (error) {
            console.error('Error fetching reservation details:', error);
            return null;
        }

        console.log('Reservation data:', data);
        console.log('Reservation user ID (id):', data?.id);
        
        return data;
    } catch (err) {
        console.error('Exception fetching reservation details:', err);
        return null;
    }
}

/**
 * Send approval email to user
 * @param {string} requestId - Reservation request ID
 * @returns {Promise<boolean>} Success status
 */
async function sendApprovalEmail(requestId) {
    console.log(`📧 Sending approval email for request: ${requestId}`);

    try {
        // Fetch reservation details
        const reservation = await fetchReservationDetails(requestId);
        if (!reservation) {
            console.error('Could not fetch reservation details');
            return false;
        }

        // Fetch user email and name
        const userId = reservation.id;
        const [userEmail, userName] = await Promise.all([
            fetchUserEmail(userId),
            fetchUserName(userId)
        ]);

        if (!userEmail) {
            console.error('Could not fetch user email. User may not have an email on file.');
            // Don't return false - still log the approval
            return false;
        }

        // Prepare email template parameters
        const docUploadUrl = `${getAppBaseUrl()}/User%20panel/DocumentUpload.html?request_id=${encodeURIComponent(reservation.request_id || requestId)}`;
        
        const templateParams = {
            to_email: userEmail,
            user_name: userName,
            request_id: reservation.request_id || requestId,
            facility: reservation.facility || 'N/A',
            event_date: formatDateForEmail(reservation.date),
            time_start: formatTimeForEmail(reservation.time_start),
            time_end: formatTimeForEmail(reservation.time_end),
            event_title: reservation.title_of_the_event || 'N/A',
            document_upload_url: docUploadUrl
        };

        console.log('📧 Approval email params:', templateParams);

        // Send email via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.approvalTemplateId,
            templateParams
        );

        console.log('✅ Approval email sent successfully!', response.status, response.text);
        return true;

    } catch (error) {
        console.error('❌ Failed to send approval email:', error);
        // Don't return false - the approval action still succeeded
        return false;
    }
}

/**
 * Send rejection email to user
 * @param {string} requestId - Reservation request ID
 * @returns {Promise<boolean>} Success status
 */
async function sendRejectionEmail(requestId) {
    console.log(`📧 Sending rejection email for request: ${requestId}`);

    try {
        // Fetch reservation details
        const reservation = await fetchReservationDetails(requestId);
        if (!reservation) {
            console.error('Could not fetch reservation details');
            return false;
        }

        // Fetch user email and name
        const userId = reservation.id;
        const [userEmail, userName] = await Promise.all([
            fetchUserEmail(userId),
            fetchUserName(userId)
        ]);

        if (!userEmail) {
            console.error('Could not fetch user email. User may not have an email on file.');
            return false;
        }

        // Prepare email template parameters
        const docUploadUrl = `${getAppBaseUrl()}/User%20panel/DocumentUpload.html?request_id=${encodeURIComponent(reservation.request_id || requestId)}`;
        
        const templateParams = {
            to_email: userEmail,
            user_name: userName,
            request_id: reservation.request_id || requestId,
            facility: reservation.facility || 'N/A',
            event_date: formatDateForEmail(reservation.date),
            time_start: formatTimeForEmail(reservation.time_start),
            time_end: formatTimeForEmail(reservation.time_end),
            event_title: reservation.title_of_the_event || 'N/A',
            document_upload_url: docUploadUrl
        };

        console.log('📧 Rejection email params:', templateParams);

        // Send email via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.rejectionTemplateId,
            templateParams
        );

        console.log('✅ Rejection email sent successfully!', response.status, response.text);
        return true;

    } catch (error) {
        console.error('❌ Failed to send rejection email:', error);
        return false;
    }
}

/**
 * Show toast notification for email status
 * @param {string} message - Message to display
 * @param {boolean} isSuccess - Whether it's a success message
 */
function showEmailNotificationToast(message, isSuccess) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'email-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${isSuccess ? '#184C2F' : '#ad332b'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    // Add animation keyframes if not already added
    if (!document.getElementById('emailToastStyles')) {
        const style = document.createElement('style');
        style.id = 'emailToastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

console.log('📧 SA_EmailNotification module loaded successfully');