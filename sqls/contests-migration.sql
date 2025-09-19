-- Migration to add contests table for Contest Management feature

-- Create contests table
CREATE TABLE IF NOT EXISTS public.contests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    sample_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

-- Create policies for contests table
-- Admins and directors can view all contests
CREATE POLICY "Admins and directors can view all contests" ON public.contests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- All authenticated users can view contests (for general viewing)
CREATE POLICY "All authenticated users can view contests" ON public.contests
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and directors can insert contests
CREATE POLICY "Admins and directors can insert contests" ON public.contests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Only admins and directors can update contests
CREATE POLICY "Admins and directors can update contests" ON public.contests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Only admins and directors can delete contests
CREATE POLICY "Admins and directors can delete contests" ON public.contests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Create trigger to update updated_at on contests
DROP TRIGGER IF EXISTS handle_updated_at_contests ON public.contests;
CREATE TRIGGER handle_updated_at_contests
    BEFORE UPDATE ON public.contests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.contests TO anon, authenticated;

-- Insert demo data (optional - matches the existing mock data)
-- Note: Status will be calculated dynamically based on dates
INSERT INTO public.contests (id, name, description, location, start_date, end_date, sample_price, created_by) 
SELECT 
    gen_random_uuid(),
    'International Cocoa Quality Competition 2024',
    'Premier global competition evaluating cocoa bean quality, processing techniques, and sustainable farming practices.',
    'Brussels, Belgium',
    '2024-06-15'::date,
    '2024-06-18'::date,
    150.00,
    p.id
FROM public.profiles p 
WHERE p.role = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.contests (id, name, description, location, start_date, end_date, sample_price, created_by) 
SELECT 
    gen_random_uuid(),
    'Artisan Chocolate Awards',
    'Celebrating exceptional craftsmanship in artisan chocolate making with focus on flavor innovation and presentation.',
    'San Francisco, USA',
    '2024-04-10'::date,
    '2024-04-12'::date,
    200.00,
    p.id
FROM public.profiles p 
WHERE p.role = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add a future contest for testing
INSERT INTO public.contests (id, name, description, location, start_date, end_date, sample_price, created_by) 
SELECT 
    gen_random_uuid(),
    'Future Cocoa Innovation Summit',
    'Exploring the future of cocoa farming and chocolate production with cutting-edge technology.',
    'London, UK',
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '33 days',
    175.00,
    p.id
FROM public.profiles p 
WHERE p.role = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;