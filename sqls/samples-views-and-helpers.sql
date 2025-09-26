-- Views and helper functions for the enhanced sample submission system

-- View for sample summary with product-specific information
CREATE OR REPLACE VIEW sample_summary AS
SELECT 
    s.id,
    s.contest_id,
    c.name as contest_name,
    s.user_id,
    p.name as participant_name,
    s.tracking_code,
    s.product_type,
    s.status,
    s.created_at::DATE as submission_date,
    
    -- Product-specific display names
    CASE 
        WHEN s.product_type = 'bean' THEN s.farm_name
        WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'name'
        WHEN s.product_type = 'liquor' THEN s.liquor_details->>'name'
        ELSE 'Unknown'
    END as product_name,
    
    -- Origin information
    CASE 
        WHEN s.product_type = 'bean' THEN s.country
        WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'cocoaOriginCountry'
        WHEN s.product_type = 'liquor' THEN s.liquor_details->>'cocoaOriginCountry'
        ELSE NULL
    END as origin_country,
    
    -- Brand information (for chocolate and liquor)
    CASE 
        WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'brand'
        WHEN s.product_type = 'liquor' THEN s.liquor_details->>'brand'
        ELSE NULL
    END as brand,
    
    s.lot_number,
    s.harvest_date
    
FROM public.samples s
JOIN public.contests c ON s.contest_id = c.id
JOIN public.profiles p ON s.user_id = p.id;

-- View for chocolate samples with detailed information
CREATE OR REPLACE VIEW chocolate_samples AS
SELECT 
    s.id,
    s.contest_id,
    c.name as contest_name,
    s.user_id,
    p.name as participant_name,
    s.tracking_code,
    s.status,
    s.created_at,
    
    -- Chocolate specific fields
    s.chocolate_details->>'name' as chocolate_name,
    s.chocolate_details->>'brand' as brand,
    s.chocolate_details->>'batch' as batch,
    s.chocolate_details->>'type' as chocolate_type,
    (s.chocolate_details->>'cocoaPercentage')::numeric as cocoa_percentage,
    s.chocolate_details->>'manufacturerCountry' as manufacturer_country,
    s.chocolate_details->>'cocoaOriginCountry' as cocoa_origin_country,
    s.chocolate_details->>'cocoaVariety' as cocoa_variety,
    s.chocolate_details->>'temperingMethod' as tempering_method,
    s.chocolate_details->'sweeteners' as sweeteners,
    s.chocolate_details->'certifications' as certifications
    
FROM public.samples s
JOIN public.contests c ON s.contest_id = c.id
JOIN public.profiles p ON s.user_id = p.id
WHERE s.product_type = 'chocolate';

-- View for liquor samples with detailed information
CREATE OR REPLACE VIEW liquor_samples AS
SELECT 
    s.id,
    s.contest_id,
    c.name as contest_name,
    s.user_id,
    p.name as participant_name,
    s.tracking_code,
    s.status,
    s.created_at,
    
    -- Liquor specific fields
    s.liquor_details->>'name' as liquor_name,
    s.liquor_details->>'brand' as brand,
    s.liquor_details->>'batch' as batch,
    s.liquor_details->>'processingMethod' as processing_method,
    (s.liquor_details->>'lecithinPercentage')::numeric as lecithin_percentage,
    s.liquor_details->>'countryProcessing' as processing_country,
    s.liquor_details->>'cocoaOriginCountry' as cocoa_origin_country,
    s.liquor_details->>'cocoaVariety' as cocoa_variety,
    s.lot_number,
    s.harvest_date
    
FROM public.samples s
JOIN public.contests c ON s.contest_id = c.id
JOIN public.profiles p ON s.user_id = p.id
WHERE s.product_type = 'liquor';

-- View for bean samples (traditional view)
CREATE OR REPLACE VIEW bean_samples AS
SELECT 
    s.id,
    s.contest_id,
    c.name as contest_name,
    s.user_id,
    p.name as participant_name,
    s.tracking_code,
    s.status,
    s.created_at,
    
    -- Bean specific fields
    s.country,
    s.department,
    s.municipality,
    s.district,
    s.farm_name,
    s.owner_full_name,
    s.genetic_material,
    s.variety,
    s.lot_number,
    s.harvest_date,
    s.growing_altitude_masl,
    s.quantity,
    s.moisture_content,
    s.fermentation_percentage,
    s.fermenter_type,
    s.drying_type,
    s.bean_certifications
    
FROM public.samples s
JOIN public.contests c ON s.contest_id = c.id
JOIN public.profiles p ON s.user_id = p.id
WHERE s.product_type = 'bean';

-- Function to get contest statistics by product type
CREATE OR REPLACE FUNCTION get_contest_statistics(p_contest_id UUID)
RETURNS TABLE (
    contest_name TEXT,
    total_submissions BIGINT,
    bean_submissions BIGINT,
    chocolate_submissions BIGINT,
    liquor_submissions BIGINT,
    submitted_count BIGINT,
    received_count BIGINT,
    approved_count BIGINT,
    evaluated_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as contest_name,
        COUNT(s.id) as total_submissions,
        COUNT(CASE WHEN s.product_type = 'bean' THEN 1 END) as bean_submissions,
        COUNT(CASE WHEN s.product_type = 'chocolate' THEN 1 END) as chocolate_submissions,
        COUNT(CASE WHEN s.product_type = 'liquor' THEN 1 END) as liquor_submissions,
        COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN s.status = 'received' THEN 1 END) as received_count,
        COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN s.status = 'evaluated' THEN 1 END) as evaluated_count
    FROM public.contests c
    LEFT JOIN public.samples s ON c.id = s.contest_id
    WHERE c.id = p_contest_id
    GROUP BY c.id, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search samples by various criteria
CREATE OR REPLACE FUNCTION search_samples(
    p_search_term TEXT DEFAULT NULL,
    p_contest_id UUID DEFAULT NULL,
    p_product_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    contest_name TEXT,
    participant_name TEXT,
    tracking_code TEXT,
    product_type TEXT,
    product_name TEXT,
    origin_country TEXT,
    status TEXT,
    submission_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        c.name as contest_name,
        p.name as participant_name,
        s.tracking_code,
        s.product_type,
        CASE 
            WHEN s.product_type = 'bean' THEN s.farm_name
            WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'name'
            WHEN s.product_type = 'liquor' THEN s.liquor_details->>'name'
            ELSE 'Unknown'
        END as product_name,
        CASE 
            WHEN s.product_type = 'bean' THEN s.country
            WHEN s.product_type = 'chocolate' THEN s.chocolate_details->>'cocoaOriginCountry'
            WHEN s.product_type = 'liquor' THEN s.liquor_details->>'cocoaOriginCountry'
            ELSE NULL
        END as origin_country,
        s.status,
        s.created_at::DATE as submission_date
    FROM public.samples s
    JOIN public.contests c ON s.contest_id = c.id
    JOIN public.profiles p ON s.user_id = p.id
    WHERE 
        (p_search_term IS NULL OR (
            s.tracking_code ILIKE '%' || p_search_term || '%' OR
            p.name ILIKE '%' || p_search_term || '%' OR
            s.farm_name ILIKE '%' || p_search_term || '%' OR
            (s.chocolate_details->>'name') ILIKE '%' || p_search_term || '%' OR
            (s.liquor_details->>'name') ILIKE '%' || p_search_term || '%'
        ))
        AND (p_contest_id IS NULL OR s.contest_id = p_contest_id)
        AND (p_product_type IS NULL OR s.product_type = p_product_type)
        AND (p_status IS NULL OR s.status = p_status)
        AND (p_country IS NULL OR s.country = p_country OR 
             (s.chocolate_details->>'cocoaOriginCountry') = p_country OR
             (s.liquor_details->>'cocoaOriginCountry') = p_country)
    ORDER BY s.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product type distribution
CREATE OR REPLACE FUNCTION get_product_type_distribution()
RETURNS TABLE (
    product_type TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH totals AS (
        SELECT COUNT(*) as total_count FROM public.samples
    )
    SELECT 
        s.product_type,
        COUNT(s.id) as count,
        ROUND((COUNT(s.id) * 100.0 / t.total_count), 2) as percentage
    FROM public.samples s
    CROSS JOIN totals t
    GROUP BY s.product_type, t.total_count
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sample status with validation
CREATE OR REPLACE FUNCTION update_sample_status(
    p_sample_id UUID,
    p_new_status TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status TEXT;
    user_role TEXT;
    sample_owner UUID;
BEGIN
    -- Get current status and owner
    SELECT status, user_id INTO current_status, sample_owner
    FROM public.samples 
    WHERE id = p_sample_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sample not found';
    END IF;
    
    -- Get user role if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT role INTO user_role
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;
    
    -- Validate status transition
    IF NOT is_valid_status_transition(current_status, p_new_status) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', current_status, p_new_status;
    END IF;
    
    -- Check permissions
    IF p_user_id IS NOT NULL AND user_role NOT IN ('admin', 'director') AND sample_owner != p_user_id THEN
        RAISE EXCEPTION 'Insufficient permissions to update sample status';
    END IF;
    
    -- Update status
    UPDATE public.samples 
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_sample_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to validate status transitions
CREATE OR REPLACE FUNCTION is_valid_status_transition(
    current_status TEXT,
    new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Define valid transitions
    RETURN CASE 
        WHEN current_status = 'submitted' THEN new_status IN ('received', 'disqualified')
        WHEN current_status = 'received' THEN new_status IN ('approved', 'disqualified')
        WHEN current_status = 'approved' THEN new_status IN ('evaluated', 'disqualified')
        WHEN current_status = 'evaluated' THEN FALSE -- Final status
        WHEN current_status = 'disqualified' THEN FALSE -- Final status
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for views (they inherit from base table permissions)
-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION get_contest_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_samples(TEXT, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_type_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sample_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_status_transition(TEXT, TEXT) TO authenticated;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_samples_search_text ON public.samples USING GIN (
    to_tsvector('english', 
        COALESCE(farm_name, '') || ' ' || 
        COALESCE(owner_full_name, '') || ' ' ||
        COALESCE(tracking_code, '') || ' ' ||
        COALESCE(chocolate_details->>'name', '') || ' ' ||
        COALESCE(liquor_details->>'name', '')
    )
);

-- Add comments for documentation
COMMENT ON VIEW sample_summary IS 'Unified view of all samples with product-specific information';
COMMENT ON VIEW chocolate_samples IS 'Detailed view of chocolate product submissions';
COMMENT ON VIEW liquor_samples IS 'Detailed view of liquor/mass product submissions';
COMMENT ON VIEW bean_samples IS 'Detailed view of bean product submissions';
COMMENT ON FUNCTION get_contest_statistics(UUID) IS 'Returns submission statistics for a contest';
COMMENT ON FUNCTION search_samples(TEXT, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Search samples with various filters';
COMMENT ON FUNCTION get_product_type_distribution() IS 'Returns distribution of product types across all samples';
COMMENT ON FUNCTION update_sample_status(UUID, TEXT, UUID) IS 'Updates sample status with validation and permission checks';