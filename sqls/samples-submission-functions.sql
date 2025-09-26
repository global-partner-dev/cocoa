-- Functions to support sample submission with different product types

-- Function to get available contests for sample submission
CREATE OR REPLACE FUNCTION get_available_contests()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    registration_deadline DATE,
    submission_deadline DATE,
    status TEXT,
    categories TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.registration_deadline,
        c.submission_deadline,
        c.status,
        COALESCE(c.categories, ARRAY[]::TEXT[]) as categories
    FROM public.contests c
    WHERE c.status = 'open'
    AND c.registration_deadline >= CURRENT_DATE
    ORDER BY c.registration_deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate sample submission data
CREATE OR REPLACE FUNCTION validate_sample_submission(
    p_product_type TEXT,
    p_contest_id UUID,
    p_chocolate_details JSONB DEFAULT NULL,
    p_liquor_details JSONB DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_farm_name TEXT DEFAULT NULL,
    p_owner_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    contest_exists BOOLEAN;
    contest_open BOOLEAN;
BEGIN
    -- Check if contest exists and is open
    SELECT 
        COUNT(*) > 0,
        MAX(CASE WHEN status = 'open' AND registration_deadline >= CURRENT_DATE THEN TRUE ELSE FALSE END)
    INTO contest_exists, contest_open
    FROM public.contests 
    WHERE id = p_contest_id;
    
    IF NOT contest_exists THEN
        RAISE EXCEPTION 'Contest does not exist';
    END IF;
    
    IF NOT contest_open THEN
        RAISE EXCEPTION 'Contest is not open for registration';
    END IF;
    
    -- Validate based on product type
    CASE p_product_type
        WHEN 'bean' THEN
            IF p_country IS NULL OR p_farm_name IS NULL OR p_owner_full_name IS NULL THEN
                RAISE EXCEPTION 'Bean submissions require country, farm name, and owner name';
            END IF;
            
        WHEN 'chocolate' THEN
            IF p_chocolate_details IS NULL THEN
                RAISE EXCEPTION 'Chocolate submissions require chocolate details';
            END IF;
            
            IF NOT validate_chocolate_details(p_chocolate_details) THEN
                RAISE EXCEPTION 'Invalid chocolate details structure';
            END IF;
            
        WHEN 'liquor' THEN
            IF p_liquor_details IS NULL THEN
                RAISE EXCEPTION 'Liquor submissions require liquor details';
            END IF;
            
            IF NOT validate_liquor_details(p_liquor_details) THEN
                RAISE EXCEPTION 'Invalid liquor details structure';
            END IF;
            
        ELSE
            RAISE EXCEPTION 'Invalid product type. Must be bean, chocolate, or liquor';
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sample details with proper formatting
CREATE OR REPLACE FUNCTION get_sample_details(p_sample_id UUID)
RETURNS TABLE (
    id UUID,
    contest_id UUID,
    contest_name TEXT,
    user_id UUID,
    participant_name TEXT,
    tracking_code TEXT,
    qr_code_url TEXT,
    product_type TEXT,
    status TEXT,
    
    -- Bean fields
    country TEXT,
    department TEXT,
    municipality TEXT,
    district TEXT,
    farm_name TEXT,
    owner_full_name TEXT,
    lot_number TEXT,
    harvest_date DATE,
    
    -- JSON details
    chocolate_details JSONB,
    liquor_details JSONB,
    bean_certifications JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.contest_id,
        c.name as contest_name,
        s.user_id,
        p.name as participant_name,
        s.tracking_code,
        s.qr_code_url,
        s.product_type,
        s.status,
        
        s.country,
        s.department,
        s.municipality,
        s.district,
        s.farm_name,
        s.owner_full_name,
        s.lot_number,
        s.harvest_date,
        
        s.chocolate_details,
        s.liquor_details,
        s.bean_certifications,
        
        s.created_at,
        s.updated_at
    FROM public.samples s
    JOIN public.contests c ON s.contest_id = c.id
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.id = p_sample_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get samples by user with contest information
CREATE OR REPLACE FUNCTION get_user_samples(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    contest_name TEXT,
    tracking_code TEXT,
    product_type TEXT,
    status TEXT,
    submission_date DATE,
    farm_name TEXT,
    chocolate_name TEXT,
    liquor_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        c.name as contest_name,
        s.tracking_code,
        s.product_type,
        s.status,
        s.created_at::DATE as submission_date,
        s.farm_name,
        CASE 
            WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'name'
            ELSE NULL
        END as chocolate_name,
        CASE 
            WHEN s.product_type = 'liquor' THEN s.liquor_details->>'name'
            ELSE NULL
        END as liquor_name
    FROM public.samples s
    JOIN public.contests c ON s.contest_id = c.id
    WHERE s.user_id = p_user_id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify QR code data
CREATE OR REPLACE FUNCTION verify_qr_code(p_tracking_code TEXT)
RETURNS TABLE (
    sample_id UUID,
    contest_name TEXT,
    participant_name TEXT,
    product_type TEXT,
    submission_date DATE,
    status TEXT,
    farm_name TEXT,
    chocolate_name TEXT,
    liquor_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as sample_id,
        c.name as contest_name,
        p.name as participant_name,
        s.product_type,
        s.created_at::DATE as submission_date,
        s.status,
        s.farm_name,
        CASE 
            WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'name'
            ELSE NULL
        END as chocolate_name,
        CASE 
            WHEN s.product_type = 'liquor' THEN s.liquor_details->>'name'
            ELSE NULL
        END as liquor_name
    FROM public.samples s
    JOIN public.contests c ON s.contest_id = c.id
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.tracking_code = p_tracking_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get samples for evaluation (for judges/evaluators)
CREATE OR REPLACE FUNCTION get_samples_for_evaluation(
    p_contest_id UUID DEFAULT NULL,
    p_product_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    contest_name TEXT,
    tracking_code TEXT,
    product_type TEXT,
    status TEXT,
    submission_date DATE,
    participant_name TEXT,
    farm_name TEXT,
    country TEXT,
    chocolate_name TEXT,
    liquor_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        c.name as contest_name,
        s.tracking_code,
        s.product_type,
        s.status,
        s.created_at::DATE as submission_date,
        p.name as participant_name,
        s.farm_name,
        s.country,
        CASE 
            WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'name'
            ELSE NULL
        END as chocolate_name,
        CASE 
            WHEN s.product_type = 'liquor' THEN s.liquor_details->>'name'
            ELSE NULL
        END as liquor_name
    FROM public.samples s
    JOIN public.contests c ON s.contest_id = c.id
    JOIN public.profiles p ON s.user_id = p.id
    WHERE (p_contest_id IS NULL OR s.contest_id = p_contest_id)
    AND (p_product_type IS NULL OR s.product_type = p_product_type)
    AND (p_status IS NULL OR s.status = p_status)
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION get_available_contests() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_sample_submission(TEXT, UUID, JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sample_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_samples(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_qr_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_samples_for_evaluation(UUID, TEXT, TEXT) TO authenticated;