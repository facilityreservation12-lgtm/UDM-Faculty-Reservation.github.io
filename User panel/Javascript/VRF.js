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

		// pdfKey case
		if (r.pdfKey && r.pdfName) {
			try {
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

document.addEventListener('DOMContentLoaded', async function() {
	try {
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
				alert("Please select a facility.");
				return;
			}

			// Date of Event
			const dateOfEventVal = dateOfEventInput && dateOfEventInput.value ? toYMD(dateOfEventInput.value) : null;
			if (!dateOfEventVal) {
				alert("Please choose a valid Date of Event.");
				return;
			}

			// Time validation
			const newStart = parseTimeToMinutes(timeStartInput && timeStartInput.value ? timeStartInput.value : null);
			const newEnd = parseTimeToMinutes(timeEndInput && timeEndInput.value ? timeEndInput.value : null);
			if (newStart === null || newEnd === null) {
				alert("Please provide valid start and end times (HH:MM).");
				return;
			}
			if (newStart >= newEnd) {
				alert("Start time must be earlier than end time.");
				return;
			}

			// Check conflicts
			let reservations = JSON.parse(localStorage.getItem('reservations') || "[]");
			for (let facility of selectedFacilities) {
				const conflict = reservations.some(r => {
					const rDate = toYMD(r.dateOfEvent) || r.dateOfEvent;
					if (rDate !== dateOfEventVal) return false;
					const rFacilities = facilityListFromString(r.facility || "");
					if (!rFacilities.includes(facility)) return false;
					const rStart = parseTimeToMinutes(r.timeStart);
					const rEnd = parseTimeToMinutes(r.timeEnd);
					if (rStart === null || rEnd === null) return true;
					return (newStart < rEnd && newEnd > rStart);
				});
				if (conflict) {
					alert(`The facility "${facility}" is already reserved for ${dateOfEventVal} during the selected time.`);
					return;
				}
			}

			// Generate sequential code for the facility locally
			const firstFacility = selectedFacilities[0];
			const codePrefix = getCodePrefix(firstFacility);
			
			// Generate local sequence
			const existingCodes = reservations
				.filter(r => r.codeId && r.codeId.startsWith(codePrefix))
				.map(r => parseInt(r.codeId.substring(3), 10))
				.filter(n => !isNaN(n));
			
			let localSequence = 1;
			if (existingCodes.length > 0) {
				localSequence = Math.max(...existingCodes) + 1;
			}
			
			const codeId = `${codePrefix}-${String(localSequence).padStart(4, '0')}`;

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
				console.log('Working in local-only mode - no database calls to avoid notifications dependency');

				// Skip all database operations to avoid notifications table dependency
				// Work entirely with local storage and file uploads

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

				// Generate and upload PDF
				const element = document.querySelector('main') || document.querySelector('.form-container');
				const pdfOptions = {
					margin: 1,
					filename: `VRF-${codeId}.pdf`,
					image: { type: 'jpeg', quality: 0.98 },
					html2canvas: { scale: 2 },
					jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
				};
 
 				const pdfBlob = await html2pdf().set(pdfOptions).from(element).output('blob');
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
					} catch (pdfErr) {
						console.error('Failed to store PDF in IndexedDB:', pdfErr);
					}
				}

				// Save everything locally
				reservations.push(reservation);
				localStorage.setItem('reservations', JSON.stringify(reservations));
				localStorage.removeItem('selectedDate');

				alert('Reservation submitted successfully! Saved locally with PDF generated.');
				window.location.href = "Userdashboard.html";
			} catch (error) {
				console.error('Error submitting form:', error);
				// Fallback: save locally so user won't lose data
				reservations.push(reservation);
				localStorage.setItem('reservations', JSON.stringify(reservations));
				alert('An error occurred; reservation saved locally. Please contact admin or try again later.');
			}

			try {
				console.log('Attempting to save to Supabase database');

				// Create minimal reservation object for database
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

				// Try database insert with minimal approach
				let dbSuccess = false;
				try {
					console.log('Attempting database insert:', dbReservation);
					
					// Use the most basic insert possible
					const { error } = await sb
						.from('reservations')
						.insert(dbReservation);

					if (error) {
						console.error('Database insert failed:', error);
						if (error.message.includes('notifications')) {
							console.error('ISSUE: Database has notifications table dependency that needs to be fixed');
						}
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
					console.error('Database insert exception:', dbError);
				}

				// Save everything locally (always as backup)
				reservations.push(reservation);
				localStorage.setItem('reservations', JSON.stringify(reservations));
				localStorage.removeItem('selectedDate');

				if (dbSuccess) {
					alert('Reservation submitted successfully! Saved to database and PDF generated.');
				} else {
					alert('Reservation submitted successfully! Saved locally (database unavailable). PDF generated.');
				}
				window.location.href = "Userdashboard.html";
			} catch (error) {
				console.error('Error in final reservation processing:', error);
				alert('Reservation saved locally due to an error. Please check your data and try again.');
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