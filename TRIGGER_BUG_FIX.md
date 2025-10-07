# Critical Bug Fix: Final Evaluations Trigger Error

## Problem

When evaluators submit chocolate evaluations, the system fails with errors:

```
Error: record "new" has no field "sample_code"
Error: relation "public.samples" does not exist
Error: record "s" has no field "internal_code"
```

## Root Cause

The database trigger `trg_notify_final_evaluation` on the `final_evaluations` table has THREE bugs:

1. **Bug #1**: Tries to access `NEW.sample_code`, but the `final_evaluations` table **does not have a `sample_code` column**
2. **Bug #2**: References `public.samples` (plural), but the actual table name is `public.sample` (singular)
3. **Bug #3**: Tries to access `s.internal_code`, but the `sample` table **does not have an `internal_code` column**

### Trigger Location

The problematic trigger was created in:

- `sqls/fix-samples-table-references.sql` (lines 90-131)

### What the Trigger Does

When a new final evaluation is inserted, the trigger:

1. Fetches the sample information from the `sample` table (singular, not plural!)
2. Fetches the evaluator information from the `profiles` table
3. Sends notifications to admins, directors, and the sample owner

### The Bugs

**Bug #1**: The trigger code incorrectly references:

```sql
'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.'
```

But `NEW` refers to the `final_evaluations` record, which doesn't have a `sample_code` field.

**Bug #2**: The trigger queries the wrong table name:

```sql
SELECT * INTO s FROM public.samples WHERE id = NEW.sample_id;
```

But the table is named `sample` (singular), not `samples` (plural).

**Bug #3**: After fixing bugs #1 and #2, the trigger tries to use:

```sql
'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(s.internal_code,'')||'.'
```

But the `sample` table doesn't have an `internal_code` column. The actual unique identifier field is `tracking_code`.

## Solution

The trigger has THREE bugs that need fixing:

1. **Bug #1**: References `NEW.sample_code` - doesn't exist in `final_evaluations` table
2. **Bug #2**: Queries `public.samples` (plural) - table is named `public.sample` (singular)
3. **Bug #3**: References `s.internal_code` - doesn't exist in `sample` table

The trigger should:

1. Query `public.sample` (singular) instead of `public.samples` (plural)
2. Use `s.tracking_code` instead of `NEW.sample_code` or `s.internal_code`

**Corrected code**:

```sql
SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
...
'Evaluator '||COALESCE(e.name, e.email)||' evaluated sample '||COALESCE(s.tracking_code, '')||'.'
```

## Fix Implementation

### File Created

**`sqls/fix-final-evaluations-trigger.sql`**

This file contains the corrected trigger function that:

1. Queries the correct table name: `public.sample` (singular, not plural)
2. Uses `s.tracking_code` from the sample record (the actual unique identifier field)
3. Properly references all fields from the correct tables
4. Maintains all the original notification functionality

### How to Apply

Run the SQL script in Supabase SQL editor:

```sql
-- File: sqls/fix-final-evaluations-trigger.sql
```

This will:

1. Replace the `trg_notify_final_evaluation()` function with the corrected version
2. Drop and recreate the trigger on the `final_evaluations` table

## Verification

After applying the fix, verify it worked:

```sql
-- Check trigger exists
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'notify_final_evaluation';

-- View the function source (should show s.internal_code, not NEW.sample_code)
SELECT prosrc
FROM pg_proc
WHERE proname = 'trg_notify_final_evaluation';
```

## Impact

### Before Fix

- ❌ Evaluators cannot submit final evaluations
- ❌ System shows error: `record "new" has no field "sample_code"`
- ❌ No notifications are sent

### After Fix

- ✅ Evaluators can successfully submit final evaluations
- ✅ Notifications are sent to admins, directors, and sample owners
- ✅ Sample internal code is correctly displayed in notifications

## Related Files

- **Trigger Fix**: `sqls/fix-final-evaluations-trigger.sql` (NEW)
- **Original Buggy Trigger**: `sqls/fix-samples-table-references.sql` (lines 90-131)
- **Table Schema**: `sqls/final-evaluations-table.sql`
- **Chocolate Fields Migration**: `sqls/final-evaluations-add-chocolate-fields.sql`

## Deployment Order

**CRITICAL**: This fix must be applied BEFORE evaluators can submit evaluations:

1. ✅ **First**: Run `sqls/fix-final-evaluations-trigger.sql` (fixes the trigger bug)
2. ✅ **Second**: Run `sqls/final-evaluations-add-chocolate-fields.sql` (adds chocolate columns)
3. ✅ **Third**: Deploy frontend changes (already in code)
4. ✅ **Fourth**: Test evaluation submission

## Testing

After applying the fix:

1. Login as an evaluator
2. Select a sample to evaluate
3. Fill out the chocolate evaluation form
4. Submit the evaluation
5. Verify:
   - ✅ No error appears
   - ✅ Success message is shown
   - ✅ Data is saved in `final_evaluations` table
   - ✅ Notifications are sent to admins/directors
   - ✅ Notification message includes the sample's internal code

## Technical Details

### Table Structure

**`final_evaluations` table** (relevant columns):

- `id` (uuid)
- `contest_id` (uuid)
- `sample_id` (uuid) ← References `samples.id`
- `evaluator_id` (uuid)
- `overall_quality` (numeric)
- ❌ **NO `sample_code` column**

**`sample` table** (singular, relevant columns):

- `id` (uuid)
- `internal_code` (text) ← This is what we need!
- `contest_id` (uuid)
- `user_id` (uuid)

### Trigger Flow

```
INSERT INTO final_evaluations
  ↓
trg_notify_final_evaluation() fires
  ↓
Fetch sample: SELECT * FROM sample WHERE id = NEW.sample_id (singular!)
  ↓
Fetch evaluator: SELECT * FROM profiles WHERE id = NEW.evaluator_id
  ↓
Send notifications using s.internal_code (NOT NEW.sample_code)
```

## Lessons Learned

1. **Always verify column existence** before referencing in triggers
2. **Use explicit table aliases** to avoid confusion (e.g., `s.internal_code` vs `NEW.sample_code`)
3. **Test triggers** with actual data inserts, not just syntax validation
4. **Document trigger dependencies** on table schemas

## Status

- ✅ Bug identified
- ✅ Fix created: `sqls/fix-final-evaluations-trigger.sql`
- ✅ Documentation updated: `EVALUATOR_CHOCOLATE_EVALUATION_CHANGES.md`
- ⏳ **Pending**: Apply fix in Supabase
- ⏳ **Pending**: Test evaluation submission
