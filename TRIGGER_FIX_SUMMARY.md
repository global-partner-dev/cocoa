# 🔥 CRITICAL: Three Trigger Bugs Found and Fixed

## 🚨 The Problem

Evaluators cannot submit chocolate evaluations. The system fails with **THREE sequential errors**:

### Error #1 (First Bug)

```
Error: record "new" has no field "sample_code"
```

### Error #2 (Second Bug - appeared after fixing #1)

```
Error: relation "public.samples" does not exist
```

### Error #3 (Third Bug - appeared after fixing #2)

```
Error: record "s" has no field "internal_code"
```

---

## 🐛 The Three Bugs

The database trigger `trg_notify_final_evaluation` has **THREE critical bugs**:

| Bug # | Problem                           | Why It Fails                                                      |
| ----- | --------------------------------- | ----------------------------------------------------------------- |
| **1** | References `NEW.sample_code`      | The `final_evaluations` table doesn't have a `sample_code` column |
| **2** | Queries `public.samples` (plural) | The actual table name is `public.sample` (singular)               |
| **3** | References `s.internal_code`      | The `sample` table doesn't have an `internal_code` column         |

---

## ✅ The Solution

All three bugs are fixed in one file: **`sqls/fix-final-evaluations-trigger.sql`**

### What Changed:

1. ✅ **Table name**: `public.samples` → `public.sample` (singular)
2. ✅ **Field reference**: `s.internal_code` → `s.tracking_code` (actual field)
3. ✅ **Removed**: All references to non-existent `NEW.sample_code`

### The Correct Field

The `sample` table structure:

```sql
CREATE TABLE public.sample (
    id UUID PRIMARY KEY,
    tracking_code TEXT UNIQUE NOT NULL,  -- ✅ This is the correct field!
    contest_id UUID,
    user_id UUID,
    status TEXT,
    ...
)
```

**Note**: There is NO `internal_code` column. The unique identifier is `tracking_code`.

---

## 🚀 How to Fix (Run This Now!)

### Step 1: Run the Trigger Fix

Open Supabase SQL Editor and run:

```sql
-- File: sqls/fix-final-evaluations-trigger.sql
```

This will:

- Drop and recreate the `trg_notify_final_evaluation` function
- Fix all three bugs
- Reattach the trigger to the `final_evaluations` table

### Step 2: Verify the Fix

Run this query to check the trigger is correct:

```sql
-- Check trigger exists
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'notify_final_evaluation';

-- View the function source
SELECT prosrc FROM pg_proc WHERE proname = 'trg_notify_final_evaluation';
```

You should see:

- ✅ `public.sample` (not `samples`)
- ✅ `s.tracking_code` (not `s.internal_code` or `NEW.sample_code`)

### Step 3: Test Evaluation Submission

Try submitting a chocolate evaluation again. It should now work! 🎉

---

## 📋 Complete Deployment Order

1. ✅ **FIRST**: Run `sqls/fix-final-evaluations-trigger.sql` (fixes all 3 bugs)
2. ⏭️ **SECOND**: Run `sqls/final-evaluations-add-chocolate-fields.sql` (adds chocolate columns)
3. ⏭️ **THIRD**: Deploy frontend changes (already in code)
4. ⏭️ **FOURTH**: Test end-to-end evaluation submission

---

## 📝 Technical Details

### Original Buggy Code

```sql
-- Bug #2: Wrong table name
SELECT * INTO s FROM public.samples WHERE id = NEW.sample_id;

-- Bug #1 & #3: Wrong field references
'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.'
-- or
'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(s.internal_code,'')||'.'
```

### Fixed Code

```sql
-- ✅ Correct table name
SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;

-- ✅ Correct field reference
'Evaluator '||COALESCE(e.name, e.email)||' evaluated sample '||COALESCE(s.tracking_code, '')||'.'
```

---

## 🎯 Why This Happened

The trigger was written assuming:

1. The table was named `samples` (plural) - but it's `sample` (singular)
2. The sample had an `internal_code` field - but it has `tracking_code`
3. The evaluation record had a `sample_code` field - but it doesn't

These assumptions were incorrect, causing the trigger to fail at runtime.

---

## ✨ After the Fix

Once you run the fix:

- ✅ Evaluators can submit chocolate evaluations
- ✅ Notifications will be sent to admins, directors, and sample owners
- ✅ The sample tracking code will appear correctly in notifications
- ✅ No more trigger errors!

---

## 📚 Related Documentation

- **Full technical details**: `TRIGGER_BUG_FIX.md`
- **Deployment guide**: `EVALUATOR_CHOCOLATE_EVALUATION_CHANGES.md`
- **SQL fix file**: `sqls/fix-final-evaluations-trigger.sql`

---

**Status**: 🔴 **CRITICAL - Must fix before evaluators can submit evaluations**

**Action Required**: Run `sqls/fix-final-evaluations-trigger.sql` in Supabase SQL Editor NOW!
