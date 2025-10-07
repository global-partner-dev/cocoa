# Evaluator Chocolate Evaluation - Implementation Summary

## Overview

This document summarizes the changes made to ensure evaluators always use the chocolate evaluation form when assessing samples, regardless of the original sample category (cocoa bean or cocoa liquor). The top 10 samples are made into chocolates for evaluators to assess.

## Changes Made

### 1. Frontend Changes

#### 1.1 EvaluatorDashboard.tsx

**File**: `src/components/dashboard/EvaluatorDashboard.tsx`

**Change 1**: Force chocolate category for evaluation form

- **Line 342**: Changed from `category={selectedSample.category as 'cocoa_bean' | 'cocoa_liquor' | 'chocolate'}` to `category="chocolate"`
- **Reason**: Evaluators always evaluate chocolates, not the original sample form

**Change 2**: Extract and send chocolate-specific data

- **Lines 344-418**: Updated the `onSubmit` handler to extract chocolate evaluation data from the form result
- **Added**: Complete chocolate object with all 5 categories:
  - Appearance (color, gloss, surfaceHomogeneity)
  - Aroma (aromaIntensity, aromaQuality, specificNotes)
  - Texture (smoothness, melting, body)
  - Flavor (sweetness, bitterness, acidity, flavorIntensity, flavorNotes)
  - Aftertaste (persistence, aftertasteQuality, finalBalance)

#### 1.2 FinalEvaluationService.ts

**File**: `src/lib/finalEvaluationService.ts`

**Change 1**: Updated SaveFinalEvaluationPayload type

- **Lines 28-74**: Added optional `chocolate` object to the payload type
- **Structure**: Matches the chocolate evaluation structure from SensoryEvaluationForm

**Change 2**: Updated save method to handle chocolate data

- **Lines 106-136**: Added mapping for all chocolate-specific fields to database columns
- **Format**: Flattened nested structure to match database schema (e.g., `chocolate.appearance.color` → `chocolate_appearance_color`)

#### 1.3 supabase.ts (Database Types)

**File**: `src/lib/supabase.ts`

**Updated**: final_evaluations table type definitions

- **Row type (lines 268-298)**: Added 30 chocolate-specific fields
- **Insert type (lines 326-356)**: Added 30 chocolate-specific fields (all optional)
- **Update type (lines 384-414)**: Added 30 chocolate-specific fields (all optional)

**Fields added**:

- Appearance: color, gloss, surface_homogeneity
- Aroma: intensity, quality, floral, fruity, toasted, hazelnut, earthy, spicy, milky, woody
- Texture: smoothness, melting, body
- Flavor: sweetness, bitterness, acidity, intensity, citrus, red_fruits, nuts, caramel, malt, wood, spices
- Aftertaste: persistence, quality, final_balance

### 2. Database Changes

#### 2.1 SQL Migration Script

**File**: `sqls/final-evaluations-add-chocolate-fields.sql`

**Purpose**: Add chocolate-specific columns to the final_evaluations table

**Columns added** (30 total):

1. **Appearance (3 columns)** - 5% weight

   - chocolate_appearance_color
   - chocolate_appearance_gloss
   - chocolate_appearance_surface_homogeneity

2. **Aroma (10 columns)** - 25% weight

   - chocolate_aroma_intensity
   - chocolate_aroma_quality
   - chocolate_aroma_floral (descriptive)
   - chocolate_aroma_fruity (descriptive)
   - chocolate_aroma_toasted (descriptive)
   - chocolate_aroma_hazelnut (descriptive)
   - chocolate_aroma_earthy (descriptive)
   - chocolate_aroma_spicy (descriptive)
   - chocolate_aroma_milky (descriptive)
   - chocolate_aroma_woody (descriptive)

3. **Texture (3 columns)** - 20% weight

   - chocolate_texture_smoothness
   - chocolate_texture_melting
   - chocolate_texture_body

4. **Flavor (11 columns)** - 40% weight

   - chocolate_flavor_sweetness
   - chocolate_flavor_bitterness
   - chocolate_flavor_acidity
   - chocolate_flavor_intensity
   - chocolate_flavor_citrus (descriptive)
   - chocolate_flavor_red_fruits (descriptive)
   - chocolate_flavor_nuts (descriptive)
   - chocolate_flavor_caramel (descriptive)
   - chocolate_flavor_malt (descriptive)
   - chocolate_flavor_wood (descriptive)
   - chocolate_flavor_spices (descriptive)

5. **Aftertaste (3 columns)** - 10% weight
   - chocolate_aftertaste_persistence
   - chocolate_aftertaste_quality
   - chocolate_aftertaste_final_balance

**Data type**: All columns are `numeric(4,2) NULL` (allows values like 8.75, nullable)

## Chocolate Scoring System

The chocolate evaluation uses a weighted scoring system:

- **Flavor**: 40% (most critical)
- **Aroma**: 25% (second most important)
- **Texture**: 20% (key oral sensory experience)
- **Aftertaste**: 10% (persistence and balance)
- **Appearance**: 5% (visual aspect)

**Overall Score Calculation**:

```
Overall = (Flavor × 0.40) + (Aroma × 0.25) + (Texture × 0.20) + (Aftertaste × 0.10) + (Appearance × 0.05)
```

Each category score is calculated as the average of its attributes:

- Appearance = (Color + Gloss + Surface Homogeneity) ÷ 3
- Aroma = (Aromatic Intensity + Aromatic Quality) ÷ 2
- Texture = (Smoothness + Melting + Body) ÷ 3
- Flavor = (Sweetness + Bitterness + Acidity + Flavor Intensity) ÷ 4
- Aftertaste = (Persistence + Aftertaste Quality + Final Balance) ÷ 3

**Note**: Specific notes (floral, fruity, citrus, etc.) are descriptive only and don't affect the numerical score.

## Implementation Reference

The chocolate scoring logic is implemented in:

- **File**: `src/lib/chocolateScoringUtils.ts`
- **Functions**:
  - `calculateChocolateOverallScore()` - Calculates weighted overall score
  - `getChocolateScoringBreakdown()` - Returns detailed breakdown with weights
  - Individual category calculators (appearance, aroma, texture, flavor, aftertaste)

## Deployment Steps

### 1. Fix Database Trigger (CRITICAL - Run First!)

**IMPORTANT**: There are THREE bugs in the existing `trg_notify_final_evaluation` trigger:

1. References `NEW.sample_code`, which doesn't exist in the `final_evaluations` table
2. Queries `public.samples` (plural), but the table is named `public.sample` (singular)
3. References `s.internal_code`, which doesn't exist in the `sample` table

These must be fixed first or submissions will fail with errors:

- `record "new" has no field "sample_code"`
- `relation "public.samples" does not exist`
- `record "s" has no field "internal_code"`

Execute this fix in Supabase SQL editor:

```bash
# File: sqls/fix-final-evaluations-trigger.sql
```

This updates the trigger to:

1. Query the correct table: `public.sample` (singular)
2. Use `s.tracking_code` from the sample record (the actual unique identifier field)

### 2. Run Database Migration

Execute the SQL migration in Supabase SQL editor:

```bash
# File: sqls/final-evaluations-add-chocolate-fields.sql
```

### 3. Verify Database Schema

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'final_evaluations'
  AND column_name LIKE 'chocolate_%'
ORDER BY column_name;
```

Expected: 30 columns with type `numeric(4,2)`

### 4. Verify Trigger Fix

Verify the trigger was updated correctly:

```sql
-- Check if trigger exists
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'notify_final_evaluation';

-- View the trigger function source
SELECT prosrc
FROM pg_proc
WHERE proname = 'trg_notify_final_evaluation';
```

The function should reference `s.internal_code` (not `NEW.sample_code`).

### 5. Deploy Frontend Changes

The TypeScript changes are already made and will be deployed with the next build:

- EvaluatorDashboard.tsx
- finalEvaluationService.ts
- supabase.ts

### 6. Test the Flow

1. Login as an evaluator
2. Navigate to sample list
3. Click "Evaluate" on a top 10 sample
4. Verify the chocolate evaluation form is displayed (not cocoa bean/liquor form)
5. Fill out the chocolate evaluation with all 5 categories
6. Submit and verify data is saved correctly in the database

## Data Flow

```
User fills chocolate form
    ↓
SensoryEvaluationForm returns result with scores.chocolate object
    ↓
EvaluatorDashboard extracts chocolate data
    ↓
FinalEvaluationService.save() receives chocolate object
    ↓
Service flattens chocolate object to database columns
    ↓
Data saved to final_evaluations table with chocolate_* columns
```

## Backward Compatibility

- **Existing evaluations**: The new chocolate columns are nullable, so existing records remain valid
- **Cocoa bean/liquor fields**: Still present and functional for backward compatibility
- **Mixed data**: The table can store both cocoa bean/liquor evaluations and chocolate evaluations

## Notes

- The `overall_quality` field is still the primary score used for ranking
- For chocolate evaluations, this should be calculated using the weighted formula
- The SensoryEvaluationForm component already handles this calculation automatically
- All chocolate fields are optional (nullable) to maintain flexibility
