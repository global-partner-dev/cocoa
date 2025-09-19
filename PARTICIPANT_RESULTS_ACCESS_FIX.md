# Participant Results Access Fix

## Issue Description

Participants in the cocoa judging application can only view results for their own samples, while other roles (admin, director, evaluator) can view all results. This is due to Row Level Security (RLS) policies in Supabase that restrict participants' access.

## Root Cause

The issue is in the database RLS policies, specifically:

1. **Samples table policy**: `"Users can view their own samples"` - restricts participants to only their own samples
2. **Sensory evaluations policy**: `"Staff can view all sensory evaluations"` - excludes participants from viewing all evaluations
3. **Physical evaluations policy**: Similar restriction excluding participants

## Current Behavior

- **Participants**: Can only see their own submitted samples and evaluations
- **Other roles** (admin, director, evaluator): Can see all samples and evaluations

## Expected Behavior

All authenticated users, including participants, should have the same permissions to view published results and rankings.

## Solution

### Option 1: Database Policy Update (Recommended)

Run the SQL script `fix-participant-results-access.sql` in your Supabase SQL Editor:

```sql
-- Update samples policy
DROP POLICY IF EXISTS "Staff can view all samples" ON public.samples;
CREATE POLICY "Staff and participants can view all samples" ON public.samples
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'judge', 'evaluator', 'participant')
        )
    );

-- Update sensory evaluations policy  
DROP POLICY IF EXISTS "Staff can view all sensory evaluations" ON public.sensory_evaluations;
CREATE POLICY "Staff and participants can view all sensory evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'evaluator', 'participant')
        )
    );

-- Update physical evaluations policy
DROP POLICY IF EXISTS "Directors and admins can view all physical evaluations" ON public.physical_evaluations;
CREATE POLICY "Staff and participants can view all physical evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'evaluator', 'participant')
        )
    );
```

### Option 2: Frontend Role-Based Access Control (Alternative)

If you prefer to keep database restrictions and handle this in the frontend, you could:

1. Create separate service methods for participants
2. Use service account or admin credentials for results queries
3. Add role-based filtering in the frontend

However, **Option 1 is recommended** as it's simpler and aligns with the requirement that participants should have the same permissions as other roles.

## Implementation Steps

1. **Backup your database** (recommended before making policy changes)
2. **Run the SQL script** in Supabase SQL Editor
3. **Test the fix** by logging in as a participant and accessing `/dashboard/results`
4. **Verify** that participants can now see all results, not just their own

## Verification

After applying the fix:

1. Login as a participant (test.participant@gmail.com)
2. Navigate to Dashboard → Results
3. Verify that all samples and evaluations are visible
4. Check that the radar charts and statistics show data from all participants

## Security Considerations

This change allows participants to view all results, which is appropriate for a competition where results are meant to be public. The policies still maintain:

- **Write restrictions**: Participants can only modify their own data
- **Authentication requirements**: Only authenticated users can access data
- **Role-based write access**: Only appropriate roles can create/update evaluations

## Files Modified

- `sqls/fix-participant-results-access.sql` - Database policy updates
- `PARTICIPANT_RESULTS_ACCESS_FIX.md` - This documentation

## Testing

Test with different user roles:

- **Participant**: Should see all results ✅
- **Admin**: Should see all results ✅  
- **Director**: Should see all results ✅
- **Judge**: Should see all results ✅
- **Evaluator**: Should see all results ✅
- **Unauthenticated**: Should not access results ✅