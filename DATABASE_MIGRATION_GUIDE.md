# Database Migration Guide: Add New Defect Columns

## Quick Start

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `sqls/add-new-defects-columns.sql`
5. Click **Run** to execute the migration
6. Verify success message appears

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd e:\Mydev\contest_system\cocoa

# Run the migration
supabase db execute --file sqls/add-new-defects-columns.sql
```

### Option 3: Manual SQL Execution

If you prefer to run the SQL manually, execute the following commands in your database:

```sql
-- Add new defect columns
ALTER TABLE public.sensory_evaluations
ADD COLUMN IF NOT EXISTS defects_excessive_astringency DECIMAL(3,1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS defects_unbalanced_bitterness DECIMAL(3,1) NOT NULL DEFAULT 0;

-- Add constraints (using DO block for idempotent execution)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_defects_excessive_astringency'
    ) THEN
        ALTER TABLE public.sensory_evaluations
        ADD CONSTRAINT check_defects_excessive_astringency
            CHECK (defects_excessive_astringency >= 0 AND defects_excessive_astringency <= 10);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_defects_unbalanced_bitterness'
    ) THEN
        ALTER TABLE public.sensory_evaluations
        ADD CONSTRAINT check_defects_unbalanced_bitterness
            CHECK (defects_unbalanced_bitterness >= 0 AND defects_unbalanced_bitterness <= 10);
    END IF;
END $$;

-- Add documentation comments
COMMENT ON COLUMN public.sensory_evaluations.defects_excessive_astringency IS
'Unwanted Astringency: Evaluate whether the astringency interferes with flavor appreciation, lingers uncomfortably, or dominates the sensory profile. Do not confuse it with mild or structural astringency, which may be acceptable. Scale: 0-10';

COMMENT ON COLUMN public.sensory_evaluations.defects_unbalanced_bitterness IS
'Unwanted Bitterness: Determine whether the bitterness is aggressive, sharp, or unpleasant, and whether it negatively impacts the overall product experience. Do not penalize if the bitterness is integrated and adds complexity. Scale: 0-10';
```

## Verification

After running the migration, verify the changes:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensory_evaluations'
AND column_name IN ('defects_excessive_astringency', 'defects_unbalanced_bitterness');

-- Check constraints
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name IN ('check_defects_excessive_astringency', 'check_defects_unbalanced_bitterness');

-- Verify existing data has default values
SELECT
    COUNT(*) as total_rows,
    AVG(defects_excessive_astringency) as avg_excessive_astringency,
    AVG(defects_unbalanced_bitterness) as avg_unbalanced_bitterness
FROM public.sensory_evaluations;
```

Expected results:

- Both columns should exist with type `numeric(3,1)`
- Default value should be `0`
- All existing rows should have `0` for both new columns
- Constraints should be in place limiting values to 0-10 range

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove constraints
ALTER TABLE public.sensory_evaluations
DROP CONSTRAINT IF EXISTS check_defects_excessive_astringency;

ALTER TABLE public.sensory_evaluations
DROP CONSTRAINT IF EXISTS check_defects_unbalanced_bitterness;

-- Remove columns
ALTER TABLE public.sensory_evaluations
DROP COLUMN IF EXISTS defects_excessive_astringency,
DROP COLUMN IF EXISTS defects_unbalanced_bitterness;
```

⚠️ **Warning:** Rollback will permanently delete any data stored in these columns!

## Troubleshooting

### Error: "column already exists"

This is safe to ignore. The migration uses `IF NOT EXISTS` to prevent errors if the column already exists.

### Error: "permission denied"

Make sure you're logged in with sufficient privileges (admin/owner role) to alter the table schema.

### Error: "constraint already exists"

This is safe to ignore. The migration uses `IF NOT EXISTS` for constraints as well.

## Post-Migration Steps

1. **Test the Application:**

   - Start the development server
   - Navigate to a sensory evaluation form
   - Verify the two new defect sliders appear
   - Test saving an evaluation with values in the new fields
   - Verify the data persists correctly

2. **Update Documentation:**

   - Inform evaluators about the new defect attributes
   - Update any training materials or evaluation guides

3. **Monitor Performance:**
   - Check that queries remain performant
   - Consider adding indexes if needed (though unlikely for these columns)

## Support

If you encounter any issues:

1. Check the Supabase logs for detailed error messages
2. Verify your database connection is active
3. Ensure you have the necessary permissions
4. Review the CHANGES_SUMMARY.md for complete implementation details

## Migration File Location

The migration SQL file is located at:

```
e:\Mydev\contest_system\cocoa\sqls\add-new-defects-columns.sql
```
