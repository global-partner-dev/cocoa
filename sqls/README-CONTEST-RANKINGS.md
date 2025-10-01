# Contest-Specific Rankings Migration

## Quick Start

**Run this SQL file to enable contest-specific rankings:**

```sql
-- Execute this file in your Supabase SQL Editor or psql
\i fix-contest-specific-rankings.sql
```

Or copy and paste the contents of `fix-contest-specific-rankings.sql` into your Supabase SQL Editor.

## What This Migration Does

1. **Fixes Table Reference Bug**

   - Changes `public.samples` → `public.sample` (correct table name)
   - Recreates the `top_results` table with correct foreign key

2. **Implements Contest-Specific Rankings**

   - Updates the ranking function to use `PARTITION BY contest_id`
   - Each contest now has independent rankings (1, 2, 3, etc.)
   - Rankings are no longer global across all contests

3. **Automatic Updates**
   - Sets up trigger to automatically recompute rankings when evaluations change
   - Initial population of rankings happens automatically

## Before Running

- **Backup recommended** (though the migration is safe)
- The `top_results` table will be dropped and recreated
- All rankings will be recomputed automatically

## After Running

You can verify the migration worked by running:

```sql
SELECT
  tr.rank,
  tr.contest_id,
  c.name as contest_name,
  s.tracking_code,
  tr.average_score,
  tr.evaluations_count
FROM public.top_results tr
JOIN public.sample s ON s.id = tr.sample_id
LEFT JOIN public.contests c ON c.id = tr.contest_id
ORDER BY tr.contest_id, tr.rank;
```

You should see:

- Rankings reset to 1 for each different contest_id
- Each contest has its own top 10 list
- No errors about missing tables or columns

## Troubleshooting

**Error: relation "public.samples" does not exist**

- This is expected! The migration fixes this by using `public.sample` instead

**Error: table "top_results" already exists**

- The migration handles this with `DROP TABLE IF EXISTS`
- Safe to run even if table exists

**No data in top_results after migration**

- Check if you have approved sensory evaluations: `SELECT COUNT(*) FROM sensory_evaluations WHERE verdict = 'Approved'`
- The function only includes approved evaluations with non-null overall_quality scores

## Related Files

- `top-results-table.sql` - Original file (also updated)
- `fix-contest-specific-rankings.sql` - **Use this one for migration**
- `CONTEST_SPECIFIC_RANKINGS_IMPLEMENTATION.md` - Full documentation

## Support

If you encounter issues:

1. Check that the `sample` table exists (not `samples`)
2. Verify you have the `contests` table
3. Ensure you have sensory evaluations with `verdict = 'Approved'`
4. Check PostgreSQL logs for detailed error messages
