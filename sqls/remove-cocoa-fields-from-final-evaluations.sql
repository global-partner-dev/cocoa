-- Remove unnecessary cocoa bean/liquor fields from final_evaluations table
-- since it's now used only for chocolate evaluation
-- Run in Supabase SQL editor

-- Remove cocoa bean/liquor specific fields that are not needed for chocolate evaluation
-- Keep defects_total as it's relevant for chocolate evaluation too
ALTER TABLE public.final_evaluations
DROP COLUMN IF EXISTS cacao,
DROP COLUMN IF EXISTS bitterness,
DROP COLUMN IF EXISTS astringency,
DROP COLUMN IF EXISTS caramel_panela,
DROP COLUMN IF EXISTS acidity_total,
DROP COLUMN IF EXISTS fresh_fruit_total,
DROP COLUMN IF EXISTS brown_fruit_total,
DROP COLUMN IF EXISTS vegetal_total,
DROP COLUMN IF EXISTS floral_total,
DROP COLUMN IF EXISTS wood_total,
DROP COLUMN IF EXISTS spice_total,
DROP COLUMN IF EXISTS nut_total,
DROP COLUMN IF EXISTS roast_degree;

-- Update the table comment to reflect its chocolate-only purpose
COMMENT ON TABLE public.final_evaluations IS 'Final evaluations for top 10 samples. Chocolate-specific evaluation with 5 categories: Appearance (5%), Aroma (25%), Texture (20%), Flavor (40%), Aftertaste (10%).';