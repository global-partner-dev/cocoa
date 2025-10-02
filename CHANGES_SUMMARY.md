# Summary of Changes: Add New Defect Attributes

## Overview

Added two new defect attributes to the sensory evaluation system:

1. **Excessive Astringency** (0-10 scale)
2. **Unbalanced Bitterness** (0-10 scale)

These defects are included in the defects total calculation (sum of all defects, capped at 10).

## Files Modified

### 1. Frontend Component

**File:** `src/components/dashboard/SensoryEvaluationForm.tsx`

**Changes:**

- Updated `SensoryScores` interface to include new defect fields in the `defects` object:
  - `excessiveAstringency: number`
  - `unbalancedBitterness: number`
- Updated `defaultScores` to initialize new defects to 0
- Updated `recalcTotals` function to include new defects in the defects sum calculation
- Added tooltip mappings for the new defects in `getSubAttributeTooltips`
- Added two new `DefectRow` components in the UI to display the new defect sliders

### 2. Service Layer

**File:** `src/lib/sensoryEvaluationService.ts`

**Changes:**

- Updated `SensoryEvaluationData` interface to include new defect fields
- Updated `saveSensoryEvaluation` function to save new defect values to database:
  - `defects_excessive_astringency`
  - `defects_unbalanced_bitterness`
- Updated `transformDatabaseToEvaluation` function to load new defect values from database

### 3. English Translations

**File:** `src/locales/en.json`

**Changes:**

- Added tooltip description for `excessiveAstringency`:
  > "Unwanted Astringency: Evaluate whether the astringency interferes with flavor appreciation, lingers uncomfortably, or dominates the sensory profile. Do not confuse it with mild or structural astringency, which may be acceptable."
- Added tooltip description for `unbalancedBitterness`:
  > "Unwanted Bitterness: Determine whether the bitterness is aggressive, sharp, or unpleasant, and whether it negatively impacts the overall product experience. Do not penalize if the bitterness is integrated and adds complexity."
- Added defect labels:
  - `excessiveAstringency`: "Excessive Astringency"
  - `unbalancedBitterness`: "Unbalanced Bitterness"

### 4. Spanish Translations

**File:** `src/locales/es.json`

**Changes:**

- Added tooltip description for `excessiveAstringency`:
  > "Astringencia No Deseada: Evalúe si la astringencia interfiere con la apreciación del sabor, persiste incómodamente o domina el perfil sensorial. No la confunda con astringencia leve o estructural, que puede ser aceptable."
- Added tooltip description for `unbalancedBitterness`:
  > "Amargor No Deseado: Determine si el amargor es agresivo, punzante o desagradable, y si impacta negativamente la experiencia general del producto. No penalice si el amargor está integrado y añade complejidad."
- Added defect labels:
  - `excessiveAstringency`: "Astringencia Excesiva"
  - `unbalancedBitterness`: "Amargor Desequilibrado"

### 5. Database Migration

**File:** `sqls/add-new-defects-columns.sql` (NEW FILE)

**Changes:**

- Created migration script to add two new columns to `sensory_evaluations` table:
  - `defects_excessive_astringency DECIMAL(3,1) NOT NULL DEFAULT 0`
  - `defects_unbalanced_bitterness DECIMAL(3,1) NOT NULL DEFAULT 0`
- Added CHECK constraints to ensure values are within 0-10 range
- Added column comments with full descriptions

## Database Migration Instructions

To apply the database changes, run the following SQL script in your Supabase SQL editor:

```bash
# Execute the migration file
sqls/add-new-defects-columns.sql
```

Or manually execute:

```sql
ALTER TABLE public.sensory_evaluations
ADD COLUMN IF NOT EXISTS defects_excessive_astringency DECIMAL(3,1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS defects_unbalanced_bitterness DECIMAL(3,1) NOT NULL DEFAULT 0;

ALTER TABLE public.sensory_evaluations
ADD CONSTRAINT IF NOT EXISTS check_defects_excessive_astringency
    CHECK (defects_excessive_astringency >= 0 AND defects_excessive_astringency <= 10);

ALTER TABLE public.sensory_evaluations
ADD CONSTRAINT IF NOT EXISTS check_defects_unbalanced_bitterness
    CHECK (defects_unbalanced_bitterness >= 0 AND defects_unbalanced_bitterness <= 10);
```

## Testing Checklist

- [ ] Verify new defect sliders appear in the UI
- [ ] Test that defect values can be adjusted (0-10 with 0.5 increments)
- [ ] Verify tooltips display correctly for both defects
- [ ] Confirm defects total calculation includes new defects
- [ ] Test that defects ≥7 trigger automatic disqualification
- [ ] Verify data saves correctly to database
- [ ] Test loading existing evaluations (backward compatibility)
- [ ] Verify translations work in both English and Spanish
- [ ] Test that new defects contribute to scoring penalties correctly

## Backward Compatibility

The implementation is fully backward compatible:

- Existing evaluations without these fields will default to 0
- The database migration uses `DEFAULT 0` for existing rows
- The TypeScript interfaces handle missing fields gracefully with `|| 0` fallbacks

## Technical Notes

### Defects Calculation

The defects total is calculated as a **sum** (not average) of all individual defect scores, capped at 10:

```typescript
const defectsSum =
  s.defects.dirty +
  s.defects.animal +
  s.defects.rotten +
  s.defects.smoke +
  s.defects.humid +
  s.defects.moldy +
  s.defects.overfermented +
  s.defects.other +
  s.defects.excessiveAstringency +
  s.defects.unbalancedBitterness;
```

### Scoring Impact

- **Defects ≥ 7**: Automatic disqualification (score = 0)
- **Defects 3-6**: Proportional penalty applied
- **Defects < 3**: No penalty

### Database Field Naming

- Frontend uses camelCase: `excessiveAstringency`, `unbalancedBitterness`
- Database uses snake_case: `defects_excessive_astringency`, `defects_unbalanced_bitterness`
- Service layer handles the transformation between naming conventions

## Date Completed

2024-01-XX (Update with actual date)

## Author

AI Assistant (Zencoder)
