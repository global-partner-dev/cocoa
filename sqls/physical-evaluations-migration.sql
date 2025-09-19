-- Migration to add physical_evaluations table for Physical Evaluation feature

-- Create physical_evaluations table
CREATE TABLE IF NOT EXISTS public.physical_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Reference to the sample being evaluated
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- 1. Undesirable Aromas
    undesirable_aromas TEXT[] DEFAULT '{}' NOT NULL,
    has_undesirable_aromas BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- 2. Humidity
    percentage_humidity DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 3. Broken grains
    broken_grains DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 4. Violated grains
    violated_grains BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- 5. Flat grains
    flat_grains DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 6. Affected grains/insects
    affected_grains_insects INTEGER DEFAULT 0 NOT NULL,
    has_affected_grains BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- 7. Fermentation Analysis
    well_fermented_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    lightly_fermented_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 8. Purple beans (unfermented)
    purple_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 9. Slaty beans
    slaty_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 10. Internal moldy beans
    internal_moldy_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- 11. Over-fermented beans
    over_fermented_beans DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- Evaluation metadata
    notes TEXT DEFAULT '' NOT NULL,
    evaluated_by TEXT NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Evaluation results
    global_evaluation TEXT DEFAULT 'passed' CHECK (global_evaluation IN ('passed', 'disqualified')) NOT NULL,
    disqualification_reasons TEXT[] DEFAULT '{}' NOT NULL,
    warnings TEXT[] DEFAULT '{}' NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_physical_evaluations_sample_id ON public.physical_evaluations(sample_id);
CREATE INDEX IF NOT EXISTS idx_physical_evaluations_global_evaluation ON public.physical_evaluations(global_evaluation);
CREATE INDEX IF NOT EXISTS idx_physical_evaluations_evaluated_at ON public.physical_evaluations(evaluated_at);
CREATE INDEX IF NOT EXISTS idx_physical_evaluations_created_at ON public.physical_evaluations(created_at);

-- Enable Row Level Security
ALTER TABLE public.physical_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for physical_evaluations table

-- Directors and admins can view all physical evaluations
CREATE POLICY "Directors and admins can view all physical evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Directors and admins can insert physical evaluations
CREATE POLICY "Directors and admins can insert physical evaluations" ON public.physical_evaluations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Directors and admins can update physical evaluations
CREATE POLICY "Directors and admins can update physical evaluations" ON public.physical_evaluations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director')
        )
    );

-- Judges and evaluators can view physical evaluations (read-only)
CREATE POLICY "Judges and evaluators can view physical evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('judge', 'evaluator')
        )
    );

-- Participants can view their own sample's physical evaluation (if it exists and is completed)
CREATE POLICY "Participants can view their own sample evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.samples s
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE s.id = sample_id 
            AND s.user_id = auth.uid()
            AND p.role = 'participant'
            AND s.status IN ('disqualified', 'approved', 'evaluated')
        )
    );

-- Create trigger to update updated_at on physical_evaluations
DROP TRIGGER IF EXISTS handle_updated_at_physical_evaluations ON public.physical_evaluations;
CREATE TRIGGER handle_updated_at_physical_evaluations
    BEFORE UPDATE ON public.physical_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Update samples table to include 'physical_evaluation' status if not already present
DO $$
BEGIN
    -- Check if 'physical_evaluation' status exists in the constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%samples_status_check%' 
        AND check_clause LIKE '%physical_evaluation%'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS samples_status_check;
        
        -- Add the new constraint with 'physical_evaluation' status
        ALTER TABLE public.samples ADD CONSTRAINT samples_status_check 
        CHECK (status IN ('submitted', 'received', 'physical_evaluation', 'disqualified', 'approved', 'evaluated'));
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.physical_evaluations TO anon, authenticated;

-- Create function to automatically update sample status when physical evaluation is saved
CREATE OR REPLACE FUNCTION update_sample_status_on_physical_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the sample status based on the evaluation result
    UPDATE public.samples 
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

-- Create trigger to automatically update sample status
DROP TRIGGER IF EXISTS update_sample_status_on_physical_evaluation_trigger ON public.physical_evaluations;
CREATE TRIGGER update_sample_status_on_physical_evaluation_trigger
    AFTER INSERT OR UPDATE ON public.physical_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_sample_status_on_physical_evaluation();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_sample_status_on_physical_evaluation() TO anon, authenticated;