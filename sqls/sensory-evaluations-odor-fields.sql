-- Migration to add typical and atypical odor fields to sensory_evaluations table

-- Add typical_odors and atypical_odors JSON columns to sensory_evaluations table
ALTER TABLE public.sensory_evaluations 
ADD COLUMN IF NOT EXISTS typical_odors JSONB DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS atypical_odors JSONB DEFAULT '{}' NOT NULL;

-- Create indexes for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_typical_odors ON public.sensory_evaluations USING GIN (typical_odors);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_atypical_odors ON public.sensory_evaluations USING GIN (atypical_odors);

-- Add comments to document the structure
COMMENT ON COLUMN public.sensory_evaluations.typical_odors IS 'JSON object storing typical odor checkboxes: cleanCacao, chocolate, ripeFruit, floral, spicy, caramelSweet, honeyMolasses, driedFruits, citrus, freshHerbal, butterySoftDairy, lightSmoky';
COMMENT ON COLUMN public.sensory_evaluations.atypical_odors IS 'JSON object storing atypical odor checkboxes: excessFermentation, moldDamp, earthClay, intenseSmokeOrBurnt, rancidOxidized, medicinalChemical, animalLeather, soapDetergent, pronouncedTannicNote, sulfurousRottenEgg, fuelGasolineDiesel, industrialSolvents';

-- Example of expected JSON structure:
-- typical_odors: {"cleanCacao": true, "chocolate": false, "ripeFruit": true, ...}
-- atypical_odors: {"excessFermentation": false, "moldDamp": true, "earthClay": false, ...}