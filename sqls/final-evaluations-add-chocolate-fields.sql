-- Add chocolate-specific evaluation fields to final_evaluations table
-- Run in Supabase SQL editor

-- 1. Appearance (5% weight)
ALTER TABLE public.final_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_appearance_color numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_appearance_gloss numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_appearance_surface_homogeneity numeric(4,2) NULL;

-- 2. Aroma (25% weight)
ALTER TABLE public.final_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_aroma_intensity numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_quality numeric(4,2) NULL,
-- Aroma specific notes (descriptive only)
ADD COLUMN IF NOT EXISTS chocolate_aroma_floral numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_fruity numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_toasted numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_hazelnut numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_earthy numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_spicy numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_milky numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aroma_woody numeric(4,2) NULL;

-- 3. Texture (20% weight)
ALTER TABLE public.final_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_texture_smoothness numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_texture_melting numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_texture_body numeric(4,2) NULL;

-- 4. Flavor (40% weight)
ALTER TABLE public.final_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_flavor_sweetness numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_bitterness numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_acidity numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_intensity numeric(4,2) NULL,
-- Flavor notes (descriptive only)
ADD COLUMN IF NOT EXISTS chocolate_flavor_citrus numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_red_fruits numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_nuts numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_caramel numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_malt numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_wood numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_flavor_spices numeric(4,2) NULL;

-- 5. Aftertaste (10% weight)
ALTER TABLE public.final_evaluations 
ADD COLUMN IF NOT EXISTS chocolate_aftertaste_persistence numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aftertaste_quality numeric(4,2) NULL,
ADD COLUMN IF NOT EXISTS chocolate_aftertaste_final_balance numeric(4,2) NULL;

-- Add comment to document the chocolate evaluation structure
COMMENT ON TABLE public.final_evaluations IS 'Final evaluations for top 10 samples. Supports both cocoa bean/liquor attributes and chocolate-specific attributes. Chocolate evaluation uses 5 categories: Appearance (5%), Aroma (25%), Texture (20%), Flavor (40%), Aftertaste (10%).';