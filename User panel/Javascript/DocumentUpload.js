// ===================================
// DOCUMENT UPLOAD JAVASCRIPT
// UDM Faculty Reservation System
// ===================================

// Document type configuration
const DOCUMENT_TYPES = {
  frf: { label: 'FRF', uploadBy: 'user', required: true },
  signed_approval: { label: 'Signed Approval', uploadBy: 'user', required: true },
  approval: { label: 'Approval', uploadBy: 'admin', required: false },
  venue_slip: { label: 'Facility Slip', uploadBy: 'admin', required: false },
  cash_invoice: { label: 'Cash Invoice', uploadBy: 'admin', required: false },
  permit_to_use_facility: { label: 'Permit to Use Facility', uploadBy: 'admin', required: false }
};

const STORAGE_BUCKET = 'facilityreservation';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Global state
let currentReservation = null;
let uploadedFiles = {};

// ===================================
// SUPABASE CLIENT GETTER
// ===================================
function getSupabase() {
  if (typeof window !== 'undefined') {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
  }
  return null;
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DocumentUpload initializing...');
  
  // Get request_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('request_id');
  
  if (!requestId) {
    showCustomAlert('Error', 'No reservation ID provided. Please access this page from the approval email link.', 'error');
    return;
  }
  
  document.getElementById('currentRequestId').value = requestId;
  
  // Load user details
  await loadUserDetails();
  
  // Load reservation details
  await loadReservationDetails(requestId);
  
  // Load documents
  await loadDocuments(requestId);
  
  // Setup file input listeners
  setupFileInputs();
  
  // Active menu link highlighting
  document.querySelectorAll('.menu a').forEach(link => {
    if (link.href && window.location.pathname.endsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
});

// ===================================
// LOAD USER DETAILS
// ===================================
async function loadUserDetails() {
  try {
    const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
    console.log('Loading user details for ID:', userId);
    
    if (!userId) {
      document.getElementById('UserName').textContent = 'Guest User';
      document.getElementById('UserRole').textContent = '';
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not initialized');
      return;
    }

    const { data, error } = await sb
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user details:', error);
      return;
    }
    
    if (data) {
      const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      document.getElementById('UserName').textContent = userName || 'Unknown User';
      document.getElementById('UserRole').textContent = data.role_name || '';
    }
  } catch (err) {
    console.error('Error in loadUserDetails:', err);
  }
}

// ===================================
// LOAD RESERVATION DETAILS
// ===================================
async function loadReservationDetails(requestId) {
  try {
    const sb = getSupabase();
    if (!sb) {
      showCustomAlert('Error', 'Database connection error', 'error');
      return;
    }

    const { data: reservation, error } = await sb
      .from('reservations')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      console.error('Error fetching reservation:', error);
      showCustomAlert('Error', 'Failed to load reservation details', 'error');
      return;
    }

    if (!reservation) {
      showCustomAlert('Error', 'Reservation not found', 'error');
      return;
    }

    currentReservation = reservation;
    
    // Populate reservation info
    document.getElementById('requestId').textContent = reservation.request_id || '-';
    document.getElementById('facility').textContent = reservation.facility || '-';
    document.getElementById('eventTitle').textContent = reservation.title_of_the_event || '-';
    
    // Format date
    if (reservation.date) {
      const dateObj = new Date(reservation.date);
      document.getElementById('eventDate').textContent = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      document.getElementById('eventDate').textContent = '-';
    }
    
    // Format time
    if (reservation.time_start && reservation.time_end) {
      const timeStart = formatTime12hr(reservation.time_start);
      const timeEnd = formatTime12hr(reservation.time_end);
      document.getElementById('eventTime').textContent = `${timeStart} - ${timeEnd}`;
    } else {
      document.getElementById('eventTime').textContent = '-';
    }
    
    // Set status with badge styling
    const statusEl = document.getElementById('status');
    const status = reservation.status || 'request';
    statusEl.textContent = status.toUpperCase();
    statusEl.className = `value status-badge ${status.toLowerCase()}`;
    
    console.log('Reservation loaded:', reservation);
  } catch (err) {
    console.error('Error in loadReservationDetails:', err);
    showCustomAlert('Error', 'An error occurred while loading reservation details', 'error');
  }
}

// ===================================
// LOAD DOCUMENTS
// ===================================
async function loadDocuments(requestId) {
  const documentGrid = document.getElementById('documentGrid');
  documentGrid.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Loading documents...</p></div>';

  try {
    const sb = getSupabase();
    if (!sb) {
      documentGrid.innerHTML = '<div class="empty-state"><p>Database connection error</p></div>';
      return;
    }

    // Fetch documents using the helper function
    const { data: documents, error } = await sb
      .rpc('get_reservation_documents', { p_request_id: requestId });

    if (error) {
      console.error('Error fetching documents:', error);
      // Fallback to direct select query
      const { data: docs, error: selectError } = await sb
        .from('reservation_documents')
        .select('*')
        .eq('request_id', requestId);
      
      if (selectError) {
        documentGrid.innerHTML = '<div class="empty-state"><p>Error loading documents</p></div>';
        return;
      }
      renderDocuments(docs || []);
    } else {
      renderDocuments(documents || []);
    }
  } catch (err) {
    console.error('Error in loadDocuments:', err);
    documentGrid.innerHTML = '<div class="empty-state"><p>Error loading documents</p></div>';
  }
}

// ===================================
// RENDER DOCUMENTS
// ===================================
function renderDocuments(documents) {
  const documentGrid = document.getElementById('documentGrid');
  
  // Create a map of existing documents
  const docMap = {};
  documents.forEach(doc => {
    docMap[doc.document_type] = doc;
  });
  
  let html = '';
  
  // Render each document type
  for (const [docType, config] of Object.entries(DOCUMENT_TYPES)) {
    const doc = docMap[docType];
    
    html += `
      <div class="document-card">
        <img src="https://img.icons8.com/ios/60/document--v1.png" alt="${config.label}">
        <p class="title">${config.label}</p>
    `;
    
    if (doc) {
      html += `
        <p class="filename">${escapeHtml(doc.filename)}</p>
        <p class="upload-date">Uploaded: ${formatDate(doc.created_at)}</p>
        ${doc.uploaded_by_name ? `<p class="uploaded-by">By: ${escapeHtml(doc.uploaded_by_name)}</p>` : ''}
        <div class="card-actions">
          <a href="${doc.file_url}" target="_blank" class="view-btn">View</a>
          <a href="${doc.file_url}" download class="download-btn">Download</a>
        </div>
      `;
    } else {
      html += `<p class="filename no-document">No document uploaded</p>`;
    }
    
    html += '</div>';
  }
  
  // Show upload section if reservation is approved
  if (currentReservation && currentReservation.status === 'approved') {
    document.getElementById('uploadSection').style.display = 'block';
    
    // Enable/disable upload buttons based on existing uploads
    const frfDoc = docMap['frf'];
    const signedApprovalDoc = docMap['signed_approval'];
    
    // Update FRF card if already uploaded
    if (frfDoc) {
      const frfCard = document.getElementById('frfUploadCard');
      frfCard.classList.add('has-file');
      document.getElementById('frfStatus').innerHTML = `<span class="success">✓ Already uploaded: ${escapeHtml(frfDoc.filename)}</span>`;
    }
    
    // Update Signed Approval card if already uploaded
    if (signedApprovalDoc) {
      const saCard = document.getElementById('signedApprovalUploadCard');
      saCard.classList.add('has-file');
      document.getElementById('signedApprovalStatus').innerHTML = `<span class="success">✓ Already uploaded: ${escapeHtml(signedApprovalDoc.filename)}</span>`;
    }
  } else {
    document.getElementById('uploadSection').style.display = 'none';
  }
  
  documentGrid.innerHTML = html;
}

// ===================================
// SETUP FILE INPUTS
// ===================================
function setupFileInputs() {
  // FRF file input
  const frfInput = document.getElementById('frfFile');
  if (frfInput) {
    frfInput.addEventListener('change', function() {
      handleFileSelect('frf', this);
    });
  }
  
  // Signed Approval file input
  const saInput = document.getElementById('signedApprovalFile');
  if (saInput) {
    saInput.addEventListener('change', function() {
      handleFileSelect('signed_approval', this);
    });
  }
}

// ===================================
// HANDLE FILE SELECT
// ===================================
// Helper to convert docType to element ID suffix (camelCase for signed_approval)
function getElementIdSuffix(docType) {
  return docType.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
}

function handleFileSelect(docType, inputEl) {
  const file = inputEl.files[0];
  const idSuffix = getElementIdSuffix(docType);
  const statusEl = document.getElementById(`${idSuffix}Status`);
  const uploadBtn = document.getElementById(`${idSuffix}UploadBtn`);
  const cardEl = document.getElementById(`${idSuffix}UploadCard`);
  
  if (!file) {
    statusEl.textContent = '';
    uploadBtn.disabled = true;
    cardEl.classList.remove('has-file');
    return;
  }
  
  // Validate file type
  if (file.type !== 'application/pdf') {
    statusEl.innerHTML = '<span class="error">✕ Please select a PDF file</span>';
    uploadBtn.disabled = true;
    inputEl.value = '';
    return;
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    statusEl.innerHTML = '<span class="error">✕ File size must be less than 10MB</span>';
    uploadBtn.disabled = true;
    inputEl.value = '';
    return;
  }
  
  // Store file reference
  uploadedFiles[docType] = file;
  
  // Update UI
  statusEl.innerHTML = `<span class="success">✓ Selected: ${escapeHtml(file.name)} (${formatFileSize(file.size)})</span>`;
  uploadBtn.disabled = false;
  cardEl.classList.add('has-file');
}

// ===================================
// UPLOAD DOCUMENT
// ===================================
async function uploadDocument(docType) {
  const file = uploadedFiles[docType];
  const requestId = document.getElementById('currentRequestId').value;
  
  if (!file) {
    showCustomAlert('Error', 'Please select a file first', 'error');
    return;
  }
  
  if (!requestId) {
    showCustomAlert('Error', 'No reservation ID found', 'error');
    return;
  }
  
  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
  const userRole = localStorage.getItem('role_name') || 'faculty';
  
  const idSuffix = getElementIdSuffix(docType);
  const statusEl = document.getElementById(`${idSuffix}Status`);
  const uploadBtn = document.getElementById(`${idSuffix}UploadBtn`);
  
  try {
    // Disable button during upload
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    statusEl.innerHTML = '<span class="uploading">⏳ Uploading...</span>';
    
    showLoading('Uploading document...', 'Please wait');
    
    const sb = getSupabase();
    if (!sb) {
      throw new Error('Database connection error');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${docType}_${timestamp}.${extension}`;
    const storagePath = `Reserved Facilities/${requestId}/${filename}`;
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, uint8Array, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload file');
    }
    
    // Get public URL
    const { data: urlData } = sb.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    
    const fileUrl = urlData.publicUrl;
    
    // Save document metadata to database
    const { data: docData, error: docError } = await sb
      .rpc('add_reservation_document', {
        p_request_id: requestId,
        p_document_type: docType,
        p_filename: file.name,
        p_file_url: fileUrl,
        p_file_size: file.size,
        p_uploaded_by: userId,
        p_uploaded_by_role: userRole
      });
    
    if (docError) {
      console.error('Database save error:', docError);
      // Try direct insert as fallback
      const { error: directError } = await sb
        .from('reservation_documents')
        .upsert({
          request_id: requestId,
          document_type: docType,
          filename: file.name,
          file_url: fileUrl,
          file_size: file.size,
          uploaded_by: userId,
          uploaded_by_role: userRole
        }, {
          onConflict: 'request_id,document_type'
        });
      
      if (directError) {
        throw new Error('Failed to save document metadata');
      }
    }
    
    hideLoading();
    showCustomAlert('Success', `${DOCUMENT_TYPES[docType].label} uploaded successfully!`, 'success');
    
    // Update UI
    statusEl.innerHTML = `<span class="success">✓ Uploaded: ${escapeHtml(file.name)}</span>`;
    const cardEl = document.getElementById(`${idSuffix}UploadCard`);
    cardEl.classList.add('has-file');
    
    // Clear file input
    const fileInput = document.getElementById(`${idSuffix}File`);
    if (fileInput) fileInput.value = '';
    
    // Reload documents
    await loadDocuments(requestId);
    
  } catch (err) {
    hideLoading();
    console.error('Upload error:', err);
    statusEl.innerHTML = `<span class="error">✕ Upload failed: ${err.message}</span>`;
    showCustomAlert('Upload Failed', err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = `Upload ${DOCUMENT_TYPES[docType].label}`;
  }
}

// Make uploadDocument globally available
window.uploadDocument = uploadDocument;

// ===================================
// UTILITY FUNCTIONS
// ===================================
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make utility functions globally available
window.formatTime12hr = formatTime12hr;
window.formatDate = formatDate;
window.formatFileSize = formatFileSize;
window.escapeHtml = escapeHtml;