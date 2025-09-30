-- Safe migration to add comprehensive chocolate sensory evaluation fields
-- This version handles existing data gracefully and applies constraints after data migration

-- Step 1: Add the chocolate_data column without constraints
ALTER TABLE public.sensory_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_data JSONB;

-- Step 2: Add comment to explain the chocolate_data structure
COMMENT ON COLUMN public.sensory_evaluations.chocolate_data IS 
'Comprehensive chocolate sensory evaluation data with structure:
{
  "appearance": {
    "color": number (0-10),
    "gloss": number (0-10), 
    "surfaceHomogeneity": number (0-10)
  },
  "aroma": {
    "aromaIntensity": number (0-10),
    "aromaQuality": number (0-10),
    "specificNotes": {
      "floral": number (0-10),
      "fruity": number (0-10),
      "toasted": number (0-10),
      "hazelnut": number (0-10),
      "earthy": number (0-10),
      "spicy": number (0-10),
      "milky": number (0-10),
      "woody": number (0-10)
    }
  },
  "texture": {
    "smoothness": number (0-10),
    "melting": number (0-10),
    "body": number (0-10)
  },
  "flavor": {
    "sweetness": number (0-10),
    "bitterness": number (0-10),
    "acidity": number (0-10),
    "flavorIntensity": number (0-10),
    "flavorNotes": {
      "citrus": number (0-10),
      "redFruits": number (0-10),
      "nuts": number (0-10),
      "vanilla": number (0-10),
      "caramel": number (0-10),
      "honey": number (0-10),
      "spices": number (0-10),
      "herbs": number (0-10),
      "tobacco": number (0-10),
      "leather": number (0-10)
    }
  },
  "aftertaste": {
    "persistence": number (0-10),
    "aftertasteQuality": number (0-10),
    "finalBalance": number (0-10)
  }
}';

-- Step 3: Add indexes for better performance on chocolate evaluation queries
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_chocolate_data ON public.sensory_evaluations USING GIN (chocolate_data);
CREATE INDEX IF NOT EXISTS idx_sensory_evaluations_evaluation_type ON public.sensory_evaluations(evaluation_type);

-- Step 4: Populate existing chocolate evaluations with basic chocolate_data structure
UPDATE public.sensory_evaluations 
SET chocolate_data = jsonb_build_object(
  'appearance', jsonb_build_object(
    'color', 5.0,
    'gloss', 5.0,
    'surfaceHomogeneity', 5.0
  ),
  'aroma', jsonb_build_object(
    'aromaIntensity', 5.0,
    'aromaQuality', 5.0,
    'specificNotes', jsonb_build_object(
      'floral', 0,
      'fruity', 0,
      'toasted', 0,
      'hazelnut', 0,
      'earthy', 0,
      'spicy', 0,
      'milky', 0,
      'woody', 0
    )
  ),
  'texture', jsonb_build_object(
    'smoothness', 5.0,
    'melting', 5.0,
    'body', 5.0
  ),
  'flavor', jsonb_build_object(
    'sweetness', COALESCE(sweetness, 5.0),
    'bitterness', 5.0,
    'acidity', 5.0,
    'flavorIntensity', 5.0,
    'flavorNotes', jsonb_build_object(
      'citrus', 0,
      'redFruits', 0,
      'nuts', 0,
      'vanilla', 0,
      'caramel', 0,
      'honey', 0,
      'spices', 0,
      'herbs', 0,
      'tobacco', 0,
      'leather', 0
    )
  ),
  'aftertaste', jsonb_build_object(
    'persistence', 5.0,
    'aftertasteQuality', 5.0,
    'finalBalance', 5.0
  )
)
WHERE evaluation_type = 'chocolate' 
  AND chocolate_data IS NULL;

-- Step 5: Function to validate chocolate evaluation data structure
CREATE OR REPLACE FUNCTION validate_chocolate_evaluation_data(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if data is null (for non-chocolate evaluations)
  IF data IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if all required sections exist
  IF NOT (
    data ? 'appearance' AND
    data ? 'aroma' AND 
    data ? 'texture' AND
    data ? 'flavor' AND
    data ? 'aftertaste'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check appearance section
  IF NOT (
    data->'appearance' ? 'color' AND
    data->'appearance' ? 'gloss' AND
    data->'appearance' ? 'surfaceHomogeneity'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check aroma section
  IF NOT (
    data->'aroma' ? 'aromaIntensity' AND
    data->'aroma' ? 'aromaQuality' AND
    data->'aroma' ? 'specificNotes'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check texture section
  IF NOT (
    data->'texture' ? 'smoothness' AND
    data->'texture' ? 'melting' AND
    data->'texture' ? 'body'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check flavor section
  IF NOT (
    data->'flavor' ? 'sweetness' AND
    data->'flavor' ? 'bitterness' AND
    data->'flavor' ? 'acidity' AND
    data->'flavor' ? 'flavorIntensity' AND
    data->'flavor' ? 'flavorNotes'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check aftertaste section
  IF NOT (
    data->'aftertaste' ? 'persistence' AND
    data->'aftertaste' ? 'aftertasteQuality' AND
    data->'aftertaste' ? 'finalBalance'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Add constraint to ensure chocolate_data is present when evaluation_type is 'chocolate'
-- This is applied AFTER we've populated existing data
ALTER TABLE public.sensory_evaluations 
ADD CONSTRAINT check_chocolate_data_when_chocolate_type 
CHECK (
  (evaluation_type != 'chocolate') OR 
  (evaluation_type = 'chocolate' AND chocolate_data IS NOT NULL)
);

-- Step 7: Add constraint to validate chocolate data structure
ALTER TABLE public.sensory_evaluations 
ADD CONSTRAINT check_valid_chocolate_data_structure 
CHECK (
  (evaluation_type != 'chocolate') OR 
  (evaluation_type = 'chocolate' AND validate_chocolate_evaluation_data(chocolate_data))
);

-- Step 8: Function to calculate chocolate overall quality from chocolate_data
CREATE OR REPLACE FUNCTION calculate_chocolate_overall_quality(data JSONB)
RETURNS DECIMAL(3,1) AS $$
DECLARE
  total_score DECIMAL(10,2) := 0;
  complexity_bonus DECIMAL(10,2) := 0;
  specific_notes_count INTEGER := 0;
  flavor_notes_count INTEGER := 0;
BEGIN
  -- Return 0 if data is null
  IF data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate base score from 15 main attributes (3+2+3+4+3)
  -- Appearance (3 attributes)
  total_score := total_score + COALESCE((data->'appearance'->>'color')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'appearance'->>'gloss')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'appearance'->>'surfaceHomogeneity')::DECIMAL, 0);
  
  -- Aroma (2 main attributes)
  total_score := total_score + COALESCE((data->'aroma'->>'aromaIntensity')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'aroma'->>'aromaQuality')::DECIMAL, 0);
  
  -- Texture (3 attributes)
  total_score := total_score + COALESCE((data->'texture'->>'smoothness')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'texture'->>'melting')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'texture'->>'body')::DECIMAL, 0);
  
  -- Flavor (4 main attributes)
  total_score := total_score + COALESCE((data->'flavor'->>'sweetness')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'flavor'->>'bitterness')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'flavor'->>'acidity')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'flavor'->>'flavorIntensity')::DECIMAL, 0);
  
  -- Aftertaste (3 attributes)
  total_score := total_score + COALESCE((data->'aftertaste'->>'persistence')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'aftertaste'->>'aftertasteQuality')::DECIMAL, 0);
  total_score := total_score + COALESCE((data->'aftertaste'->>'finalBalance')::DECIMAL, 0);
  
  -- Calculate complexity bonuses
  -- Count specific aroma notes > 0
  SELECT COUNT(*) INTO specific_notes_count
  FROM jsonb_each_text(data->'aroma'->'specificNotes')
  WHERE value::DECIMAL > 0;
  
  -- Count flavor notes > 0
  SELECT COUNT(*) INTO flavor_notes_count
  FROM jsonb_each_text(data->'flavor'->'flavorNotes')
  WHERE value::DECIMAL > 0;
  
  -- Add complexity bonuses (max 1.0 each)
  complexity_bonus := LEAST(specific_notes_count * 0.1, 1.0) + LEAST(flavor_notes_count * 0.1, 1.0);
  
  -- Calculate final score (base score / 15 * 10 + complexity bonus)
  RETURN LEAST((total_score / 15.0 * 10.0 + complexity_bonus), 10.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 9: Add trigger to automatically calculate overall_quality for chocolate evaluations
CREATE OR REPLACE FUNCTION update_chocolate_overall_quality()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update for chocolate evaluations
  IF NEW.evaluation_type = 'chocolate' AND NEW.chocolate_data IS NOT NULL THEN
    NEW.overall_quality := calculate_chocolate_overall_quality(NEW.chocolate_data);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_chocolate_overall_quality ON public.sensory_evaluations;
CREATE TRIGGER trigger_update_chocolate_overall_quality
  BEFORE INSERT OR UPDATE ON public.sensory_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_chocolate_overall_quality();

-- Step 10: Create view for easy access to chocolate evaluation data
CREATE OR REPLACE VIEW chocolate_evaluation_summary AS
SELECT 
  se.id,
  se.sample_id,
  se.judge_id,
  se.evaluation_date,
  se.evaluation_time,
  se.evaluator_name,
  se.sample_code,
  se.overall_quality,
  
  -- Appearance scores
  (se.chocolate_data->'appearance'->>'color')::DECIMAL as appearance_color,
  (se.chocolate_data->'appearance'->>'gloss')::DECIMAL as appearance_gloss,
  (se.chocolate_data->'appearance'->>'surfaceHomogeneity')::DECIMAL as appearance_surface_homogeneity,
  
  -- Aroma scores
  (se.chocolate_data->'aroma'->>'aromaIntensity')::DECIMAL as aroma_intensity,
  (se.chocolate_data->'aroma'->>'aromaQuality')::DECIMAL as aroma_quality,
  
  -- Texture scores
  (se.chocolate_data->'texture'->>'smoothness')::DECIMAL as texture_smoothness,
  (se.chocolate_data->'texture'->>'melting')::DECIMAL as texture_melting,
  (se.chocolate_data->'texture'->>'body')::DECIMAL as texture_body,
  
  -- Flavor scores
  (se.chocolate_data->'flavor'->>'sweetness')::DECIMAL as flavor_sweetness,
  (se.chocolate_data->'flavor'->>'bitterness')::DECIMAL as flavor_bitterness,
  (se.chocolate_data->'flavor'->>'acidity')::DECIMAL as flavor_acidity,
  (se.chocolate_data->'flavor'->>'flavorIntensity')::DECIMAL as flavor_intensity,
  
  -- Aftertaste scores
  (se.chocolate_data->'aftertaste'->>'persistence')::DECIMAL as aftertaste_persistence,
  (se.chocolate_data->'aftertaste'->>'aftertasteQuality')::DECIMAL as aftertaste_quality,
  (se.chocolate_data->'aftertaste'->>'finalBalance')::DECIMAL as aftertaste_final_balance,
  
  -- Full chocolate data for detailed analysis
  se.chocolate_data,
  
  se.created_at,
  se.updated_at
FROM public.sensory_evaluations se
WHERE se.evaluation_type = 'chocolate'
  AND se.chocolate_data IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON chocolate_evaluation_summary TO authenticated;
GRANT SELECT ON chocolate_evaluation_summary TO anon;