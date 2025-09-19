-- Fix/ensure RLS and policies for notifications soft-delete and read-state updates
-- Safe to run multiple times (idempotent where possible)

-- 1) Enable RLS
alter table public.notifications enable row level security;

-- 2) Grants for authenticated clients (RLS still restricts rows)
grant select, update on public.notifications to authenticated;

-- 3) Allow recipients to read their own non-deleted notifications
-- Note: SELECT policy commonly created in notifications.sql, but ensure it exists
DO $$ BEGIN
  CREATE POLICY "recipient can read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid() AND is_deleted = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Allow recipients to update their own notifications (read/unread, soft-delete)
DROP POLICY IF EXISTS "recipient can update own notifications" ON public.notifications;
CREATE POLICY "recipient can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

-- 5) Optional: unread partial index for performance (no-op if already exists)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_user_id)
  WHERE read = false AND is_deleted = false;