-- Migration to add sensory_evaluations table for Sensory Evaluation feature

-- Create sensory_evaluations table
CREATE TABLE IF NOT EXISTS public.sensory_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Sample and Judge Information
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Meta Information
    evaluation_date DATE NOT NULL,
    evaluation_time TIME NOT NULL,
    evaluator_name TEXT NOT NULL,
    sample_code TEXT NOT NULL,
    sample_notes TEXT,
    evaluation_type TEXT CHECK (evaluation_type IN ('cocoa_mass', 'chocolate')) DEFAULT 'cocoa_mass',
    
    -- Main Sensory Scores (0-10 scale)
    cacao DECIMAL(3,1) NOT NULL DEFAULT 0,
    bitterness DECIMAL(3,1) NOT NULL DEFAULT 0,
    astringency DECIMAL(3,1) NOT NULL DEFAULT 0,
    caramel_panela DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Calculated Group Totals (0-10 scale)
    acidity_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    fresh_fruit_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    brown_fruit_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    vegetal_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    floral_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    wood_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    spice_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    nut_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    roast_degree DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_total DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Acidity Sub-attributes (0-10 scale)
    acidity_frutal DECIMAL(3,1) NOT NULL DEFAULT 0,
    acidity_acetic DECIMAL(3,1) NOT NULL DEFAULT 0,
    acidity_lactic DECIMAL(3,1) NOT NULL DEFAULT 0,
    acidity_mineral_butyric DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Fresh Fruit Sub-attributes (0-10 scale)
    fresh_fruit_berries DECIMAL(3,1) NOT NULL DEFAULT 0,
    fresh_fruit_citrus DECIMAL(3,1) NOT NULL DEFAULT 0,
    fresh_fruit_yellow_pulp DECIMAL(3,1) NOT NULL DEFAULT 0,
    fresh_fruit_dark DECIMAL(3,1) NOT NULL DEFAULT 0,
    fresh_fruit_tropical DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Brown Fruit Sub-attributes (0-10 scale)
    brown_fruit_dry DECIMAL(3,1) NOT NULL DEFAULT 0,
    brown_fruit_brown DECIMAL(3,1) NOT NULL DEFAULT 0,
    brown_fruit_overripe DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Vegetal Sub-attributes (0-10 scale)
    vegetal_grass_herb DECIMAL(3,1) NOT NULL DEFAULT 0,
    vegetal_earthy DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Floral Sub-attributes (0-10 scale)
    floral_orange_blossom DECIMAL(3,1) NOT NULL DEFAULT 0,
    floral_flowers DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Wood Sub-attributes (0-10 scale)
    wood_light DECIMAL(3,1) NOT NULL DEFAULT 0,
    wood_dark DECIMAL(3,1) NOT NULL DEFAULT 0,
    wood_resin DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Spice Sub-attributes (0-10 scale)
    spice_spices DECIMAL(3,1) NOT NULL DEFAULT 0,
    spice_tobacco DECIMAL(3,1) NOT NULL DEFAULT 0,
    spice_umami DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Nut Sub-attributes (0-10 scale)
    nut_kernel DECIMAL(3,1) NOT NULL DEFAULT 0,
    nut_skin DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Defects (0-10 scale)
    defects_dirty DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_animal DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_rotten DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_smoke DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_humid DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_moldy DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_overfermented DECIMAL(3,1) NOT NULL DEFAULT 0,
    defects_other DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Chocolate-specific attributes
    sweetness DECIMAL(3,1), -- Only for chocolate evaluation
    texture_notes TEXT,
    
    -- Overall Quality (calculated)
    overall_quality DECIMAL(3,1) NOT NULL DEFAULT 0,
    
    -- Comments
    flavor_comments TEXT,
    producer_recommendations TEXT,
    additional_positive TEXT,
    
    -- Final Verdict
    verdict TEXT CHECK (verdict IN ('Approved', 'Disqualified')) NOT NULL DEFAULT 'Approved',
    disqualification_reasons TEXT[],
    other_disqualification_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_sample_judge UNIQUE (sample_id, judge_id),
    CONSTRAINT valid_scores CHECK (
        cacao >= 0 AND cacao <= 10 AND
        bitterness >= 0 AND bitterness <= 10 AND
        astringency >= 0 AND astringency <= 10 AND
        caramel_panela >= 0 AND caramel_panela <= 10 AND
        overall_quality >= 0 AND overall_quality <= 10
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_sample_id ON public.sensory_evaluations(sample_id);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_judge_id ON public.sensory_evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_evaluation_date ON public.sensory_evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_verdict ON public.sensory_evaluations(verdict);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_created_at ON public.sensory_evaluations(created_at);

-- Enable Row Level Security
ALTER TABLE public.sensory_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for sensory_evaluations table

-- Judges can view and manage their own evaluations
CREATE POLICY "Judges can view their own evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
        auth.uid() = judge_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'judge'
        )
    );

CREATE POLICY "Judges can insert their own evaluations" ON public.sensory_evaluations
    FOR INSERT WITH CHECK (
        auth.uid() = judge_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'judge'
        )
    );

CREATE POLICY "Judges can update their own evaluations" ON public.sensory_evaluations
    FOR UPDATE USING (
        auth.uid() = judge_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'judge'
        )
    );

-- Admins, directors, and evaluators can view all sensory evaluations
CREATE POLICY "Staff can view all sensory evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'evaluator')
        )
    );

-- Admins and directors can update any sensory evaluation
CREATE POLICY "Admins and directors can update sensory evaluations" ON public.sensory_evaluations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Participants can view evaluations of their own samples (read-only)
CREATE POLICY "Participants can view evaluations of their samples" ON public.sensory_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.samples s
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE s.id = sample_id 
            AND s.user_id = auth.uid()
            AND p.role = 'participant'
        )
    );

-- Create trigger to update updated_at on sensory_evaluations
DROP TRIGGER IF EXISTS handle_updated_at_sensory_evaluations ON public.sensory_evaluations;
CREATE TRIGGER handle_updated_at_sensory_evaluations
    BEFORE UPDATE ON public.sensory_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update sample status when sensory evaluation is completed
CREATE OR REPLACE FUNCTION update_sample_status_on_sensory_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sample status to 'evaluated' when sensory evaluation is saved
    UPDATE public.samples 
    SET status = 'evaluated', updated_at = NOW()
    WHERE id = NEW.sample_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update sample status
DROP TRIGGER IF EXISTS update_sample_status_on_sensory_eval ON public.sensory_evaluations;
CREATE TRIGGER update_sample_status_on_sensory_eval
    AFTER INSERT OR UPDATE ON public.sensory_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_sample_status_on_sensory_evaluation();

-- Grant necessary permissions
GRANT ALL ON public.sensory_evaluations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_sample_status_on_sensory_evaluation() TO anon, authenticated;

-- Add 'evaluated' status to samples table constraint if not already present
DO $$
BEGIN
    -- Check if the constraint exists and includes 'evaluated'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_schema = cc.constraint_schema AND tc.constraint_name = cc.constraint_name
        WHERE tc.constraint_type = 'CHECK'
        AND tc.table_name = 'samples'
        AND tc.constraint_name LIKE '%status%'
        AND cc.check_clause LIKE '%evaluated%'
    ) THEN
        -- Drop existing constraint and recreate with 'evaluated' status
        ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS samples_status_check;
        ALTER TABLE public.samples ADD CONSTRAINT samples_status_check 
            CHECK (status IN ('submitted', 'received', 'disqualified', 'approved', 'evaluated', 'physical_evaluation'));
    END IF;
END $$;