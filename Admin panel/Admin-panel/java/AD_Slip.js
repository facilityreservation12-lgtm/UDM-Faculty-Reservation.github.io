// Helper to get Supabase client
function getSupabase() {
  if (typeof window !== 'undefined') {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
  }
  if (typeof supabase !== 'undefined') return supabase;
  return null;
}

// Helper: parse query string
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Helper: format time to 12-hour
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":");
  hour = parseInt(hour, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

// Main: Load reservation and fill slip
async function loadSlipFromReservation() {
  const requestId = getQueryParam('request_id');
  if (!requestId) {
    console.warn('No request_id in URL');
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    console.error('Supabase client not found');
    return;
  }

  // Fetch reservation by request_id
  const { data: reservation, error } = await sb
    .from('reservations')
    .select('*')
    .eq('request_id', requestId)
    .single();

  if (error || !reservation) {
    console.error('Reservation not found:', error);
    return;
  }

  console.log('Reservation data:', reservation);

  // Fetch unit/office/college from unit table
  let unitName = '';
  if (reservation.unit_id) {
    const { data: unitData, error: unitError } = await sb
      .from('unit')
      .select('name')
      .eq('id', reservation.unit_id)
      .single();
    if (!unitError && unitData && unitData.name) {
      unitName = unitData.name;
    }
  } else if (reservation.unit) {
    unitName = reservation.unit;
  }

  console.log('Unit name:', unitName);

  // Fetch event/activity from title_of_the_event table
  let eventTitle = '';
  if (reservation.title_of_the_event_id) {
    const { data: eventData, error: eventError } = await sb
      .from('title_of_the_event')
      .select('name')
      .eq('id', reservation.title_of_the_event_id)
      .single();
    if (!eventError && eventData && eventData.name) {
      eventTitle = eventData.name;
    }
  } else if (reservation.title_of_the_event) {
    eventTitle = reservation.title_of_the_event;
  }

  console.log('Event title:', eventTitle);

  // Date Filed - First input in the first row
  const dateFiledInput = document.querySelector('.row .column:first-child input[type="date"]');
  if (dateFiledInput) {
    dateFiledInput.value = reservation.dateFiled || reservation.date_filed || reservation.date || '';
    console.log('Date Filed set to:', dateFiledInput.value);
  }

  // Venue Slip No. - Second input in the first row
  const venueSlipInputs = document.querySelectorAll('.row .column input[type="text"]');
  if (venueSlipInputs.length > 0) {
    venueSlipInputs[0].value = reservation.codeId || reservation.request_id || '';
    console.log('Venue Slip No. set to:', venueSlipInputs[0].value);
  }

  // Unit/Office/College and Inclusive Dates - Inputs in the section
  const sectionRowInputs = document.querySelectorAll('.section .row .column input[type="text"]');
  if (sectionRowInputs.length >= 2) {
    sectionRowInputs[0].value = unitName;
    sectionRowInputs[1].value = reservation.dateOfEvent || reservation.date || '';
    console.log('Unit/Office set to:', sectionRowInputs[0].value);
    console.log('Inclusive Dates set to:', sectionRowInputs[1].value);
  }

  // Event/Activity - Third text input in section (after Unit and Dates)
  const allSectionInputs = document.querySelectorAll('.section input[type="text"]');
  // Find the input that's NOT inside .checkbox-group and NOT in the row
  let eventInput = null;
  for (let input of allSectionInputs) {
    const isInCheckboxGroup = input.closest('.checkbox-group');
    const isInRow = input.closest('.row');
    if (!isInCheckboxGroup && !isInRow) {
      eventInput = input;
      break;
    }
  }
  if (eventInput) {
    eventInput.value = eventTitle;
    console.log('Event/Activity set to:', eventInput.value);
  }

  // UDM Facility checkboxes
  const facilityStr = reservation.facility || '';
  const facilities = facilityStr.split(',').map(f => f.trim().toLowerCase());
  console.log('Facilities:', facilities);
  
  const checkboxGroups = document.querySelectorAll('.checkbox-group');
  if (checkboxGroups.length > 0) {
    const facilityCheckboxes = checkboxGroups[0].querySelectorAll('label input[type="checkbox"]');
    facilityCheckboxes.forEach(cb => {
      const labelText = cb.parentElement.textContent.trim().toLowerCase();
      console.log('Checking facility label:', labelText);
      
      if (labelText.includes('palma hall')) {
        cb.checked = facilities.some(f => f.includes('palma'));
      } else if (labelText.includes('right wing')) {
        cb.checked = facilities.some(f => f.includes('right wing') || f.includes('lobby'));
      } else if (labelText.includes('mehan')) {
        cb.checked = facilities.some(f => f.includes('mehan'));
      } else if (labelText.includes('rooftop')) {
        cb.checked = facilities.some(f => f.includes('rooftop'));
      } else if (labelText.includes('classroom')) {
        if (facilities.some(f => f.includes('classroom'))) {
          cb.checked = true;
          const classroomInput = document.getElementById('classroomInput');
          if (classroomInput) {
            classroomInput.style.display = 'inline-block';
            const match = facilityStr.match(/room\s*(?:no\.?)?\s*([a-z0-9]+)/i);
            classroomInput.value = match ? match[1] : '';
          }
        }
      } else if (labelText.includes('basketball')) {
        cb.checked = facilities.some(f => f.includes('basketball'));
      } else if (labelText.includes('ground floor')) {
        cb.checked = facilities.some(f => f.includes('ground'));
      } else if (labelText.includes('others') && cb.id === 'othersFacilityCheckbox') {
        if (facilities.some(f => f.includes('others'))) {
          cb.checked = true;
          const othersInput = document.getElementById('othersFacilityInput');
          if (othersInput) {
            othersInput.style.display = 'inline-block';
            const parts = facilityStr.split(':');
            othersInput.value = parts.length > 1 ? parts[1].trim() : '';
          }
        }
      }
    });
  }

  // Set-up Details
  const setupStr = reservation.setupDetails || reservation.set_up_details || '';
  const setups = setupStr.split(',').map(s => s.trim().toLowerCase());
  console.log('Setup details:', setups);
  
  if (checkboxGroups.length > 1) {
    const setupCheckboxes = checkboxGroups[1].querySelectorAll('label input[type="checkbox"]');
    setupCheckboxes.forEach(cb => {
      const labelText = cb.parentElement.textContent.trim().toLowerCase();
      console.log('Checking setup label:', labelText);
      
      if (labelText.includes('chairs')) {
        cb.checked = setups.some(s => s.includes('chair'));
      } else if (labelText.includes('tables')) {
        cb.checked = setups.some(s => s.includes('table'));
      } else if (labelText.includes('sound system')) {
        cb.checked = setups.some(s => s.includes('sound'));
      } else if (labelText.includes('electrical')) {
        cb.checked = setups.some(s => s.includes('electrical'));
      } else if (labelText.includes('projector')) {
        cb.checked = setups.some(s => s.includes('projector') || s.includes('hdmi'));
      } else if (labelText.includes('others') && cb.id === 'othersSetupCheckbox') {
        if (setups.some(s => s.includes('others'))) {
          cb.checked = true;
          const othersInput = document.getElementById('othersSetupInput');
          if (othersInput) {
            othersInput.style.display = 'inline-block';
            const parts = setupStr.split(':');
            othersInput.value = parts.length > 1 ? parts[1].trim() : '';
          }
        }
      }
    });
  }

  // Remarks
  const remarks = reservation.additionalReq || '';
  if (remarks) {
    const remarksCheckbox = document.getElementById('othersRemarksCheckbox');
    const remarksInput = document.getElementById('othersRemarksInput');
    if (remarksCheckbox && remarksInput) {
      remarksCheckbox.checked = true;
      remarksInput.style.display = 'inline-block';
      remarksInput.value = remarks;
      console.log('Remarks set to:', remarks);
    }
  }

  // E-signature: Requested by
  if (reservation.requested_by_signature) {
    const requestedBySigImg = document.getElementById('requestedBySignatureImg');
    if (requestedBySigImg) {
      requestedBySigImg.src = reservation.requested_by_signature;
      requestedBySigImg.style.display = 'block';
      console.log('Requested by signature loaded');
    }
  }

  // E-signature: Approved by (Head, Maintenance and Engineering Division)
  if (reservation.approved_by_signature) {
    const approvedBySigImg = document.getElementById('approvedBySignatureImg');
    if (approvedBySigImg) {
      approvedBySigImg.src = reservation.approved_by_signature;
      approvedBySigImg.style.display = 'block';
      console.log('Approved by signature loaded');
    }
  }

  console.log('Slip loaded successfully');
}

// Force reload on page load to prevent caching issues
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSlipFromReservation);
} else {
  // DOM already loaded, call immediately
  loadSlipFromReservation();
}

// Also reload when page becomes visible (handles back button cache)
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    const requestId = getQueryParam('request_id');
    if (requestId) {
      loadSlipFromReservation();
    }
  }
});