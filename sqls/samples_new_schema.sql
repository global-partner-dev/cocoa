-- New schema for samples with separate tables for each product type
-- This replaces the old single samples table with a normalized structure

-- Create the main sample table with common data
CREATE TABLE IF NOT EXISTS public.sample (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Contest and User Information
    contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- Sample Identification
    tracking_code TEXT UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL, -- JSON data for QR code
    qr_code_url TEXT, -- URL to downloadable QR code image

    -- Sample Status
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'received', 'disqualified', 'approved', 'evaluated')),

    -- Payment Information (for future integration)
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_reference TEXT,

    -- Terms Agreement
    agreed_to_terms BOOLEAN DEFAULT FALSE NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT valid_terms_agreement CHECK (agreed_to_terms = TRUE)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sample_contest_id ON public.sample(contest_id);
CREATE INDEX IF NOT EXISTS idx_sample_user_id ON public.sample(user_id);
CREATE INDEX IF NOT EXISTS idx_sample_tracking_code ON public.sample(tracking_code);
CREATE INDEX IF NOT EXISTS idx_sample_status ON public.sample(status);
CREATE INDEX IF NOT EXISTS idx_sample_created_at ON public.sample(created_at);

-- Enable Row Level Security
ALTER TABLE public.sample ENABLE ROW LEVEL SECURITY;

-- Create policies for sample table

-- Users can view their own samples
CREATE POLICY "Users can view their own samples" ON public.sample
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own samples
CREATE POLICY "Users can insert their own samples" ON public.sample
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own samples (only certain fields and only if status allows)
CREATE POLICY "Users can update their own samples" ON public.sample
    FOR UPDATE USING (
        auth.uid() = user_id AND
        status IN ('draft', 'submitted', 'received') -- Only allow updates for early statuses
    );

-- Admins, directors, and judges can view all samples
CREATE POLICY "Staff can view all samples" ON public.sample
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

-- Admins and directors can update any sample
CREATE POLICY "Admins and directors can update samples" ON public.sample
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Create storage bucket for QR codes (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for QR codes bucket
CREATE POLICY "Anyone can view QR codes" ON storage.objects
    FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

-- Create trigger to update updated_at on sample
DROP TRIGGER IF EXISTS handle_updated_at_sample ON public.sample;
CREATE TRIGGER handle_updated_at_sample
    BEFORE UPDATE ON public.sample
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate unique tracking code (if not exists)
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate a tracking code: CC-YYYY-XXXXXX (CC = Cocoa Competition, YYYY = year, XXXXXX = random)
        code := 'CC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

        -- Check if this code already exists
        SELECT COUNT(*) INTO exists_check FROM public.sample WHERE tracking_code = code;

        -- If it doesn't exist, we can use it
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.sample TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_tracking_code() TO anon, authenticated;

-- Create cocoa_bean table
CREATE TABLE IF NOT EXISTS public.cocoa_bean (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES public.sample(id) ON DELETE CASCADE NOT NULL,

    -- Sample Origin Data
    country TEXT NOT NULL,
    department TEXT,
    municipality TEXT,
    district TEXT,
    farm_name TEXT NOT NULL,
    cocoa_area_hectares DECIMAL(10,2),

    -- Sample Owner Data
    owner_full_name TEXT NOT NULL,
    identification_document TEXT,
    phone_number TEXT,
    email TEXT,
    home_address TEXT,
    belongs_to_cooperative BOOLEAN DEFAULT FALSE,
    cooperative_name TEXT,

    -- Sample Information
    quantity INTEGER NOT NULL DEFAULT 3,
    genetic_material TEXT,
    crop_age INTEGER,
    sample_source_hectares DECIMAL(10,2),
    moisture_content DECIMAL(5,2),
    fermentation_percentage DECIMAL(5,2),

    -- Processing Information
    fermenter_type TEXT,
    fermentation_time INTEGER, -- in hours
    drying_type TEXT,
    drying_time INTEGER, -- in hours

    -- Additional Information
    variety TEXT,
    lot_number TEXT,
    harvest_date DATE,
    growing_altitude_masl INTEGER,
    bean_certifications JSONB,

    -- Constraints
    CONSTRAINT valid_cooperative_name_bean CHECK (
        (belongs_to_cooperative = FALSE AND cooperative_name IS NULL) OR
        (belongs_to_cooperative = TRUE AND cooperative_name IS NOT NULL)
    ),
    CONSTRAINT valid_bean_certifications CHECK (
        bean_certifications IS NULL OR (
            jsonb_typeof(bean_certifications) = 'object' AND
            (bean_certifications ? 'organic') AND
            (bean_certifications ? 'fairtrade') AND
            (bean_certifications ? 'direct_trade') AND
            (bean_certifications ? 'none') AND
            (bean_certifications ? 'other')
        )
    )
);

-- Create indexes for cocoa_bean
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_sample_id ON public.cocoa_bean(sample_id);
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_country ON public.cocoa_bean(country);
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_farm_name ON public.cocoa_bean(farm_name);
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_lot_number ON public.cocoa_bean(lot_number);
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_harvest_date ON public.cocoa_bean(harvest_date);
CREATE INDEX IF NOT EXISTS idx_cocoa_bean_bean_certifications ON public.cocoa_bean USING GIN (bean_certifications);

-- Enable RLS for cocoa_bean
ALTER TABLE public.cocoa_bean ENABLE ROW LEVEL SECURITY;

-- Policies for cocoa_bean (inherit from sample permissions)
CREATE POLICY "Users can view their own bean samples" ON public.cocoa_bean
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_bean.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own bean samples" ON public.cocoa_bean
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_bean.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own bean samples" ON public.cocoa_bean
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_bean.sample_id AND user_id = auth.uid() AND
            status IN ('draft', 'submitted', 'received')
        )
    );

CREATE POLICY "Staff can view all bean samples" ON public.cocoa_bean
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

CREATE POLICY "Admins and directors can update bean samples" ON public.cocoa_bean
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Grant permissions for cocoa_bean
GRANT ALL ON public.cocoa_bean TO anon, authenticated;

-- Create cocoa_liquor table
CREATE TABLE IF NOT EXISTS public.cocoa_liquor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES public.sample(id) ON DELETE CASCADE NOT NULL,

    -- Liquor Information
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    batch TEXT NOT NULL,
    processing_date DATE,
    country_processing TEXT NOT NULL,
    lecithin_percentage DECIMAL(5,2) NOT NULL,
    cocoa_butter_percentage DECIMAL(5,2),
    grinding_temperature_celsius DECIMAL(5,2),
    grinding_time_hours DECIMAL(5,2),
    processing_method TEXT NOT NULL,
    cocoa_origin_country TEXT NOT NULL,
    cocoa_variety TEXT,

    -- Additional fields
    lot_number TEXT,
    harvest_date DATE
);

-- Create indexes for cocoa_liquor
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_sample_id ON public.cocoa_liquor(sample_id);
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_name ON public.cocoa_liquor(name);
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_brand ON public.cocoa_liquor(brand);
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_country_processing ON public.cocoa_liquor(country_processing);
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_lot_number ON public.cocoa_liquor(lot_number);
CREATE INDEX IF NOT EXISTS idx_cocoa_liquor_harvest_date ON public.cocoa_liquor(harvest_date);

-- Enable RLS for cocoa_liquor
ALTER TABLE public.cocoa_liquor ENABLE ROW LEVEL SECURITY;

-- Policies for cocoa_liquor (inherit from sample permissions)
CREATE POLICY "Users can view their own liquor samples" ON public.cocoa_liquor
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_liquor.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own liquor samples" ON public.cocoa_liquor
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_liquor.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own liquor samples" ON public.cocoa_liquor
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = cocoa_liquor.sample_id AND user_id = auth.uid() AND
            status IN ('draft', 'submitted', 'received')
        )
    );

CREATE POLICY "Staff can view all liquor samples" ON public.cocoa_liquor
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

CREATE POLICY "Admins and directors can update liquor samples" ON public.cocoa_liquor
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Grant permissions for cocoa_liquor
GRANT ALL ON public.cocoa_liquor TO anon, authenticated;

-- Create chocolate table
CREATE TABLE IF NOT EXISTS public.chocolate (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES public.sample(id) ON DELETE CASCADE NOT NULL,

    -- Basic Information
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    batch TEXT NOT NULL,
    production_date DATE,
    manufacturer_country TEXT NOT NULL,

    -- Origin Information
    cocoa_origin_country TEXT NOT NULL,
    region TEXT,
    municipality TEXT,
    farm_name TEXT,
    cocoa_variety TEXT NOT NULL,
    fermentation_method TEXT NOT NULL,
    drying_method TEXT NOT NULL,

    -- Product Specifications
    type TEXT NOT NULL, -- Dark, Milk, White, Ruby, Blend
    cocoa_percentage DECIMAL(5,2) NOT NULL,
    cocoa_butter_percentage DECIMAL(5,2),

    -- Processing Information
    sweeteners TEXT[],
    sweetener_other TEXT,
    lecithin TEXT[], -- Soy, Sunflower, None
    natural_flavors TEXT[], -- Vanilla, Cinnamon, None, Other
    natural_flavors_other TEXT,
    allergens TEXT[], -- Gluten, Lactose, Nuts, Soy, None
    certifications TEXT[],
    certifications_other TEXT,
    conching_time_hours DECIMAL(5,2),
    conching_temperature_celsius DECIMAL(5,2),
    tempering_method TEXT NOT NULL, -- Manual, Machine, Untempered
    final_granulation_microns INTEGER,
    competition_category TEXT,

    -- Additional fields
    lot_number TEXT
);

-- Create indexes for chocolate
CREATE INDEX IF NOT EXISTS idx_chocolate_sample_id ON public.chocolate(sample_id);
CREATE INDEX IF NOT EXISTS idx_chocolate_name ON public.chocolate(name);
CREATE INDEX IF NOT EXISTS idx_chocolate_brand ON public.chocolate(brand);
CREATE INDEX IF NOT EXISTS idx_chocolate_manufacturer_country ON public.chocolate(manufacturer_country);
CREATE INDEX IF NOT EXISTS idx_chocolate_cocoa_origin_country ON public.chocolate(cocoa_origin_country);
CREATE INDEX IF NOT EXISTS idx_chocolate_type ON public.chocolate(type);
CREATE INDEX IF NOT EXISTS idx_chocolate_cocoa_percentage ON public.chocolate(cocoa_percentage);
CREATE INDEX IF NOT EXISTS idx_chocolate_lot_number ON public.chocolate(lot_number);

-- Enable RLS for chocolate
ALTER TABLE public.chocolate ENABLE ROW LEVEL SECURITY;

-- Policies for chocolate (inherit from sample permissions)
CREATE POLICY "Users can view their own chocolate samples" ON public.chocolate
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = chocolate.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own chocolate samples" ON public.chocolate
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = chocolate.sample_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own chocolate samples" ON public.chocolate
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = chocolate.sample_id AND user_id = auth.uid() AND
            status IN ('draft', 'submitted', 'received')
        )
    );

CREATE POLICY "Staff can view all chocolate samples" ON public.chocolate
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

CREATE POLICY "Admins and directors can update chocolate samples" ON public.chocolate
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Grant permissions for chocolate
GRANT ALL ON public.chocolate TO anon, authenticated;

-- Create a view to combine all sample data for backward compatibility
CREATE OR REPLACE VIEW public.samples AS
SELECT
    s.id,
    s.contest_id,
    s.user_id,
    s.tracking_code,
    s.qr_code_data,
    s.qr_code_url,
    s.status,
    s.payment_method,
    s.payment_status,
    s.payment_reference,
    s.agreed_to_terms,
    s.created_at,
    s.updated_at,
    -- Product type from the specific table
    CASE
        WHEN cb.id IS NOT NULL THEN 'bean'
        WHEN cl.id IS NOT NULL THEN 'liquor'
        WHEN ch.id IS NOT NULL THEN 'chocolate'
        ELSE NULL
    END as product_type,
    -- Bean fields
    cb.country,
    cb.department,
    cb.municipality,
    cb.district,
    cb.farm_name,
    cb.cocoa_area_hectares,
    cb.owner_full_name,
    cb.identification_document,
    cb.phone_number,
    cb.email,
    cb.home_address,
    cb.belongs_to_cooperative,
    cb.cooperative_name,
    cb.quantity,
    cb.genetic_material,
    cb.crop_age,
    cb.sample_source_hectares,
    cb.moisture_content,
    cb.fermentation_percentage,
    cb.fermenter_type,
    cb.fermentation_time,
    cb.drying_type,
    cb.drying_time,
    cb.variety,
    cb.lot_number,
    cb.harvest_date,
    cb.growing_altitude_masl,
    cb.bean_certifications,
    -- Chocolate details (reconstructed as JSON for compatibility)
    CASE
        WHEN ch.id IS NOT NULL THEN jsonb_build_object(
            'name', ch.name,
            'brand', ch.brand,
            'batch', ch.batch,
            'productionDate', ch.production_date,
            'manufacturerCountry', ch.manufacturer_country,
            'cocoaOriginCountry', ch.cocoa_origin_country,
            'region', ch.region,
            'municipality', ch.municipality,
            'farmName', ch.farm_name,
            'cocoaVariety', ch.cocoa_variety,
            'fermentationMethod', ch.fermentation_method,
            'dryingMethod', ch.drying_method,
            'type', ch.type,
            'cocoaPercentage', ch.cocoa_percentage,
            'cocoaButterPercentage', ch.cocoa_butter_percentage,
            'sweeteners', ch.sweeteners,
            'sweetenerOther', ch.sweetener_other,
            'lecithin', ch.lecithin,
            'naturalFlavors', ch.natural_flavors,
            'naturalFlavorsOther', ch.natural_flavors_other,
            'allergens', ch.allergens,
            'certifications', ch.certifications,
            'certificationsOther', ch.certifications_other,
            'conchingTimeHours', ch.conching_time_hours,
            'conchingTemperatureCelsius', ch.conching_temperature_celsius,
            'temperingMethod', ch.tempering_method,
            'finalGranulationMicrons', ch.final_granulation_microns,
            'competitionCategory', ch.competition_category
        )
        ELSE NULL
    END as chocolate_details,
    -- Liquor details (reconstructed as JSON for compatibility)
    CASE
        WHEN cl.id IS NOT NULL THEN jsonb_build_object(
            'name', cl.name,
            'brand', cl.brand,
            'batch', cl.batch,
            'processingDate', cl.processing_date,
            'countryProcessing', cl.country_processing,
            'lecithinPercentage', cl.lecithin_percentage,
            'cocoaButterPercentage', cl.cocoa_butter_percentage,
            'grindingTemperatureCelsius', cl.grinding_temperature_celsius,
            'grindingTimeHours', cl.grinding_time_hours,
            'processingMethod', cl.processing_method,
            'cocoaOriginCountry', cl.cocoa_origin_country,
            'cocoaVariety', cl.cocoa_variety
        )
        ELSE NULL
    END as liquor_details
FROM public.sample s
LEFT JOIN public.cocoa_bean cb ON cb.sample_id = s.id
LEFT JOIN public.cocoa_liquor cl ON cl.sample_id = s.id
LEFT JOIN public.chocolate ch ON ch.sample_id = s.id;

-- Grant permissions on the view
GRANT SELECT ON public.samples TO anon, authenticated;

-- Migration to update foreign keys in evaluation tables to reference the new sample table
-- This fixes the issue where sensory_evaluations and physical_evaluations reference the old samples table/view

-- Update sensory_evaluations foreign key to reference sample instead of samples
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sensory_evaluations_sample_id_fkey'
        AND table_name = 'sensory_evaluations'
    ) THEN
        ALTER TABLE public.sensory_evaluations DROP CONSTRAINT sensory_evaluations_sample_id_fkey;
    END IF;

    -- Add new foreign key constraint to sample table
    ALTER TABLE public.sensory_evaluations
    ADD CONSTRAINT sensory_evaluations_sample_id_fkey
    FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;
END $$;

-- Update physical_evaluations foreign key to reference sample instead of samples
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'physical_evaluations_sample_id_fkey'
        AND table_name = 'physical_evaluations'
    ) THEN
        ALTER TABLE public.physical_evaluations DROP CONSTRAINT physical_evaluations_sample_id_fkey;
    END IF;

    -- Add new foreign key constraint to sample table
    ALTER TABLE public.physical_evaluations
    ADD CONSTRAINT physical_evaluations_sample_id_fkey
    FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;
END $$;

-- Update triggers and functions that reference samples to use sample
-- Update sensory evaluation trigger function
CREATE OR REPLACE FUNCTION update_sample_status_on_sensory_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sample status to 'evaluated' when sensory evaluation is saved
    UPDATE public.sample
    SET status = 'evaluated', updated_at = NOW()
    WHERE id = NEW.sample_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update physical evaluation trigger function
CREATE OR REPLACE FUNCTION update_sample_status_on_physical_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the sample status based on the evaluation result
    UPDATE public.sample
    SET
        status = CASE
            WHEN NEW.global_evaluation = 'disqualified' THEN 'disqualified'
            ELSE 'physical_evaluation'
        END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.sample_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies that reference samples to use sample
-- Update sensory_evaluations policies
DROP POLICY IF EXISTS "Participants can view evaluations of their samples" ON public.sensory_evaluations;
CREATE POLICY "Participants can view evaluations of their samples" ON public.sensory_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample s
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE s.id = sample_id
            AND s.user_id = auth.uid()
            AND p.role = 'participant'
        )
    );

-- Update physical_evaluations policies
DROP POLICY IF EXISTS "Participants can view their own sample evaluations" ON public.physical_evaluations;
CREATE POLICY "Participants can view their own sample evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample s
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE s.id = sample_id
            AND s.user_id = auth.uid()
            AND p.role = 'participant'
            AND s.status IN ('disqualified', 'approved', 'evaluated')
        )
    );

-- Update sample status constraint to include the new statuses
DO $$
BEGIN
    -- Check if the constraint exists and includes all required statuses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_schema = cc.constraint_schema AND tc.constraint_name = cc.constraint_name
        WHERE tc.constraint_type = 'CHECK'
        AND tc.table_name = 'sample'
        AND tc.constraint_name LIKE '%status%'
        AND cc.check_clause LIKE '%physical_evaluation%'
        AND cc.check_clause LIKE '%evaluated%'
    ) THEN
        -- Drop existing constraint and recreate with all statuses
        ALTER TABLE public.sample DROP CONSTRAINT IF EXISTS sample_status_check;
        ALTER TABLE public.sample ADD CONSTRAINT sample_status_check
            CHECK (status IN ('draft', 'submitted', 'received', 'disqualified', 'approved', 'physical_evaluation', 'evaluated'));
    END IF;
END $$;