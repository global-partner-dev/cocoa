-- Migration to add samples table for Sample Submission feature

-- Create samples table
CREATE TABLE IF NOT EXISTS public.samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Contest and User Information
    contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Sample Identification
    tracking_code TEXT UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL, -- JSON data for QR code
    qr_code_url TEXT, -- URL to downloadable QR code image
    
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
    
    -- Payment Information (for future integration)
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_reference TEXT,
    
    -- Sample Status
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'received', 'disqualified', 'approved', 'evaluated')),
    
    -- Terms Agreement
    agreed_to_terms BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_cooperative_name CHECK (
        (belongs_to_cooperative = FALSE AND cooperative_name IS NULL) OR
        (belongs_to_cooperative = TRUE AND cooperative_name IS NOT NULL)
    ),
    CONSTRAINT valid_terms_agreement CHECK (agreed_to_terms = TRUE)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_samples_contest_id ON public.samples(contest_id);
CREATE INDEX IF NOT EXISTS idx_samples_user_id ON public.samples(user_id);
CREATE INDEX IF NOT EXISTS idx_samples_tracking_code ON public.samples(tracking_code);
CREATE INDEX IF NOT EXISTS idx_samples_status ON public.samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON public.samples(created_at);

-- Enable Row Level Security
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

-- Create policies for samples table

-- Users can view their own samples
CREATE POLICY "Users can view their own samples" ON public.samples
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own samples
CREATE POLICY "Users can insert their own samples" ON public.samples
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own samples (only certain fields and only if status allows)
CREATE POLICY "Users can update their own samples" ON public.samples
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('submitted', 'received') -- Only allow updates for early statuses
    );

-- Admins, directors, and judges can view all samples
CREATE POLICY "Staff can view all samples" ON public.samples
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

-- Admins and directors can update any sample
CREATE POLICY "Admins and directors can update samples" ON public.samples
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true) -- Public bucket for QR code downloads
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for QR codes bucket
CREATE POLICY "Anyone can view QR codes" ON storage.objects
    FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

-- Create trigger to update updated_at on samples
DROP TRIGGER IF EXISTS handle_updated_at_samples ON public.samples;
CREATE TRIGGER handle_updated_at_samples
    BEFORE UPDATE ON public.samples
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate unique tracking code
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
        SELECT COUNT(*) INTO exists_check FROM public.samples WHERE tracking_code = code;
        
        -- If it doesn't exist, we can use it
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.samples TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_tracking_code() TO anon, authenticated;