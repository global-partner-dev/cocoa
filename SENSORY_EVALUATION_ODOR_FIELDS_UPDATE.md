# Sensory Evaluation Odor Fields Update

## Overview

The sensory evaluation form has been updated with new odor fields (`typicalOdors` and `atypicalOdors`) that need to be stored in the database. This document outlines the changes made to support these new fields.

## Changes Made

### 1. Database Migration

**File**: `sqls/sensory-evaluations-odor-fields.sql`

- Added `typical_odors` JSONB column to store typical odor checkboxes
- Added `atypical_odors` JSONB column to store atypical odor checkboxes
- Created GIN indexes for better JSON query performance
- Added column comments documenting the expected structure

**Expected JSON Structure:**

```json
// typical_odors
{
  "cleanCacao": true,
  "chocolate": false,
  "ripeFruit": true,
  "floral": false,
  "spicy": true,
  "caramelSweet": false,
  "honeyMolasses": true,
  "driedFruits": false,
  "citrus": true,
  "freshHerbal": false,
  "butterySoftDairy": false,
  "lightSmoky": true
}

// atypical_odors
{
  "excessFermentation": false,
  "moldDamp": true,
  "earthClay": false,
  "intenseSmokeOrBurnt": false,
  "rancidOxidized": false,
  "medicinalChemical": false,
  "animalLeather": false,
  "soapDetergent": false,
  "pronouncedTannicNote": false,
  "sulfurousRottenEgg": false,
  "fuelGasolineDiesel": false,
  "industrialSolvents": false
}
```

### 2. Service Layer Updates

**File**: `src/lib/sensoryEvaluationService.ts`

- Updated `SensoryEvaluationData` interface to include `typicalOdors` and `atypicalOdors` fields
- Modified `saveSensoryEvaluation` method to save odor data as JSON
- Updated `transformDatabaseToEvaluation` method to load odor data from database

### 3. Form Integration

The sensory evaluation form (`SensoryEvaluationForm.tsx`) already includes the odor fields in the UI and data structures. With these backend changes, the form will now properly save and load odor data.

## Deployment Steps

1. **Run Database Migration**
   Execute the SQL migration in your Supabase dashboard:

   ```bash
   # Run the contents of sqls/sensory-evaluations-odor-fields.sql
   ```

2. **Deploy Code Changes**
   The service layer changes are already implemented and will work once the database migration is applied.

3. **Test the Integration**
   - Create a new sensory evaluation with odor selections
   - Verify the data is saved to the database
   - Load an existing evaluation and verify odor data is displayed correctly

## Benefits

- **Complete Data Capture**: All form fields are now properly stored in the database
- **Efficient Storage**: JSON columns provide flexible storage for checkbox data
- **Performance**: GIN indexes enable efficient querying of JSON data
- **Backward Compatibility**: Existing evaluations without odor data will continue to work

## Technical Notes

- The odor fields are optional (`?:` in TypeScript interfaces) to maintain backward compatibility
- Default empty objects (`{}`) are used when odor data is not present
- JSON validation is handled at the application level through TypeScript interfaces
- The database columns have NOT NULL constraints with default empty JSON objects

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] New sensory evaluations save odor data correctly
- [ ] Existing evaluations load without errors
- [ ] Odor checkboxes in the form work as expected
- [ ] JSON data structure matches the expected format
- [ ] Performance is acceptable with the new indexes
