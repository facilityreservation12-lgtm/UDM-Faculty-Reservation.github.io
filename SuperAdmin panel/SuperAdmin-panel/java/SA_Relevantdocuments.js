// ===================================
// SA RELEVANT DOCUMENTS JAVASCRIPT
// SuperAdmin Panel - Document Management
// ===================================

// Configuration
const STORAGE_BUCKET = 'facilityreservation';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Document types with upload permissions
const DOCUMENT_TYPES = {
  frf: { label: 'FRF', uploadBy: 'user', canUpload: false },
  signed_approval: { label: 'Signed Approval', uploadBy: 'user', canUpload: false },
  approval: { label: 'Approval', uploadBy: 'admin', canUpload: true },
  venue_slip: { label: 'Facility Slip', uploadBy: 'admin', canUpload: true },
  cash_invoice: { label: 'Cash Invoice', uploadBy: 'admin', canUpload: true },
  permit_to_use_facility: { label: 'Permit to Use Facility', uploadBy: 'admin', canUpload: true }
};

// Global state
let currentRequestId = null;
let currentReservation = null;
let selectedFiles = {};

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
  console.log('SA_Relevantdocuments initializing...');
  
  // Get request_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentRequestId = urlParams.get('request_id');
  
  if (!currentRequestId) {
    showCustomAlert('Error', 'No reservation ID provided.', 'error');
    document.getElementById('documentGrid').innerHTML = '<p class="error-message">No reservation specified</p>';
    return;
  }
  
  // Load reservation details
  await loadReservationDetails();
  
  // Load documents
  await loadDocuments();
  
  // Setup file inputs
  setupFileInputs();
});

// ===================================
// LOAD RESERVATION DETAILS
// ===================================
async function loadReservationDetails() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not initialized');
      return;
    }

    // Fetch reservation with user info
    const { data: reservation, error } = await sb
      .from('reservations')
      .select(`
        *,
        users:id (first_name, last_name, email)
      `)
      .eq('request_id', currentRequestId)
      .single();

    if (error) {
      console.error('Error fetching reservation:', error);
      return;
    }

    if (!reservation) {
      showCustomAlert('Error', 'Reservation not found', 'error');
      return;
    }

    currentReservation = reservation;
    
    // Update reservation info section
    const infoSection = document.getElementById('reservationInfo');
    infoSection.style.display = 'block';
    
    document.getElementById('infoRequestId').textContent = reservation.request_id || '-';
    document.getElementById('infoFacility').textContent = reservation.facility || '-';
    document.getElementById('infoEvent').textContent = reservation.title_of_the_event || '-';
    
    // Get requester name
    if (reservation.users) {
      const fullName = `${reservation.users.first_name || ''} ${reservation.users.last_name || ''}`.trim();
      document.getElementById('infoRequester').textContent = fullName || reservation.users.email || '-';
    } else {
      document.getElementById('infoRequester').textContent = '-';
    }
    
    console.log('Reservation loaded:', reservation);
  } catch (err) {
    console.error('Error in loadReservationDetails:', err);
  }
}

// ===================================
// LOAD DOCUMENTS
// ===================================
async function loadDocuments() {
  const documentGrid = document.getElementById('documentGrid');
  documentGrid.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Loading documents...</p></div>';

  try {
    const sb = getSupabase();
    if (!sb) {
      documentGrid.innerHTML = '<p class="error-message">Database connection error</p>';
      return;
    }

    // Fetch documents using RPC or direct select
    let documents = [];
    const { data: docs, error } = await sb
      .rpc('get_reservation_documents', { p_request_id: currentRequestId });

    if (error) {
      console.warn('RPC error, trying direct select:', error);
      const { data: directDocs, error: selectError } = await sb
        .from('reservation_documents')
        .select('*')
        .eq('request_id', currentRequestId);
      
      if (selectError) {
        documentGrid.innerHTML = '<p class="error-message">Error loading documents</p>';
        return;
      }
      documents = directDocs || [];
    } else {
      documents = docs || [];
    }

    renderDocuments(documents);
    
    // Show upload section for super_admin
    const userRole = localStorage.getItem('role_name') || localStorage.getItem('user_role');
    if (userRole === 'super_admin') {
      document.getElementById('uploadSection').style.display = 'block';
    }
    
  } catch (err) {
    console.error('Error in loadDocuments:', err);
    documentGrid.innerHTML = '<p class="error-message">Error loading documents</p>';
  }
}

// ===================================
// RENDER DOCUMENTS
// ===================================
function renderDocuments(documents) {
  const documentGrid = document.getElementById('documentGrid');
  
  // Create map of existing documents
  const docMap = {};
  documents.forEach(doc => {
    docMap[doc.document_type] = doc;
  });
  
  let html = '';
  
  for (const [docType, config] of Object.entries(DOCUMENT_TYPES)) {
    const doc = docMap[docType];
    const hasDoc = !!doc;
    
    html += `
      <div class="document-card ${hasDoc ? 'has-document' : 'no-document'}">
        <p class="title">${config.label}</p>
        <img src="https://img.icons8.com/ios/100/document--v1.png" alt="${config.label}" />
    `;
    
    if (hasDoc) {
      html += `
        <p class="filename">${escapeHtml(doc.filename)}</p>
        <div class="card-actions">
          <a href="${doc.file_url}" target="_blank" class="action-btn view">View</a>
          <a href="${doc.file_url}" download class="action-btn download">Download</a>
        </div>
      `;
    } else {
      html += `<p class="filename">No document uploaded</p>`;
    }
    
    html += '</div>';
  }
  
  documentGrid.innerHTML = html;
  
  // Update upload card statuses
  updateUploadCardStatuses(docMap);
}

// ===================================
// UPDATE UPLOAD CARD STATUSES
// ===================================
function updateUploadCardStatuses(docMap) {
  for (const [docType, config] of Object.entries(DOCUMENT_TYPES)) {
    if (!config.canUpload) continue;
    
    const doc = docMap[docType];
    const statusEl = document.getElementById(`status-${docType}`);
    const cardEl = document.getElementById(`upload-${docType}`);
    
    if (doc) {
      statusEl.innerHTML = `<span class="uploaded">✓ Uploaded: ${escapeHtml(doc.filename)}</span>`;
      cardEl.classList.add('has-file');
    } else {
      statusEl.innerHTML = '';
      cardEl.classList.remove('has-file');
    }
  }
}

// ===================================
// SETUP FILE INPUTS
// ===================================
function setupFileInputs() {
  for (const docType of Object.keys(DOCUMENT_TYPES)) {
    const input = document.getElementById(`file-${docType}`);
    if (input) {
      input.addEventListener('change', function() {
        handleFileSelect(docType, this);
      });
    }
  }
}

// ===================================
// HANDLE FILE SELECT
// ===================================
function handleFileSelect(docType, inputEl) {
  const file = inputEl.files[0];
  const statusEl = document.getElementById(`status-${docType}`);
  const uploadBtn = document.getElementById(`btn-${docType}`);
  const cardEl = document.getElementById(`upload-${docType}`);
  
  if (!file) {
    statusEl.innerHTML = '';
    uploadBtn.disabled = true;
    cardEl.classList.remove('has-file');
    delete selectedFiles[docType];
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
  selectedFiles[docType] = file;
  
  // Update UI
  statusEl.innerHTML = `<span class="selected">✓ Selected: ${escapeHtml(file.name)}</span>`;
  uploadBtn.disabled = false;
  cardEl.classList.add('has-file');
}

// ===================================
// UPLOAD DOCUMENT
// ===================================
async function uploadDocument(docType) {
  const file = selectedFiles[docType];
  
  if (!file) {
    showCustomAlert('Error', 'Please select a file first', 'error');
    return;
  }
  
  if (!currentRequestId) {
    showCustomAlert('Error', 'No reservation ID found', 'error');
    return;
  }
  
  const userId = localStorage.getItem('user_id') || localStorage.getItem('id');
  const userRole = localStorage.getItem('role_name') || 'super_admin';
  
  const statusEl = document.getElementById(`status-${docType}`);
  const uploadBtn = document.getElementById(`btn-${docType}`);
  
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
    const filename = `${docType}_${timestamp}.pdf`;
    const storagePath = `Reserved Facilities/${currentRequestId}/${filename}`;
    
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
        p_request_id: currentRequestId,
        p_document_type: docType,
        p_filename: file.name,
        p_file_url: fileUrl,
        p_file_size: file.size,
        p_uploaded_by: userId,
        p_uploaded_by_role: userRole
      });
    
    if (docError) {
      console.warn('RPC error, trying direct upsert:', docError);
      // Try direct upsert as fallback
      const { error: directError } = await sb
        .from('reservation_documents')
        .upsert({
          request_id: currentRequestId,
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
    const cardEl = document.getElementById(`upload-${docType}`);
    cardEl.classList.add('has-file');
    
    // Clear file input
    const fileInput = document.getElementById(`file-${docType}`);
    if (fileInput) fileInput.value = '';
    
    // Reload documents
    await loadDocuments();
    
  } catch (err) {
    hideLoading();
    console.error('Upload error:', err);
    statusEl.innerHTML = `<span class="error">✕ Upload failed: ${err.message}</span>`;
    showCustomAlert('Upload Failed', err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload';
  }
}

// Make uploadDocument globally available
window.uploadDocument = uploadDocument;

// ===================================
// UTILITY FUNCTIONS
// ===================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.escapeHtml = escapeHtml;