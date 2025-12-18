const facilityCodes = {
  "Palma Hall": "PH",
  "Right Wing Lobby": "RW",
  "Mehan Garden": "MG",
  "Rooftop": "RT",
  "Classroom": "CR",
  "Basketball Court": "BC",
  "Ground Floor Space": "GF",
  "Space at the Ground Floor": "GF",
  "Others": "OT"
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function toYMD(dateOrString) {
  if (!dateOrString) return null;
  const d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
  if (isNaN(d)) return null;
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function facilityListFromString(s) {
  if (!s) return [];
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function getLocalDatetimeLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function getCodePrefix(fac) {
  if (!fac) return "PH";
  if (facilityCodes[fac]) return facilityCodes[fac];
  const f = fac.toLowerCase();
  if (f.includes("palma")) return "PH";
  if (f.includes("right wing") || f.includes("rightwing") || f.includes("right")) return "RW";
  if (f.includes("mehan")) return "MG";
  if (f.includes("rooftop")) return "RT";
  if (f.includes("classroom") || f.includes("room")) return "CR";
  if (f.includes("basket") || f.includes("court")) return "BC";
  if (f.includes("ground") || f.includes("floor")) return "GF";
  return "PH";
}

// Add safe Supabase client getter to avoid "cannot access before initialization"
function getSupabase() {
	// prefer initialized client set by your supabaseClient.js
	if (typeof window !== 'undefined') {
		if (window.supabaseClient) return window.supabaseClient;
		if (window.supabase) return window.supabase;
	}
	// fallback to global variable
	if (typeof supabase !== 'undefined') return supabase;
	return null;
}

// Supabase conflict check for reservations
async function checkConflict(sb, facility, date, start, end) {
  const { data, error } = await sb
    .from("reservations")
    .select("*")
    .eq("facility", facility)
    .eq("date", date)
    .or(`and(time_start <= '${end}', time_end >= '${start}')`);

  if (error) {
    console.error('Conflict check error:', error);
    return false;
  }
  return data && data.length > 0;
}

// Replace loadUserDetails to use safe client
async function loadUserDetails() {
  try {
    const sb = getSupabase();
    let userId = localStorage.getItem('user_id');

    // Try to get user id from active session if client available
    if (sb && sb.auth && sb.auth.getSession) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user?.id) userId = session.user.id;
      } catch (sessionErr) {
        console.warn('getSession error (fallback to localStorage):', sessionErr);
      }
    }

    if (!userId) {
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = '';
      console.warn('No user_id available from session or localStorage');
      return;
    }

    const sbClient = getSupabase();
    if (!sbClient) {
      console.warn('Supabase client not available; cannot fetch user profile. Using stored user_id:', userId);
      // keep stored id but cannot enrich UI with profile data
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'User ' + userId;
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = '';
      return;
    }

    const { data, error } = await sbClient
      .from('users')
      .select('id, first_name, last_name, role_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error fetching user:', error);
      if (document.getElementById('UserName')) document.getElementById('UserName').textContent = 'Unknown User';
      if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = 'Unknown Role';
      return;
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown User';
    const firstName = data.first_name || '';
    if (document.getElementById('UserName')) document.getElementById('UserName').textContent = userName;
    if (document.getElementById('UserRole')) document.getElementById('UserRole').textContent = data.role_name || 'Unknown Role';
    if (document.getElementById('welcomeUserName')) document.getElementById('welcomeUserName').textContent = firstName;
    localStorage.setItem('user_id', data.id);
  } catch (err) {
    console.error('loadUserDetails error:', err);
  }
}

if (document.getElementById('UserName') && document.getElementById('UserRole')) {
  loadUserDetails();
}

// Add helper to ensure there's an active Supabase session
async function ensureActiveSession(sb) {
  if (!sb || !sb.auth || !sb.auth.getSession) return false;
  try {
    const { data: { session } } = await sb.auth.getSession();
    return !!(session && session.user && session.access_token);
  } catch (err) {
    console.warn('ensureActiveSession getSession error:', err);
    return false;
  }
}

// Replace uploadToSupabase: try upload, return null on storage/RLS failure (do not throw NO_SESSION)
async function uploadToSupabase(file, path) {
	try {
		const sb = getSupabase();
		if (!sb) throw new Error('Supabase client not initialized. Ensure supabaseClient.js is loaded before this script.');

		const options = {
			cacheControl: '3600',
			contentType: file.type || 'application/octet-stream',
			upsert: true
		};

		const { data, error } = await sb.storage
			.from('facilityreservation')
			.upload(path, file, options);

		if (error) {
			// If RLS or permission error, don't throw to crash the whole form — return null and let caller handle fallback
			console.warn('Storage upload failed:', error);
			return null;
		}
		return data;
	} catch (err) {
		// Unexpected errors: log and return null so caller can fallback
		console.error('Upload error:', err);
		return null;
	}
}

// Add helper to convert File / Blob to base64
async function fileToBase64(fileOrBlob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // return only base64 payload
      reader.onerror = err => reject(err);
      // File or Blob accepted by readAsDataURL
      reader.readAsDataURL(fileOrBlob);
    } catch (err) {
      reject(err);
    }
  });
}

// Convert base64 payload to Blob
function base64ToBlob(base64, mime) {
	try {
		const binary = atob(base64);
		const len = binary.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return new Blob([bytes], { type: mime || 'application/octet-stream' });
	} catch (err) {
		console.error('base64ToBlob error:', err);
		return null;
	}
}

// Add IndexedDB helpers (new)
function openIDB() {
	// returns Promise<IDBDatabase>
	return new Promise((resolve, reject) => {
		try {
			const req = indexedDB.open('udm_reservations_db', 1);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains('files')) {
					db.createObjectStore('files');
				}
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error || new Error('IndexedDB open error'));
		} catch (err) {
			reject(err);
		}
	});
}

async function storeFileInIDB(key, file) {
	const db = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('files', 'readwrite');
		const store = tx.objectStore('files');
		const req = store.put(file, key);
		req.onsuccess = () => resolve(true);
		req.onerror = (e) => reject(e.target.error || new Error('IndexedDB put error'));
	});
}

async function getFileFromIDB(key) {
	const db = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('files', 'readonly');
		const store = tx.objectStore('files');
		const req = store.get(key);
		req.onsuccess = () => resolve(req.result || null);
		req.onerror = (e) => reject(e.target.error || new Error('IndexedDB get error'));
	});
}

async function deleteFileFromIDB(key) {
	const db = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('files', 'readwrite');
		const store = tx.objectStore('files');
		const req = store.delete(key);
		req.onsuccess = () => resolve(true);
		req.onerror = (e) => reject(e.target.error || new Error('IndexedDB delete error'));
	});
}

document.querySelectorAll('.menu a').forEach(link => {
  if (
    link.href &&
    window.location.pathname.endsWith(link.getAttribute('href'))
  ) {
    link.classList.add('active');
  }
});

  const panel = document.getElementById("notificationPanel");
  const overlay = document.getElementById("notificationOverlay");

  function toggleNotificationPanel(event) {
    if (event) event.preventDefault();
    if (!panel || !overlay) return;
    const willOpen = !panel.classList.contains("active");
    panel.classList.toggle("active");
    overlay.classList.toggle("active");
    if (willOpen) {
      markNotificationsAsSeen();
    }
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      if (panel?.classList.contains("active")) {
        toggleNotificationPanel();
      }
    });
  }

  function showConflictModal(messageHtml) {
  const modal = document.getElementById('conflictModal');
  const body = document.getElementById('conflictModalBody');
  body.innerHTML = messageHtml;
  modal.style.display = 'flex';

  document.getElementById('conflictModalOkBtn').onclick =
    document.getElementById('closeConflictModalBtn').onclick = function() {
      modal.style.display = 'none';
    };
}


// Auto-fill date from calendar selection
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateOfEvent = urlParams.get('dateOfEvent');
    
    if (dateOfEvent) {
        const dateInput = document.getElementById('dateOfEvent');
        if (dateInput) {
            dateInput.value = dateOfEvent;
            console.log('Auto-filled date from calendar:', dateOfEvent);
        } else {
            console.error('dateOfEvent input field not found');
        }
    } else {
        console.log('No dateOfEvent parameter in URL');
    }
});

window.addEventListener('beforeunload', removeRealtimeChannel);

// Retry uploads for reservations saved locally with base64 files
async function retryLocalUploads(sb) {
	if (!sb) return;
	let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
	if (!Array.isArray(reservations) || reservations.length === 0) return;

	let changed = false;
	for (let i = 0; i < reservations.length; i++) {
		const r = reservations[i];
		// signatureKey case
		if (r.signatureKey && r.signatureName) {
			try {
				const file = await getFileFromIDB(r.signatureKey);
				if (!file) continue;
				console.log('Retrying signature upload for', r.signatureName);
				const up = await uploadToSupabase(new File([file], r.signatureName, { type: file.type || 'application/octet-stream' }), `Reserved Facilities/${r.signatureName}`);
				if (up) {
					// remove IDB entry and metadata
					await deleteFileFromIDB(r.signatureKey);
					delete r.signatureKey;
					delete r.signatureName;
					changed = true;
					console.log('Signature re-uploaded for', r.codeId || r.request_id || '(unknown)');
				}
			} catch (err) {
				console.warn('Retry signature upload failed for', r.signatureName, err);
			}
		}

		// pdfKey case - regenerate PDF with new format
		if (r.pdfKey && r.pdfName) {
			try {
				// Check if this is an old format PDF that needs regeneration
				const needsRegeneration = r.pdfFormatVersion !== 'v2' || !r.pdfFormatVersion;
				
				if (needsRegeneration) {
					console.log('Regenerating PDF with new format for', r.pdfName);
					
					// Temporarily populate form with reservation data for PDF generation
					const tempForm = document.createElement('div');
					tempForm.className = 'form-container';
					tempForm.innerHTML = generateFormHTML(r);
					tempForm.style.position = 'absolute';
					tempForm.style.left = '-9999px';
					tempForm.style.top = '-9999px';
					document.body.appendChild(tempForm);
					
					// Generate new PDF with improved format
					const pdfOptions = {
						margin: [0, 10, 10, 10],
						filename: r.pdfName,
						image: { type: 'jpeg', quality: 0.95 },
						html2canvas: { 
							scale: 1.5,
							useCORS: true,
							letterRendering: true,
							allowTaint: false,
							backgroundColor: '#ffffff'
						},
						jsPDF: { 
							unit: 'mm', 
							format: 'a4', 
							orientation: 'portrait',
							compress: true
						},
						pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
					};
					
					const pdfBlob = await html2pdf().set(pdfOptions).from(tempForm).output('blob');
					document.body.removeChild(tempForm);
					
					// Upload new PDF
					const upPdf = await uploadToSupabase(
						new Blob([pdfBlob], { type: 'application/pdf' }), 
						`Reserved Facilities/${r.pdfName}`
					);
					
					if (upPdf) {
						await deleteFileFromIDB(r.pdfKey);
						delete r.pdfKey;
						delete r.pdfName;
						r.pdfFormatVersion = 'v2'; // Mark as new format
						changed = true;
						console.log('PDF regenerated with new format for', r.codeId || r.request_id || '(unknown)');
					}
				} else {
					// Just retry upload of existing PDF
					const file = await getFileFromIDB(r.pdfKey);
					if (!file) continue;
					console.log('Retrying PDF upload for', r.pdfName);
					const upPdf = await uploadToSupabase(new File([file], r.pdfName, { type: file.type || 'application/pdf' }), `Reserved Facilities/${r.pdfName}`);
					if (upPdf) {
						await deleteFileFromIDB(r.pdfKey);
						delete r.pdfKey;
						delete r.pdfName;
						changed = true;
						console.log('PDF re-uploaded for', r.codeId || r.request_id || '(unknown)');
					}
				}
			} catch (err) {
				console.warn('Retry PDF upload failed for', r.pdfName, err);
			}
		}

		// small delay to avoid hammering
		await new Promise(res => setTimeout(res, 200));
	}

	if (changed) {
		localStorage.setItem('reservations', JSON.stringify(reservations));
		console.log('Local reservations updated after retry attempts.');
	}
}

// Helper function to generate form HTML for PDF regeneration
function generateFormHTML(reservation) {
	return `
		<h2>Venue Reservation Form</h2>
		<div class="row">
			<div>
				<label>Date/Time Received: <input type="datetime-local" value="${reservation.dateReceived || ''}" readonly></label><br>
				<label>Date Filed: <input type="date" value="${reservation.dateFiled || ''}" readonly></label>
			</div>
			<label>Date of Event: <input type="date" value="${reservation.dateOfEvent || ''}" readonly></label>
			<div class="time-inputs">
				<label>Time Start: <input type="time" value="${reservation.timeStart || ''}" readonly></label>
				<label>Time End: <input type="time" value="${reservation.timeEnd || ''}" readonly></label>
			</div>
		</div>
		<div class="row">
			<label>Unit/Office/College: <input type="text" value="${reservation.unitOffice || ''}" readonly></label>          
			<label>Attendees: <input type="text" value="${reservation.attendees || ''}" readonly></label>
		</div>
		<div class="row">
			<label>Title of Event/Activity: <input type="text" value="${reservation.eventTitle || ''}" readonly></label>
			<label>Additional Requirements: <input type="text" value="${reservation.additionalReq || ''}" readonly></label>
		</div>
		<div id="facilityDetails" class="facility-details">
			<div class="facility-title">Selected Facility:</div>
			<div class="facility-info">${reservation.facility || ''}</div>
		</div>
		<div id="setupDetails" class="facility-details">
			<div class="facility-title">Selected Setup:</div>
			<div class="facility-info">${reservation.setupDetails || ''}</div>
		</div>
		<div class="signatures">
			<div class="signContainer">
				Requested by:<br>
				<div class="signature-drop-area">
					<p>Drop your signature here or click to browse</p>
					<small>Accepted formats: JPG, PNG</small>
				</div>
				<div class="Personel">(Name and E-signature)<br>End-User/Requester/Event organizer</div>
			</div>
			<div class="signContainer">
				Recommending Approval:<br><br><br>
				<div class="Personel">Head, Maintenance & Engineering Division</div>
			</div>
			<div class="signContainer">
				Approved by:<br><br><br>
				<div class="Personel">VP for Administration</div>
			</div>
		</div>
	`;
}

const UNSEEN_NOTIF_COUNT_KEY = 'notification_unseen_count';
let reservationRealtimeChannel = null;

function getCurrentUserId() {
  return localStorage.getItem('user_id') ||
         localStorage.getItem('id') ||
         localStorage.getItem('userId') ||
         localStorage.getItem('currentUserId');
}

function getUnseenNotificationCount() {
  const stored = parseInt(localStorage.getItem(UNSEEN_NOTIF_COUNT_KEY) || '0', 10);
  return Number.isNaN(stored) ? 0 : stored;
}

function setUnseenNotificationCount(count) {
  const safeCount = Math.max(0, count);
  localStorage.setItem(UNSEEN_NOTIF_COUNT_KEY, String(safeCount));
  updateNotificationIndicatorUI(safeCount);
}

function bumpUnseenNotificationCount(incrementBy = 1) {
  setUnseenNotificationCount(getUnseenNotificationCount() + incrementBy);
}

function markNotificationsAsSeen() {
  setUnseenNotificationCount(0);
  localStorage.setItem('notificationsLastSeenAt', new Date().toISOString());
}

function updateNotificationIndicatorUI(count = getUnseenNotificationCount()) {
  const dot = document.getElementById('notificationDot');
  const badge = document.getElementById('notificationCount');
  const isActive = count > 0;
  if (dot) dot.classList.toggle('active', isActive);
  if (badge) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('active', isActive);
  }
}

function initNotificationIndicator() {
  updateNotificationIndicatorUI();
}

function removeRealtimeChannel() {
  const sb = getSupabase();
  if (reservationRealtimeChannel && sb?.removeChannel) {
    sb.removeChannel(reservationRealtimeChannel);
    reservationRealtimeChannel = null;
  }
}

async function initRealtimeNotifications() {
  const sb = getSupabase();
  const userId = getCurrentUserId();
  if (!sb || !userId || !sb.channel) return;

  removeRealtimeChannel();
  reservationRealtimeChannel = sb
    .channel(`reservation-status-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `id=eq.${userId}` }, handleRealtimeReservationPayload)
    .subscribe();
}

async function handleRealtimeReservationPayload(payload) {
  try {
    const { eventType } = payload;
    if (eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) {
      showStatusChangeNotification(payload.new, payload.old?.status, payload.new?.status);
    }
    if (['INSERT', 'UPDATE', 'DELETE'].includes(eventType)) {
      await loadUserNotifications();
    }
  } catch (err) {
    console.error('Realtime payload handler error:', err);
  }
}

// Load and display user notifications
async function loadUserNotifications() {
  try {
    const sb = getSupabase();
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }

    // Get current user ID
    const userId = getCurrentUserId();

    if (!userId) {
      console.log('No user logged in, skipping notifications');
      return;
    }

    // Fetch user's reservations with status information
    const { data: reservations, error } = await sb
      .from('reservations')
      .select('facility, date, time_start, time_end, title_of_the_event, status')
      .eq('id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // Get latest 10 reservations

    if (error) {
      console.error('Error fetching user notifications:', error);
      return;
    }

    // Display notifications
    const safeReservations = reservations || [];
    displayNotifications(safeReservations);
    localStorage.setItem('userReservations', JSON.stringify(safeReservations));
    updateNotificationIndicatorUI();

  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Display notifications in the notification panel
function displayNotifications(reservations) {
  const notificationContainer = document.querySelector('.notification-container');
  
  if (!notificationContainer) {
    console.log('Notification container not found');
    return;
  }

  // Clear existing notifications
  notificationContainer.innerHTML = '';

  if (reservations.length === 0) {
    notificationContainer.innerHTML = '<div class="notification-item">No notifications available</div>';
    return;
  }

  // Create notification items
  reservations.forEach(reservation => {
    const notificationItem = createNotificationItem(reservation);
    notificationContainer.appendChild(notificationItem);
  });
}

// Create individual notification item
function createNotificationItem(reservation) {
  const div = document.createElement('div');
  div.className = 'notification-item';
  
  // Format date
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format time
  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  
  // Map status for display and get color
  let displayStatus = reservation.status;
  if (reservation.status?.toLowerCase() === 'request') {
    displayStatus = 'Pending';
  }
  
  const statusColor = getStatusColor(reservation.status);
  
  // Create notification text with inline styling
  let notificationText;
  if (displayStatus?.toLowerCase() === 'approved') {
    notificationText = `Your Request for <b>${reservation.facility}</b> on <b>${formattedDate}</b> at <b>${startTime}-${endTime}</b> is <span style="color: ${statusColor}; font-weight: bold;">${displayStatus}</span>`;
  } else {
    notificationText = `Your Request for <b>${reservation.facility}</b> on <b>${formattedDate}</b> at <b>${startTime}-${endTime}</b> is currently <span style="color: ${statusColor}; font-weight: bold;">${displayStatus}</span>`;
  }
  
  div.innerHTML = notificationText;
  
  return div;
}

// Format time to 12-hour format
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

// Get status color for inline styling
function getStatusColor(status) {
  const mappedStatus = status?.toLowerCase() === 'request' ? 'pending' : status?.toLowerCase();
  
  switch (mappedStatus) {
    case 'approved':
      return '#2e7d32'; // Green
    case 'pending':
      return '#e65100'; // Orange
    case 'rejected':
    case 'denied':
      return '#c62828'; // Red
    case 'cancelled':
      return '#616161'; // Gray
    default:
      return '#424242'; // Dark gray
  }
}

// Check for status changes and show real-time notifications
async function checkForStatusUpdates() {
  try {
    const sb = getSupabase();
    if (!sb) return;

    // Get current user ID
    const userId = getCurrentUserId();

    if (!userId) return;

    // Get stored reservations from localStorage for comparison
    const storedReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
    
    // Fetch current reservations
    const { data: currentReservations, error } = await sb
      .from('reservations')
      .select('request_id, facility, date, time_start, time_end, status')
      .eq('id', userId);

    if (error) {
      console.error('Error checking status updates:', error);
      return;
    }

    // Check for status changes
    if (storedReservations.length > 0) {
      currentReservations?.forEach(current => {
        const stored = storedReservations.find(s => s.request_id === current.request_id);
        
        if (stored && stored.status !== current.status) {
          // Status changed - show notification
          showStatusChangeNotification(current, stored.status, current.status);
        }
      });
    }

    // Update stored reservations
    localStorage.setItem('userReservations', JSON.stringify(currentReservations || []));

  } catch (error) {
    console.error('Error checking status updates:', error);
  }
}

// Show real-time status change notification
function showStatusChangeNotification(reservation, oldStatus, newStatus) {
  // Format date and time
  const date = new Date(reservation.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const startTime = formatTime12hr(reservation.time_start);
  const endTime = formatTime12hr(reservation.time_end);
  
  // Map statuses for display
  const displayOldStatus = oldStatus?.toLowerCase() === 'request' ? 'Pending' : oldStatus;
  const displayNewStatus = newStatus?.toLowerCase() === 'request' ? 'Pending' : newStatus;
  
  const message = `Status Update: Your request for ${reservation.facility} on ${formattedDate} at ${startTime}-${endTime} has been changed from "${displayOldStatus}" to "${displayNewStatus}"`;
  
  bumpUnseenNotificationCount();

  // Show browser notification if supported
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Reservation Status Update', {
      body: message,
      icon: 'images/udm-logo.webp'
    });
  }
  
  // Also show in-app alert
  showCustomAlert("Status Update", message, "info");
  
  // Refresh notifications panel
  loadUserNotifications();
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}

document.addEventListener('DOMContentLoaded', async function() {
	try {
		initNotificationIndicator();

		// Request notification permission
		requestNotificationPermission();
		
		// Load initial notifications and hook realtime updates
		setTimeout(async () => {
			await loadUserNotifications();
			await checkForStatusUpdates();
			await initRealtimeNotifications();
		}, 800);
		
		// Fallback polling in case realtime disconnects
		setInterval(checkForStatusUpdates, 60000);

		// Acquire safe client once per page load
		const sb = getSupabase();
		if (!sb) {
			console.error('Supabase client not found. Ensure supabaseClient.js is loaded before VRF.js');
			return;
		}

		// Use sb for auth/session checks below
		const { data: { session }, error: sessionError } = await sb.auth.getSession();
		console.log('Initial session check:', session);

		// Attempt local re-uploads immediately if session available
		if (session?.user?.id) {
			retryLocalUploads(sb).catch(err => console.error('retryLocalUploads error:', err));
		}

		// subscribe to auth state changes using sb
		if (sb.auth && sb.auth.onAuthStateChange) {
			sb.auth.onAuthStateChange((_event, s) => {
				console.log('Auth state changed:', _event, s?.user?.id);
				if (s?.user?.id) {
					localStorage.setItem('user_id', s.user.id);
					// when a session becomes available, try to upload saved files
					retryLocalUploads(sb).catch(err => console.error('retryLocalUploads error:', err));
				}
			});
		}

		// Dropdown logic
		document.querySelectorAll('.dropdown-btn').forEach(btn => {
			btn.addEventListener('click', function (ev) {
				ev.stopPropagation();
				this.parentElement.classList.toggle('active');
			});
		});

		window.addEventListener('click', function (e) {
			document.querySelectorAll('.dropdown').forEach(drop => {
				if (!drop.contains(e.target)) drop.classList.remove('active');
			});
		});

		// Calendar date click -> Date of Event
		document.querySelectorAll('.calendar-date-cell[data-date]').forEach(cell => {
			cell.addEventListener('click', function () {
				selectDateFromCalendar(this.dataset.date);
			});
		});

		const reservationForm = document.getElementById('reservationForm');
		if (!reservationForm) return;
				// Signature drag & drop + preview
		const dropArea = document.getElementById('signatureDropArea');
		const fileInput = document.getElementById('signature');
		const previewImg = document.getElementById('signaturePreview');
		
		if (dropArea && fileInput && previewImg) {
		  dropArea.addEventListener('click', () => fileInput.click());
		
		  dropArea.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropArea.classList.add('dragover');
		  });
		
		  dropArea.addEventListener('dragleave', () => {
			dropArea.classList.remove('dragover');
		  });
		
		  dropArea.addEventListener('drop', (e) => {
			e.preventDefault();
			dropArea.classList.remove('dragover');
			if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			  fileInput.files = e.dataTransfer.files;
			  showSignaturePreview(fileInput.files[0]);
			}
		  });
		
		  fileInput.addEventListener('change', () => {
			if (fileInput.files && fileInput.files[0]) {
			  showSignaturePreview(fileInput.files[0]);
			}
		  });
		
		  function showSignaturePreview(file) {
			if (!file.type.startsWith('image/')) return;
			const reader = new FileReader();
			reader.onload = function(e) {
			  previewImg.src = e.target.result;
			  previewImg.style.display = 'block';
			};
			reader.readAsDataURL(file);
		  }
		}

		const dateFiledInput = reservationForm.querySelector('input[name="dateFiled"], input#dateFiled, input[id="dateFiled"]');
		const dateReceivedInput = reservationForm.querySelector('input[name="dateReceived"], input#dateReceived, input[id="dateReceived"]');
		const dateOfEventInput = reservationForm.querySelector('input[name="dateOfEvent"], input#dateOfEvent, input[id="dateOfEvent"]');
		const timeStartInput = reservationForm.querySelector('input[name="timeStart"], input#timeStart, input[id="timeStart"]');
		const timeEndInput = reservationForm.querySelector('input[name="timeEnd"], input#timeEnd, input[id="timeEnd"]');
		const eventTitleInput = reservationForm.querySelector('input[name="eventTitle"], textarea[name="eventTitle"], #eventTitle');

		const todayYMD = toYMD(new Date());
		if (dateFiledInput) {
			dateFiledInput.value = todayYMD;
			dateFiledInput.readOnly = true;
		}
		if (dateReceivedInput) {
			dateReceivedInput.value = getLocalDatetimeLocal();
			dateReceivedInput.readOnly = true;
		}

		// If coming from calendar page, fill date of event
		const rawSelectedDate = localStorage.getItem('selectedDate');
		if (rawSelectedDate && dateOfEventInput) {
			const normalized = toYMD(rawSelectedDate) || rawSelectedDate;
			dateOfEventInput.value = normalized;
			localStorage.removeItem('selectedDate');
		}

		// Form submission
		reservationForm.addEventListener('submit', async function (e) {
			e.preventDefault();
	 let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");

			const form = e.target;

			// Facilities
			let selectedFacilities = [];
			const selectedFacilityRadio = form.querySelector('input[name="facility"]:checked');
			if (selectedFacilityRadio) {
				selectedFacilities = [selectedFacilityRadio.value.trim()];
			}
			
			if (selectedFacilities.length === 0) {
				const facilitySelect = form.querySelector('select[name="facility"], select#facility');
				if (facilitySelect && facilitySelect.value) selectedFacilities = [facilitySelect.value.trim()];
			}
			if (selectedFacilities.length === 0) {
				showCustomAlert('Validation Error', 'Please select a facility.', 'warning');
				return;
			}

			// Date of Event
			const dateOfEventVal = dateOfEventInput && dateOfEventInput.value ? toYMD(dateOfEventInput.value) : null;
			if (!dateOfEventVal) {
				showCustomAlert('Validation Error', 'Please choose a valid Date of Event.', 'warning');
				return;
			}
			
			// Prevent reservation for past dates
			const todayYMD = toYMD(new Date());
			if (dateOfEventVal < todayYMD) {
			 showCustomAlert('Invalid Date', 'You cannot reserve a date that has already passed.', 'error');
			  return;
			}

			// Time validation
			const newStart = parseTimeToMinutes(timeStartInput && timeStartInput.value ? timeStartInput.value : null);
			const newEnd = parseTimeToMinutes(timeEndInput && timeEndInput.value ? timeEndInput.value : null);
			if (newStart === null || newEnd === null) {
				showCustomAlert('Validation Error', 'Please provide valid start and end times (HH:MM).', 'warning');
				return;
			}
			if (newStart >= newEnd) {
				showCustomAlert('Time Error', 'Start time must be earlier than end time.', 'warning');
				return;
			}

			// START LOADING HERE - Before conflict check
 			 showLoading('Checking availability...', 'Verifying facility availability');

						// Improved conflict check with recommendations
			for (let facility of selectedFacilities) {
			  // Query all reservations for this facility and date
			  const { data, error } = await sb
				.from("reservations")
				.select("time_start, time_end")
				.eq("facility", facility)
				.eq("date", dateOfEventVal);
			
			  if (error) {
				showCustomAlert("Conflict Error", "Error checking reservation conflicts. Please try again later.", "error");
				console.error('Conflict check error:', error);
				return;
			  }
			
			  // Check if any reservation overlaps
			  const requestedStart = parseTimeToMinutes(timeStartInput.value);
			  const requestedEnd = parseTimeToMinutes(timeEndInput.value);
			
			  const conflict = data.some(r => {
				const existingStart = parseTimeToMinutes(r.time_start);
				const existingEnd = parseTimeToMinutes(r.time_end);
				return requestedStart < existingEnd && requestedEnd > existingStart;
			  });
			
			  // Find available slots for recommendation
			  let slots = [];
			  const sorted = data
				.map(r => ({
				  start: parseTimeToMinutes(r.time_start),
				  end: parseTimeToMinutes(r.time_end)
				}))
				.sort((a, b) => a.start - b.start);
			
			  let lastEnd = 7 * 60;
			  for (const res of sorted) {
				if (res.start > lastEnd) {
				  slots.push({
					start: lastEnd,
					end: res.start
				  });
				}
				lastEnd = Math.max(lastEnd, res.end);
			  }
			  if (lastEnd < 19 * 60) {
				slots.push({
				  start: lastEnd,
				  end: 19 * 60
				});
			  }
			
			  if (conflict) {
				 hideLoading(); // HIDE LOADING when conflict found
				// If no slots for this facility, recommend another facility
				if (slots.length === 0) {
				  // Get all facilities
				  const allFacilities = Object.keys(facilityCodes);
				  let foundFacility = null;
				  let foundSlots = null;
			
				  for (let altFacility of allFacilities) {
					if (altFacility === facility) continue;
					const { data: altData } = await sb
					  .from("reservations")
					  .select("time_start, time_end")
					  .eq("facility", altFacility)
					  .eq("date", dateOfEventVal);
			
					// Find slots for alt facility
					let altSlots = [];
					const altSorted = (altData || [])
					  .map(r => ({
						start: parseTimeToMinutes(r.time_start),
						end: parseTimeToMinutes(r.time_end)
					  }))
					  .sort((a, b) => a.start - b.start);
			
					let altLastEnd = 7 * 60;
					for (const res of altSorted) {
					  if (res.start > altLastEnd) {
						altSlots.push({
						  start: altLastEnd,
						  end: res.start
						});
					  }
					  altLastEnd = Math.max(altLastEnd, res.end);
					}
					if (altLastEnd < 19 * 60) {
					  altSlots.push({
						start: altLastEnd,
						end: 19 * 60
					  });
					}
			
					if (altSlots.length > 0) {
					  foundFacility = altFacility;
					  foundSlots = altSlots;
					  break;
					}
				  }
			
				  if (foundFacility) {
					const slotStr = foundSlots.map(s => {
  const start = `${pad(Math.floor(s.start / 60))}:${pad(s.start % 60)}`;
  const end = `${pad(Math.floor(s.end / 60))}:${pad(s.end % 60)}`;
  return `<li>${formatTime12hr(start)} - ${formatTime12hr(end)}</li>`;
}).join('');
					const messageHtml = `
					  <strong>No slots available for "<span style="color:#234734">${facility}</span>" on <span style="color:#234734">${dateOfEventVal}</span>.</strong>
					  <br><br>
					  <span>Recommended facility: <b>${foundFacility}</b></span>
					  <br><br>
					  <span style="font-weight:bold;">Available slots:</span>
					  <ul style="margin:0 0 0 1.2em;padding:0;">${slotStr}</ul>
					`;
					showConflictModal(messageHtml);
					return;
				  } else {
					// If all facilities are full for this date, recommend another date
					let nextDate = null;
					for (let offset = 1; offset <= 7; offset++) {
					  const tryDate = new Date(dateOfEventVal);
					  tryDate.setDate(tryDate.getDate() + offset);
					  const tryDateYMD = toYMD(tryDate);
			
					  let found = false;
					  for (let altFacility of allFacilities) {
						const { data: altData } = await sb
						  .from("reservations")
						  .select("time_start, time_end")
						  .eq("facility", altFacility)
						  .eq("date", tryDateYMD);
			
						let altSlots = [];
						const altSorted = (altData || [])
						  .map(r => ({
							start: parseTimeToMinutes(r.time_start),
							end: parseTimeToMinutes(r.time_end)
						  }))
						  .sort((a, b) => a.start - b.start);
			
						let altLastEnd = 7 * 60;
						for (const res of altSorted) {
						  if (res.start > altLastEnd) {
							altSlots.push({
							  start: altLastEnd,
							  end: res.start
							});
						  }
						  altLastEnd = Math.max(altLastEnd, res.end);
						}
						if (altLastEnd < 19 * 60) {
						  altSlots.push({
							start: altLastEnd,
							end: 19 * 60
						  });
						}
			
						if (altSlots.length > 0) {
						  nextDate = tryDateYMD;
						  found = true;
						  break;
						}
					  }
					  if (found) break;
					}
			
					if (nextDate) {
					  const messageHtml = `
						<strong>All facilities are fully booked for <span style="color:#234734">${dateOfEventVal}</span>.</strong>
						<br><br>
						<span>Recommended date: <b>${nextDate}</b></span>
						<br><br>
						<span>Please try reserving for this date.</span>
					  `;
					  showConflictModal(messageHtml);
					  return;
					} else {
					  // If all dates in the next week are full, recommend next month
					  const currentDate = new Date(dateOfEventVal);
					  let nextMonth = currentDate.getMonth() + 1;
					  let nextYear = currentDate.getFullYear();
					  if (nextMonth > 11) {
						nextMonth = 0;
						nextYear += 1;
					  }
					  const firstDayNextMonth = new Date(nextYear, nextMonth, 1);
					  const nextMonthYMD = toYMD(firstDayNextMonth);
			
					  const messageHtml = `
						<strong>All facilities and dates are fully booked for this week.</strong>
						<br><br>
						<span>Recommended month: <b>${pad(nextMonth + 1)}-${nextYear}</b></span>
						<br><br>
						<span>Please try reserving for next month.</span>
					  `;
					  showConflictModal(messageHtml);
					  return;
					}
				  }
				} else {
				  // If there are available slots for the selected facility, show them
				  const slotStr = slots.map(s => {
  const start = `${pad(Math.floor(s.start / 60))}:${pad(s.start % 60)}`;
  const end = `${pad(Math.floor(s.end / 60))}:${pad(s.end % 60)}`;
  return `<li>${formatTime12hr(start)} - ${formatTime12hr(end)}</li>`;
}).join('');
				  const messageHtml = `
					<strong>The facility "<span style="color:#234734">${facility}</span>" is already reserved for <span style="color:#234734">${dateOfEventVal}</span> during the selected time.</strong>
					<br><br>
					<span>Please pick another time.</span>
					<br><br>
					<span style="font-weight:bold;">Available slots for this date:</span>
					<ul style="margin:0 0 0 1.2em;padding:0;">${slotStr}</ul>
				  `;
				  showConflictModal(messageHtml);
				  return;
				}
			  }
			}
			  // UPDATE LOADING TEXT - Conflict check passed, now processing
  			showLoading('Processing reservation...', 'Preparing your reservation details');

			// Generate sequential code for the facility (query DB for existing max, fallback to local)
			const firstFacility = selectedFacilities[0];
			const codePrefix = getCodePrefix(firstFacility);
			let codeId = null;
			try {
				// Query existing request_ids with this prefix
				const { data: existingReqs, error: reqError } = await sb
					.from('reservations')
					.select('request_id')
					.like('request_id', `${codePrefix}-%`);
				console.log('Debug: existingReqs for prefix', codePrefix, existingReqs && existingReqs.length);
				if (reqError) {
					console.warn('Could not query existing request_ids for prefix, falling back to local:', reqError);
				} else {
					// existingReqs may be empty array; compute numeric parts safely
					const nums = (existingReqs || [])
						.map(r => {
							if (!r || !r.request_id) return null;
							const parts = String(r.request_id).split('-');
							const num = parseInt(parts[1], 10);
							return Number.isFinite(num) ? num : null;
						})
						.filter(n => n !== null && !isNaN(n) && n >= 0);
					console.log('Debug: numeric parts extracted for prefix', codePrefix, nums);
					const maxNum = nums.length ? Math.max(...nums) : 0;
					const next = maxNum + 1;
					console.log('Debug: next sequence for', codePrefix, next);
					codeId = `${codePrefix}-${String(next).padStart(4, '0')}`;
				}
			} catch (err) {
				console.warn('Error while computing next request_id from DB, will fallback to local sequence:', err);
			}

			// Fallback to local sequence if DB method did not set codeId
			if (!codeId) {
				// Generate local sequence
				const existingCodes = reservations
					.filter(r => r.codeId && r.codeId.startsWith(codePrefix))
					.map(r => parseInt(r.codeId.split('-')[1], 10))
					.filter(n => !isNaN(n));
				let localSequence = 1;
				if (existingCodes.length > 0) {
					localSequence = Math.max(...existingCodes) + 1;
				}
				codeId = `${codePrefix}-${String(localSequence).padStart(4, '0')}`;
			}

			// Get all form data
			const unitOffice = document.querySelector('#unitOffice, input[name="unitOffice"]').value;
			const attendees = document.querySelector('#attendees, input[name="attendees"]').value;
			const additionalReq = document.querySelector('#additionalReq, input[name="additionalReq"]').value;

			// Get setup details
			const setupDetails = Array.from(form.querySelectorAll('input[name="setup"]:checked')).map(input => {
				const extraInput = input.parentElement.querySelector('.extra-input');
				return extraInput && extraInput.value ? 
					`${input.value} (${extraInput.value})` : 
					input.value;
			}).join(', ');

			// Get event title
			const eventTitle = eventTitleInput && eventTitleInput.value ? eventTitleInput.value : "";

			const reservation = {
				user: localStorage.getItem('user_id'),
				codeId: codeId,
				facility: selectedFacilities.join(", "),
				dateFiled: dateFiledInput && dateFiledInput.value ? dateFiledInput.value : todayYMD,
				dateReceived: dateReceivedInput && dateReceivedInput.value ? dateReceivedInput.value : getLocalDatetimeLocal(),
				dateOfEvent: dateOfEventVal,
				timeStart: timeStartInput && timeStartInput.value ? timeStartInput.value : "",
				timeEnd: timeEndInput && timeEndInput.value ? timeEndInput.value : "",
				eventTitle: eventTitle,
				unitOffice: unitOffice,
				attendees: attendees,
				additionalReq: additionalReq,
				setupDetails: setupDetails,
				status: "request",
				createdAt: new Date().toISOString(),
				userId: localStorage.getItem('user_id')
			};

			try {
				console.log('Attempting to save to database and work locally');
				// UPDATE LOADING TEXT - Saving to database
    			showLoading('Saving to database...', 'Storing your reservation information');

				// Create reservation object for database
				const dbReservation = {
					id: localStorage.getItem('user_id'),
					request_id: codeId,
					facility: selectedFacilities.join(", "),
					date: dateOfEventVal,
					time_start: timeStartInput && timeStartInput.value ? timeStartInput.value : "",
					time_end: timeEndInput && timeEndInput.value ? timeEndInput.value : "",
					title_of_the_event: eventTitle,
					unit: unitOffice || '',
					attendees: attendees || '',
					additional_req: additionalReq || '',
					set_up_details: setupDetails || '',
					pdf_url: '',
					status: 'request'
				};

				// Try database insert with network retry
				let dbSuccess = false;
				let retryCount = 0;
				const maxRetries = 2;
				
				while (!dbSuccess && retryCount <= maxRetries) {
					try {
						console.log(`Database insert attempt ${retryCount + 1}:`, dbReservation);
						
						const { error } = await sb
							.from('reservations')
							.insert(dbReservation);

						if (error) {
							console.error('Database insert failed:', error);
							if (error.message.includes('Failed to fetch') || error.code === '') {
								if (retryCount < maxRetries) {
									console.log(`Network error, retrying in 2 seconds... (attempt ${retryCount + 2})`);
									await new Promise(resolve => setTimeout(resolve, 2000));
									retryCount++;
									continue;
								}
							}
							break;
						} else {
							console.log('Database insert successful!');
							dbSuccess = true;
							
							// Create notification after successful reservation
							await createReservationNotification(sb, {
								facility: selectedFacilities.join(", "),
								date: dateOfEventVal,
								timeStart: timeStartInput && timeStartInput.value ? timeStartInput.value : "",
								timeEnd: timeEndInput && timeEndInput.value ? timeEndInput.value : "",
								userId: localStorage.getItem('user_id')
							});
						}
					} catch (dbError) {
						console.error('Database operation exception:', dbError);
						if (retryCount < maxRetries && 
							(dbError.message.includes('Failed to fetch') || 
							 dbError.message.includes('ERR_CONNECTION_CLOSED'))) {
							console.log(`Network error, retrying in 2 seconds... (attempt ${retryCount + 2})`);
							await new Promise(resolve => setTimeout(resolve, 2000));
							retryCount++;
						} else {
							break;
						}
					}
				}
 					// UPDATE LOADING TEXT - Uploading files
   					 showLoading('Uploading files...', 'Processing signature and documents');

				// Try file upload(s). If upload fails, save in IndexedDB
				const fileInput = document.getElementById('signature');
				const file = fileInput && fileInput.files ? fileInput.files[0] : null;

				if (file) {
					const fileExt = file.name.split('.').pop();
					const fileName = `signature_${codeId}.${fileExt}`;
					const filePath = `Reserved Facilities/${fileName}`;
					
					console.log('Attempting signature upload:', filePath);
					const uploadResult = await uploadToSupabase(file, filePath);

					if (!uploadResult) {
						// Upload failed. Save file in IndexedDB
						try {
							const signatureKey = `${codeId}_signature`;
							await storeFileInIDB(signatureKey, file);
							reservation.signatureKey = signatureKey;
							reservation.signatureName = fileName;
							console.warn('Signature saved to IndexedDB due to upload failure.');
						} catch (idbErr) {
							console.error('Failed to store signature in IndexedDB:', idbErr);
						}
					}
				}
					// UPDATE LOADING TEXT - Generating PDF
    					showLoading('Generating PDF...', 'Creating your reservation document');

				// Generate and upload PDF (use .form-container explicitly)
				const element = document.querySelector('.form-container');
				
				// Temporarily hide elements that shouldn't be in PDF
				const elementsToHide = [
					'.sidebar',
					'.notification-panel',
					'.notification-overlay',
					'.modal',
					'.custom-modal',
					'.loading-modal',
					'.submit-btn',
					'.dropdown-btn',
					'.dropdown-content'
				];
				
				const hiddenElements = [];
				elementsToHide.forEach(selector => {
					const elements = document.querySelectorAll(selector);
					elements.forEach(el => {
						if (el.style.display !== 'none') {
							el.style.display = 'none';
							hiddenElements.push(el);
						}
					});
				});
				
				// Add PDF-specific class to body
				document.body.classList.add('pdf-generation');
				
				
				const pdfOptions = {
					margin: [0, 10, 10, 10], // [top, right, bottom, left] in mm
					filename: `VRF-${codeId}.pdf`,
					image: { type: 'jpeg', quality: 0.95 },
					html2canvas: { 
						scale: 1.5,
						useCORS: true,
						letterRendering: true,
						allowTaint: false,
						backgroundColor: '#ffffff'
					},
					jsPDF: { 
						unit: 'mm', 
						format: 'a4', 
						orientation: 'portrait',
						compress: true
					},
					pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
				};
 
 				const pdfBlob = await html2pdf().set(pdfOptions).from(element).output('blob');
				
				// Restore hidden elements
				hiddenElements.forEach(el => {
					el.style.display = '';
				});
				document.body.classList.remove('pdf-generation');
				
				const pdfPath = `Reserved Facilities/VRF-${codeId}.pdf`;
				
				console.log('Attempting PDF upload:', pdfPath);
 				const pdfUploadResult = await uploadToSupabase(
 					new Blob([pdfBlob], { type: 'application/pdf' }), 
 					pdfPath
 				);

				if (!pdfUploadResult) {
					// PDF upload failed. Save PDF blob in IndexedDB
					try {
						const pdfKey = `${codeId}_pdf`;
						const pdfFile = new File([pdfBlob], `VRF-${codeId}.pdf`, { type: 'application/pdf' });
						await storeFileInIDB(pdfKey, pdfFile);
						reservation.pdfKey = pdfKey;
						reservation.pdfName = `VRF-${codeId}.pdf`;
						reservation.pdfFormatVersion = 'v2'; // Mark as new format
					} catch (pdfErr) {
						console.error('Failed to store PDF in IndexedDB:', pdfErr);
					}
				} else {
					// Mark as new format when successfully uploaded
					reservation.pdfFormatVersion = 'v2';
				}

				// Save everything locally as backup
				reservations.push(reservation);
				localStorage.setItem('reservations', JSON.stringify(reservations));
				localStorage.removeItem('selectedDate');

				// HIDE LOADING before showing success alert
    			hideLoading();

				if (dbSuccess) {
					showCustomAlert("Success", "Reservation submitted successfully! Saved to database with notification created.", "success");
				} else {
					showCustomAlert("Saved Locally", "Reservation submitted successfully! Saved locally (network issues). Will sync when connection improves.", "info");
				}
				// Redirect after user closes the alert
    		setTimeout(() => {
    			  window.location.href = "Userdashboard.html";
   				 }, 2000);
			} catch (error) {
				console.error('Error submitting form:', error);
				// HIDE LOADING on error
    				hideLoading();
				// Fallback: save locally so user won't lose data
				reservations.push(reservation);
				localStorage.setItem('reservations', JSON.stringify(reservations));
				showCustomAlert("Error", "An error occurred. Reservation saved locally. Please contact admin or try again later.", "error");
			}
		});
	} catch (error) {
		console.error('Error in DOMContentLoaded:', error);
	}
});

// Called when a calendar cell is clicked
function selectDateFromCalendar(dateString) {
  const dateOfEventInput = document.querySelector('input[name="dateOfEvent"], input#dateOfEvent, input[id="dateOfEvent"]');
  const normalized = toYMD(dateString) || dateString;
  if (dateOfEventInput) {
    dateOfEventInput.value = normalized;
    dateOfEventInput.focus();
    return;
  }
  // If not on form, store for later
  localStorage.setItem('selectedDate', normalized);
  window.location.href = "ReservationForm.html";
}

// Create notification for reservation
async function createReservationNotification(sb, reservationData) {
	try {
		const notification = {
			id: reservationData.userId,
			facility: reservationData.facility,
			date: reservationData.date,
			time_start: reservationData.timeStart,
			time_end: reservationData.timeEnd,
			status: 'Pending'
		};
		
		console.log('Creating notification:', notification);
		
		const { error: notificationError } = await sb
			.from('notifications')
			.insert([notification]);
			
		if (notificationError) {
			console.error('Failed to create notification:', notificationError);
		} else {
			console.log('Notification created successfully');
		}
	} catch (error) {
		console.error('Error creating notification:', error);
	}
}

function updateFacilityDisplay() {
  const selectedRadio = document.querySelector('input[name="facility"]:checked');
  const facilityDetails = document.getElementById("facilityDetails");

  if (!facilityDetails) return;

  if (selectedRadio) {
    let text = selectedRadio.value;

    if (selectedRadio.value === "Classroom") {
      const roomInput = selectedRadio.parentElement.querySelector('.extra-input');
      if (roomInput && roomInput.value.trim()) {
        text += " - Room " + roomInput.value.trim();
        showFacility(facilityDetails, text);
      } else {
        clearFacility(facilityDetails);
      }
      return;
    }

    if (selectedRadio.value === "Others") {
      const specifyInput = selectedRadio.parentElement.querySelector('.extra-input');
      if (specifyInput && specifyInput.value.trim()) {
        text = "Others: " + specifyInput.value.trim();
        showFacility(facilityDetails, text);
      } else {
        clearFacility(facilityDetails);
      }
      return;
    }

    // Normal facility
    showFacility(facilityDetails, text);
  } else {
    clearFacility(facilityDetails);
  }
}

function showFacility(container, text) {
  container.innerHTML = `
    <div class="facility-title">Selected Facility:</div>
    <div class="facility-info">${text}</div>
  `;
  container.classList.add("has-selection");
}

function clearFacility(container) {
  container.innerHTML = '<span class="placeholder-text">Pumili ng facility sa dropdown menu</span>';
  container.classList.remove("has-selection");
}

function updateSetupDisplay() {
  const selected = [];
  document.querySelectorAll('input[name="setup"]:checked').forEach(cb => {
    let text = cb.value;

    if (cb.value === "Others") {
      const specifyInput = cb.parentElement.querySelector('.extra-setup-input');
      if (specifyInput && specifyInput.value.trim()) {
        text = "Others: " + specifyInput.value.trim();
        selected.push(text);
      }
      // kung walang input, huwag isama
      return;
    }

    selected.push(text);
  });

  const setupDetails = document.getElementById("setupDetails");
  if (setupDetails) {
    if (selected.length > 0) {
      setupDetails.innerHTML = `
        <div class="facility-title">Selected Setup:</div>
        <div class="facility-info">${selected.join(", ")}</div>
      `;
      setupDetails.classList.add("has-selection");
    } else {
      setupDetails.innerHTML = '<span class="placeholder-text">Pumili ng setup details sa dropdown menu</span>';
      setupDetails.classList.remove("has-selection");
    }
  }
}

function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.classList.toggle('active');
    document.querySelectorAll('.dropdown').forEach(d => {
      if (d.id !== dropdownId) d.classList.remove('active');
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Facility (radio + inputs)
  document.querySelectorAll('input[name="facility"]').forEach(radio => {
    radio.addEventListener("change", updateFacilityDisplay);
  });
  document.querySelectorAll('.extra-input').forEach(input => {
    input.addEventListener("input", updateFacilityDisplay);
  });

  // Setup (checkbox + inputs)
  document.querySelectorAll('input[name="setup"]').forEach(cb => {
    cb.addEventListener("change", updateSetupDisplay);
  });
  document.querySelectorAll('.extra-setup-input').forEach(input => {
    input.addEventListener("input", updateSetupDisplay);
  });

  // Initial load
  updateFacilityDisplay();
  updateSetupDisplay();
});
