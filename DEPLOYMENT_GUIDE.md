# Deployment Guide: Re-evaluation Feature

## Prerequisites

- Access to Supabase SQL Editor
- Admin access to the database
- The application code has been updated and built successfully

## Deployment Steps

### Step 1: Apply Database Migration

**IMPORTANT**: This step must be completed before deploying the application code.

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL command:

```sql
ALTER TABLE public.final_evaluations
ADD CONSTRAINT final_evaluations_sample_evaluator_unique
UNIQUE (sample_id, evaluator_id);
```

4. Verify the constraint was added successfully:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'final_evaluations'
AND constraint_name = 'final_evaluations_sample_evaluator_unique';
```

Expected result: One row showing the unique constraint.

### Step 2: Deploy Application Code

After the database migration is complete:

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

### Step 3: Verify Deployment

#### Test Case 1: New Evaluation

1. Log in as an evaluator
2. Navigate to the Evaluator Dashboard
3. Find a sample you haven't evaluated yet
4. Click "Evaluate" button
5. Fill out the evaluation form
6. Submit the evaluation
7. **Expected**: Evaluation is saved successfully

#### Test Case 2: Re-evaluation

1. From the dashboard, find the sample you just evaluated
2. Notice the button now says "Re-evaluate"
3. Click "Re-evaluate" button
4. **Expected**: Form is pre-filled with your previous evaluation data
5. Modify some values
6. Submit the evaluation
7. **Expected**: Evaluation is updated (not duplicated)

#### Test Case 3: Verify No Duplicates

Run this SQL query to check for duplicates:

```sql
SELECT sample_id, evaluator_id, COUNT(*) as count
FROM public.final_evaluations
GROUP BY sample_id, evaluator_id
HAVING COUNT(*) > 1;
```

**Expected**: No rows returned (no duplicates exist)

### Step 4: Monitor for Issues

Check for common issues:

1. **Constraint violation errors**: If you see errors about duplicate keys, ensure the migration was applied correctly
2. **Form not pre-filling**: Check browser console for errors in data mapping
3. **Button text not changing**: Verify translations are loaded correctly

## Rollback Plan

If issues occur, you can rollback:

### Rollback Database Changes

```sql
ALTER TABLE public.final_evaluations
DROP CONSTRAINT IF EXISTS final_evaluations_sample_evaluator_unique;
```

### Rollback Application Code

1. Revert to the previous version of the application
2. Redeploy

## Post-Deployment

### Clean Up Existing Duplicates (if any)

If there are existing duplicate evaluations in the database, run this cleanup script:

```sql
-- Keep only the most recent evaluation for each sample-evaluator pair
WITH ranked_evals AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY sample_id, evaluator_id
      ORDER BY evaluation_date DESC, created_at DESC
    ) as rn
  FROM public.final_evaluations
)
DELETE FROM public.final_evaluations
WHERE id IN (
  SELECT id FROM ranked_evals WHERE rn > 1
);
```

**WARNING**: This will permanently delete duplicate evaluations. Make a backup first!

## Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify the unique constraint exists in the database
4. Ensure all code changes were deployed correctly

## Success Criteria

The deployment is successful when:

- ✅ Database constraint is in place
- ✅ New evaluations can be created
- ✅ Existing evaluations can be updated
- ✅ No duplicate evaluations are created
- ✅ Form pre-fills correctly when re-evaluating
- ✅ Button text changes appropriately
- ✅ Both English and Spanish translations work
