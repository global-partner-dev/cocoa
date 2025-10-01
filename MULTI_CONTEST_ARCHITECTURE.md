# Multi-Contest Architecture Implementation

## Overview

This document describes the multi-contest architecture implementation for the Cocoa Bloom Judging System. The system now supports multiple simultaneous contests with proper isolation and director-specific management.

## Key Features

### 1. Multiple Simultaneous Contests

- The platform supports multiple contests running at the same time
- Each contest maintains independent data (samples, evaluations, rankings)
- No interference between contests

### 2. Director-Specific Contest Management

- **Directors can create contests**: Each director can create their own contests
- **One active contest per director**: Directors can only have one active contest at a time
- **Directors only see their own contests**: Directors can only view and manage contests they created
- **Admins see all contests**: Administrators have full visibility and control over all contests

### 3. Contest Lifecycle Management

- **Active contest validation**: System prevents directors from creating multiple active contests
- **Automatic expiration**: Contests expire when their end_date passes
- **Data cleanup**: Expired contest data (samples, rankings) can be cleaned up

### 4. Per-Contest Rankings

- Rankings are generated independently for each contest
- Top 10 results are maintained per contest
- Preliminary and final results dashboards show rankings by contest

### 5. Filtered Notifications

- Directors only receive notifications for their own contests
- Admins receive notifications for all contests
- Participants receive notifications for their samples

## Database Changes

### New Functions

#### `director_has_active_contest(director_id UUID)`

Checks if a director has any active contests (where current date is between start_date and end_date).

```sql
SELECT public.director_has_active_contest('director-uuid-here');
```

#### `check_director_active_contest()`

Trigger function that prevents directors from creating multiple active contests. Automatically called on INSERT to contests table.

#### `cleanup_expired_contests()`

Deletes expired contests and their associated data (samples, rankings). Should be called periodically by admins.

```sql
SELECT public.cleanup_expired_contests();
```

#### `get_director_contests(director_id UUID)`

Returns all contests created by a specific director with active status.

```sql
SELECT * FROM public.get_director_contests('director-uuid-here');
```

### Updated RLS Policies

#### Contests Table

- **SELECT**: Admins see all contests, directors only see their own
- **UPDATE**: Admins update all contests, directors only update their own
- **DELETE**: Admins delete all contests, directors only delete their own

### Updated Triggers

#### Sample Notifications

- `trg_notify_sample_added`: Now notifies only the contest's director (not all directors)

#### Evaluation Notifications

- `trg_notify_sensory_evaluation`: Notifies only the contest's director
- `trg_notify_final_evaluation`: Notifies only the contest's director

### Updated Ranking System

The `recompute_top_results()` function now computes rankings per contest using `PARTITION BY contest_id`, ensuring each contest has its own independent top 10 rankings.

## Application Changes

### ContestsService Updates

#### New Methods

**`getDirectorContests()`**
Returns contests for the current user:

- Admins: Returns all contests
- Directors: Returns only their contests

```typescript
const contests = await ContestsService.getDirectorContests();
```

**`directorHasActiveContest()`**
Checks if the current director has an active contest.

```typescript
const hasActive = await ContestsService.directorHasActiveContest();
```

**`cleanupExpiredContests()`**
Cleans up expired contests (admin only).

```typescript
await ContestsService.cleanupExpiredContests();
```

#### Updated Methods

**`createContest()`**
Now validates that directors don't have an active contest before creating a new one. Throws an error if validation fails.

### Component Updates

#### ContestManagement Component

- Now uses `getDirectorContests()` instead of `getAllContests()`
- Automatically filters contests based on user role
- Shows appropriate error messages when directors try to create multiple active contests

## Usage Examples

### For Directors

#### Creating a Contest

```typescript
try {
  const contest = await ContestsService.createContest({
    name: "Summer Cocoa Competition 2024",
    description: "Annual summer competition",
    location: "New York, USA",
    startDate: "2024-07-01",
    endDate: "2024-07-15",
    samplePrice: 150,
    evaluationPrice: 50,
    finalEvaluation: false,
  });
} catch (error) {
  // Error: "You already have an active contest..."
}
```

#### Viewing Your Contests

```typescript
const myContests = await ContestsService.getDirectorContests();
// Returns only contests created by this director
```

### For Admins

#### Viewing All Contests

```typescript
const allContests = await ContestsService.getDirectorContests();
// Returns all contests (admin privilege)
```

#### Cleaning Up Expired Contests

```typescript
await ContestsService.cleanupExpiredContests();
// Deletes all expired contests and their data
```

## Migration Instructions

### 1. Apply Database Migration

Run the SQL migration file:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f sqls/multi-contest-director-restrictions.sql
```

Or apply via Supabase Dashboard:

1. Go to SQL Editor
2. Copy contents of `sqls/multi-contest-director-restrictions.sql`
3. Execute the script

### 2. Update Application Code

The application code has been updated in:

- `src/lib/contestsService.ts` - New methods and validation
- `src/components/dashboard/ContestManagement.tsx` - Uses director-specific methods

### 3. Test the Changes

1. **Test as Director**:

   - Create a contest with future dates
   - Try to create another contest (should fail)
   - Verify you only see your contests

2. **Test as Admin**:

   - Verify you can see all contests
   - Create multiple contests
   - Test cleanup function

3. **Test Notifications**:
   - Submit a sample to a contest
   - Verify only the contest's director receives notification

## Scheduled Cleanup (Optional)

To automatically clean up expired contests, you can:

### Option 1: Use pg_cron (if available)

```sql
-- Run cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-expired-contests',
  '0 2 * * *',
  'SELECT public.cleanup_expired_contests()'
);
```

### Option 2: Application-Level Cron Job

Create a scheduled task in your application to call:

```typescript
// Run daily
await ContestsService.cleanupExpiredContests();
```

### Option 3: Manual Cleanup

Admins can manually trigger cleanup from the admin dashboard or via SQL:

```sql
SELECT public.cleanup_expired_contests();
```

## Security Considerations

1. **Row Level Security (RLS)**: All contest access is controlled via RLS policies
2. **Function Security**: All functions use `SECURITY DEFINER` to ensure proper permissions
3. **Validation**: Multiple layers of validation prevent unauthorized actions
4. **Audit Trail**: Contest creation tracks `created_by` for accountability

## Troubleshooting

### Director Can't Create Contest

**Error**: "You already have an active contest..."

**Solution**:

- Check if you have an active contest: `SELECT * FROM public.get_director_contests(auth.uid())`
- Wait for current contest to expire, or contact admin to modify dates

### Director Sees Other Directors' Contests

**Issue**: RLS policies may not be applied correctly

**Solution**:

- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'contests'`
- Re-apply RLS policies from migration file

### Notifications Going to All Directors

**Issue**: Old trigger functions may still be active

**Solution**:

- Re-run the notification trigger updates from migration file
- Verify triggers: `SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%'`

## Future Enhancements

Potential improvements to consider:

1. **Contest Templates**: Allow directors to create contests from templates
2. **Contest Cloning**: Clone previous contests with updated dates
3. **Multi-Director Contests**: Allow multiple directors to collaborate on a contest
4. **Contest Categories**: Organize contests by type/category
5. **Automated Archiving**: Archive old contests instead of deleting them

## Support

For questions or issues related to the multi-contest architecture:

1. Check this documentation
2. Review the migration SQL file for implementation details
3. Check application logs for error messages
4. Contact system administrator

---

**Last Updated**: 2024
**Version**: 1.0
