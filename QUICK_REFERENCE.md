# Multi-Contest Architecture - Quick Reference

## 🚀 Quick Start

### Deploy in 3 Steps

1. **Run the migration**

   ```bash
   # Via Supabase Dashboard SQL Editor
   # Copy and execute: sqls/multi-contest-director-restrictions.sql
   ```

2. **Application is already updated**

   - No code changes needed
   - Services automatically use new logic

3. **Test it**
   - Login as director → Create contest → Try creating another (should fail)
   - Login as admin → See all contests

---

## 📋 What Changed

### For Directors

- ✅ Can create contests
- ✅ Can only have ONE active contest at a time
- ✅ Only see their own contests
- ✅ Only receive notifications for their contests

### For Admins

- ✅ See ALL contests
- ✅ Can create unlimited contests
- ✅ Can cleanup expired contests
- ✅ Receive all notifications

### For Participants

- ✅ Can submit to any active contest
- ✅ See results per contest
- ✅ Receive notifications for their samples

---

## 🔧 Key Functions

### Check if Director Has Active Contest

```sql
SELECT public.director_has_active_contest('director-uuid');
-- Returns: true/false
```

### Get Director's Contests

```sql
SELECT * FROM public.get_director_contests('director-uuid');
-- Returns: All contests created by this director
```

### Cleanup Expired Contests (Admin Only)

```sql
SELECT public.cleanup_expired_contests();
-- Deletes: Expired contests + samples + rankings
```

---

## 💻 Application Usage

### TypeScript/React

```typescript
// Get contests (auto-filtered by role)
const contests = await ContestsService.getDirectorContests();

// Check if director has active contest
const hasActive = await ContestsService.directorHasActiveContest();

// Create contest (validates active limit)
try {
  const contest = await ContestsService.createContest(data);
} catch (error) {
  // "You already have an active contest..."
}

// Cleanup expired (admin only)
await ContestsService.cleanupExpiredContests();
```

---

## 🎯 Business Rules

### Contest Status

- **Active**: `start_date <= TODAY <= end_date`
- **Upcoming**: `start_date > TODAY`
- **Completed**: `end_date < TODAY`

### Director Limits

- **Active Contests**: Maximum 1 per director
- **Total Contests**: Unlimited (but only 1 active)
- **Past Contests**: Can create new after current expires

### Data Lifecycle

1. Contest created → Samples submitted → Evaluations done
2. Contest expires (end_date passes)
3. Admin runs cleanup → Data deleted

---

## 🔒 Security

### RLS Policies

```sql
-- Directors see only their contests
SELECT * FROM contests; -- Auto-filtered by RLS

-- Admins see all contests
SELECT * FROM contests; -- No filtering for admins
```

### Permissions

- **Create Contest**: Admin, Director
- **Update Contest**: Admin (all), Director (own only)
- **Delete Contest**: Admin (all), Director (own only)
- **Cleanup**: Admin only

---

## 🐛 Troubleshooting

### "You already have an active contest"

**Cause**: Director has a contest where `start_date <= today <= end_date`

**Solutions**:

1. Wait for current contest to expire
2. Ask admin to modify contest dates
3. Ask admin to delete current contest

### Director sees other directors' contests

**Cause**: RLS policies not applied

**Fix**:

```sql
-- Re-run RLS policy section from migration
-- Check: SELECT * FROM pg_policies WHERE tablename = 'contests';
```

### Notifications going to all directors

**Cause**: Old trigger functions still active

**Fix**:

```sql
-- Re-run notification trigger section from migration
-- Check: SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%';
```

---

## 📊 Monitoring

### Check Active Contests

```sql
SELECT
  c.name,
  c.start_date,
  c.end_date,
  p.name as director,
  CASE
    WHEN CURRENT_DATE >= c.start_date AND CURRENT_DATE <= c.end_date
    THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as status
FROM contests c
JOIN profiles p ON p.id = c.created_by
WHERE p.role = 'director'
ORDER BY c.start_date DESC;
```

### Check Director Contest Count

```sql
SELECT
  p.name as director,
  COUNT(*) as total_contests,
  COUNT(*) FILTER (
    WHERE CURRENT_DATE >= c.start_date
    AND CURRENT_DATE <= c.end_date
  ) as active_contests
FROM profiles p
LEFT JOIN contests c ON c.created_by = p.id
WHERE p.role = 'director'
GROUP BY p.id, p.name;
```

### Find Expired Contests

```sql
SELECT
  id,
  name,
  end_date,
  CURRENT_DATE - end_date as days_expired
FROM contests
WHERE end_date < CURRENT_DATE
ORDER BY end_date DESC;
```

---

## 🔄 Maintenance

### Manual Cleanup

```sql
-- Preview what will be deleted
SELECT
  c.name,
  c.end_date,
  COUNT(DISTINCT s.id) as sample_count,
  COUNT(DISTINCT tr.sample_id) as ranking_count
FROM contests c
LEFT JOIN sample s ON s.contest_id = c.id
LEFT JOIN top_results tr ON tr.contest_id = c.id
WHERE c.end_date < CURRENT_DATE
GROUP BY c.id, c.name, c.end_date;

-- Execute cleanup
SELECT public.cleanup_expired_contests();
```

### Scheduled Cleanup (Optional)

```sql
-- If pg_cron is available
SELECT cron.schedule(
  'cleanup-expired-contests',
  '0 2 * * *',  -- Daily at 2 AM
  'SELECT public.cleanup_expired_contests()'
);
```

---

## 📈 Rankings

### View Rankings Per Contest

```sql
SELECT
  c.name as contest,
  s.tracking_code,
  tr.average_score,
  tr.rank
FROM top_results tr
JOIN sample s ON s.id = tr.sample_id
JOIN contests c ON c.id = tr.contest_id
ORDER BY c.name, tr.rank;
```

### Recompute Rankings

```sql
-- Manually trigger ranking recomputation
SELECT public.recompute_top_results();
```

---

## 🎨 UI Components

### Add Cleanup Component

```typescript
// In admin dashboard
import ContestCleanup from "@/components/dashboard/ContestCleanup";

{
  userRole === "admin" && <ContestCleanup />;
}
```

### Show Active Contest Warning

```typescript
const hasActive = await ContestsService.directorHasActiveContest();

{
  hasActive && (
    <Alert>
      <AlertDescription>
        You have an active contest. You cannot create another until it expires.
      </AlertDescription>
    </Alert>
  );
}
```

---

## 📝 Testing Checklist

### Director Tests

- [ ] Create first contest → Success
- [ ] Create second active contest → Fail with error
- [ ] View contests → See only own contests
- [ ] Edit own contest → Success
- [ ] Edit other's contest → Fail (not visible)
- [ ] Receive notification for own contest sample → Success

### Admin Tests

- [ ] View all contests → See all directors' contests
- [ ] Create multiple contests → Success
- [ ] Edit any contest → Success
- [ ] Delete any contest → Success
- [ ] Run cleanup → Success
- [ ] Receive all notifications → Success

### Participant Tests

- [ ] View available contests → See all active contests
- [ ] Submit sample → Success
- [ ] View results per contest → Success
- [ ] Receive notifications → Success

---

## 🆘 Emergency Rollback

```sql
-- If something goes wrong, rollback:

-- 1. Drop new functions
DROP FUNCTION IF EXISTS public.director_has_active_contest(UUID);
DROP FUNCTION IF EXISTS public.check_director_active_contest();
DROP FUNCTION IF EXISTS public.cleanup_expired_contests();
DROP FUNCTION IF EXISTS public.get_director_contests(UUID);

-- 2. Drop trigger
DROP TRIGGER IF EXISTS trg_check_director_active_contest ON public.contests;

-- 3. Restore old RLS policies (if you have backup)
-- DROP POLICY ... CREATE POLICY ...

-- 4. Revert application code via git
git checkout HEAD~1 src/lib/contestsService.ts
git checkout HEAD~1 src/components/dashboard/ContestManagement.tsx
```

---

## 📚 Documentation Files

- **MULTI_CONTEST_ARCHITECTURE.md** - Full architecture documentation
- **IMPLEMENTATION_SUMMARY.md** - Implementation details
- **QUICK_REFERENCE.md** - This file (quick reference)

---

## ✅ Deployment Checklist

- [ ] Backup database
- [ ] Run migration SQL
- [ ] Verify functions created
- [ ] Verify RLS policies updated
- [ ] Test as director
- [ ] Test as admin
- [ ] Test notifications
- [ ] Test rankings
- [ ] Document any issues
- [ ] Train users on new limits

---

**Need Help?** Check the full documentation in `MULTI_CONTEST_ARCHITECTURE.md`
