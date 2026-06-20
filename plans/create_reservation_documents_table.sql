-- ===============================================
-- RESERVATION DOCUMENTS TABLE
-- For tracking uploaded documents per reservation
-- ===============================================

-- Create reservation_documents table
CREATE TABLE IF NOT EXISTS reservation_documents (
    id SERIAL PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES reservations(request_id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'frf', 
        'signed_approval', 
        'approval', 
        'venue_slip', 
        'cash_invoice', 
        'permit_to_use_facility'
    )),
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    uploaded_by TEXT REFERENCES users(id),
    uploaded_by_role TEXT CHECK (uploaded_by_role IN ('faculty', 'student_organization', 'admin', 'super_admin')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- INDEXES
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_reservation_docs_request_id ON reservation_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_reservation_docs_type ON reservation_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_reservation_docs_uploaded_by ON reservation_documents(uploaded_by);

-- ===============================================
-- HELPER FUNCTION: Get documents for a reservation
-- ===============================================
CREATE OR REPLACE FUNCTION get_reservation_documents(p_request_id TEXT)
RETURNS TABLE(
    id INT,
    document_type TEXT,
    filename TEXT,
    file_url TEXT,
    file_size INT,
    mime_type TEXT,
    uploaded_by TEXT,
    uploaded_by_role TEXT,
    uploaded_by_name TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rd.id,
        rd.document_type,
        rd.filename,
        rd.file_url,
        rd.file_size,
        rd.mime_type,
        rd.uploaded_by,
        rd.uploaded_by_role,
        CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
        rd.created_at
    FROM reservation_documents rd
    LEFT JOIN users u ON rd.uploaded_by = u.id
    WHERE rd.request_id = p_request_id
    ORDER BY 
        CASE rd.document_type
            WHEN 'frf' THEN 1
            WHEN 'signed_approval' THEN 2
            WHEN 'approval' THEN 3
            WHEN 'venue_slip' THEN 4
            WHEN 'cash_invoice' THEN 5
            WHEN 'permit_to_use_facility' THEN 6
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- HELPER FUNCTION: Check if user owns reservation
-- ===============================================
CREATE OR REPLACE FUNCTION check_reservation_ownership(p_request_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM reservations 
        WHERE request_id = p_request_id AND id = p_user_id
    ) INTO is_owner;
    
    RETURN COALESCE(is_owner, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- HELPER FUNCTION: Add document record
-- ===============================================
CREATE OR REPLACE FUNCTION add_reservation_document(
    p_request_id TEXT,
    p_document_type TEXT,
    p_filename TEXT,
    p_file_url TEXT,
    p_file_size INT,
    p_uploaded_by TEXT,
    p_uploaded_by_role TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, doc_id INT) AS $$
DECLARE
    v_doc_id INT;
BEGIN
    -- Check if document type already exists for this reservation
    IF EXISTS(
        SELECT 1 FROM reservation_documents 
        WHERE request_id = p_request_id AND document_type = p_document_type
    ) THEN
        -- Update existing document
        UPDATE reservation_documents 
        SET 
            filename = p_filename,
            file_url = p_file_url,
            file_size = p_file_size,
            uploaded_by = p_uploaded_by,
            uploaded_by_role = p_uploaded_by_role,
            created_at = NOW()
        WHERE request_id = p_request_id AND document_type = p_document_type
        RETURNING id INTO v_doc_id;
        
        RETURN QUERY SELECT TRUE, 'Document updated successfully', v_doc_id;
    ELSE
        -- Insert new document
        INSERT INTO reservation_documents (
            request_id, document_type, filename, file_url, 
            file_size, uploaded_by, uploaded_by_role
        ) VALUES (
            p_request_id, p_document_type, p_filename, p_file_url,
            p_file_size, p_uploaded_by, p_uploaded_by_role
        )
        RETURNING id INTO v_doc_id;
        
        RETURN QUERY SELECT TRUE, 'Document uploaded successfully', v_doc_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- HELPER FUNCTION: Delete document
-- ===============================================
CREATE OR REPLACE FUNCTION delete_reservation_document(p_doc_id INT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN := FALSE;
BEGIN
    -- Only allow deletion by the uploader or admin
    DELETE FROM reservation_documents 
    WHERE id = p_doc_id 
    AND (uploaded_by = p_user_id OR uploaded_by_role IN ('admin', 'super_admin'))
    RETURNING TRUE INTO v_deleted;
    
    RETURN COALESCE(v_deleted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================
GRANT USAGE ON SEQUENCE reservation_documents_id_seq TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservation_documents TO public;
GRANT EXECUTE ON FUNCTION get_reservation_documents(TEXT) TO public;
GRANT EXECUTE ON FUNCTION check_reservation_ownership(TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION add_reservation_document(TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION delete_reservation_document(INT, TEXT) TO public;

-- ===============================================
-- COMMENTS
-- ===============================================
COMMENT ON TABLE reservation_documents IS 'Stores uploaded documents for each reservation';
COMMENT ON FUNCTION get_reservation_documents IS 'Retrieves all documents for a specific reservation';
COMMENT ON FUNCTION check_reservation_ownership IS 'Verifies if a user owns a specific reservation';
COMMENT ON FUNCTION add_reservation_document IS 'Adds or updates a document record for a reservation';
COMMENT ON FUNCTION delete_reservation_document IS 'Deletes a document (only by uploader or admin)';

-- ===============================================
-- DOCUMENT TYPE LABELS (for UI display)
-- ===============================================
-- frf                      -> FRF
-- signed_approval           -> Signed Approval
-- approval                  -> Approval
-- venue_slip                -> Venue Slip
-- cash_invoice              -> Cash Invoice
