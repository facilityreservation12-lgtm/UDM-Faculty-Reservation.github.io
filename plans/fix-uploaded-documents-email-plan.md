# Fix Plan: Uploaded Documents Not Clickable in Approval Emails

## Bug Summary
When sending an email to approve an external user's reservation request, the uploaded documents (FRF, Signed Approval, etc.) are not clickable and there's no way to access them from the email.

## Root Cause Analysis

### Issue 1: Email doesn't include uploaded document URLs
The [`sendEmail.js`](Admin%20panel/Admin-panel/java/sendEmail.js:86) function only sends:
- `document_upload_url` - link to DocumentUpload.html page
- **Missing**: Actual uploaded document URLs from `reservation_documents` table

```javascript
// Current code (line 131-138)
const templateParams = {
    to_email: recipientEmail,
    request_id: details.reservationId,
    facility: details.facility || details.eventName || 'N/A',
    event_date: details.inclusiveDates || 'N/A',
    event_title: details.eventName || 'N/A',
    document_upload_url: docUploadUrl  // Only upload page link!
};
```

### Issue 2: Documents are stored but never fetched for email
Documents are correctly:
- Uploaded to Supabase Storage (`facilityreservation` bucket)
- Metadata saved to `reservation_documents` table with `file_url`
- Retrieved in [`DocumentUpload.js`](User%20panel/Javascript/DocumentUpload.js:196) and [`Relevantdocuments.js`](Admin%20panel/Admin-panel/java/Relevantdocuments.js:133) via `get_reservation_documents` RPC

But `sendEmail.js` never fetches these documents to include in the email.

### Issue 3: EmailJS template likely expects document variables
The EmailJS template (`template_ekz42oi`) probably has placeholders for document links that are never populated.

## Solution

### Step 1: Modify sendEmail.js to fetch uploaded documents
In [`Admin panel/Admin-panel/java/sendEmail.js`](Admin panel/Admin-panel/java/sendEmail.js), modify `sendEmailWithAddress()` to:

1. Fetch documents from `reservation_documents` table using `request_id`
2. Build document URLs for each uploaded document
3. Include them in email template parameters

```javascript
// Add helper function to fetch uploaded documents
async function getUploadedDocuments(requestId) {
    const sb = getSupabase();
    if (!sb) return {};
    
    const { data: docs, error } = await sb
        .rpc('get_reservation_documents', { p_request_id: requestId });
    
    if (error) {
        // Fallback to direct select
        const { data: directDocs } = await sb
            .from('reservation_documents')
            .select('*')
            .eq('request_id', requestId);
        return directDocs || [];
    }
    return docs || [];
}
```

### Step 2: Include document URLs in email template params
Update `templateParams` to include document links:

```javascript
// Fetch uploaded documents
const uploadedDocs = await getUploadedDocuments(details.reservationId);

// Build document URL map
const docUrls = {};
uploadedDocs.forEach(doc => {
    docUrls[`${doc.document_type}_url`] = doc.file_url;
    docUrls[`${doc.document_type}_filename`] = doc.filename;
});

// Include in template params
const templateParams = {
    to_email: recipientEmail,
    request_id: details.reservationId,
    facility: details.facility || details.eventName || 'N/A',
    event_date: details.inclusiveDates || 'N/A',
    event_title: details.eventName || 'N/A',
    document_upload_url: docUploadUrl,
    // Add document URLs
    frf_url: docUrls['frf_url'] || '',
    frf_filename: docUrls['frf_filename'] || '',
    signed_approval_url: docUrls['signed_approval_url'] || '',
    signed_approval_filename: docUrls['signed_approval_filename'] || '',
    // ... other documents
};
```

### Step 3: Update SuperAdmin sendEmail.js
Apply the same fix to [`SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js`](SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js:39).

### Step 4: Update EmailJS Template (Manual)
The EmailJS dashboard template needs to be updated to include document link variables:
- `{{frf_url}}`, `{{frf_filename}}`
- `{{signed_approval_url}}`, `{{signed_approval_filename}}`
- etc.

Or add a single variable `{{uploaded_documents_list}}` that contains an HTML-formatted list of all uploaded documents with clickable links.

## Files to Modify

| File | Change |
|------|--------|
| `Admin panel/Admin-panel/java/sendEmail.js` | Add document fetching, include doc URLs in template params |
| `SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js` | Same changes as Admin |
| EmailJS Template (dashboard) | Add document link variables or formatted list |

## Alternative Solution

If modifying the EmailJS template is not feasible, create an HTML-formatted document list:

```javascript
function buildDocumentsListHtml(docs) {
    if (!docs || docs.length === 0) return '';
    
    let html = '<h4>Uploaded Documents:</h4><ul>';
    docs.forEach(doc => {
        const label = getDocumentLabel(doc.document_type);
        html += `<li><a href="${doc.file_url}">${label} - ${doc.filename}</a></li>`;
    });
    html += '</ul>';
    return html;
}

function getDocumentLabel(docType) {
    const labels = {
        'frf': 'FRF',
        'signed_approval': 'Signed Approval',
        'approval': 'Approval',
        'venue_slip': 'Venue Slip',
        'cash_invoice': 'Cash Invoice',
        'permit_to_use_facility': 'Permit to Use Facility'
    };
    return labels[docType] || docType;
}
```

Then pass `uploaded_documents_html: buildDocumentsListHtml(uploadedDocs)` to the template.

## Testing Checklist

- [ ] Send approval email for reservation with uploaded documents
- [ ] Verify email contains clickable document links
- [ ] Verify document links open correct files
- [ ] Test with reservation having no documents
- [ ] Test with reservation having partial documents (only FRF, etc.)
- [ ] Verify SuperAdmin panel email also works correctly