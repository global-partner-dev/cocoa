-- Robust RLS fix for notifications (works for both anon and authenticated roles)
-- Safe to run multiple times

-- 1) Ensure RLS is enabled
alter table public.notifications enable row level security;

-- 2) Table privileges for client roles (RLS still enforces row access)
grant select, update on public.notifications to anon;
grant select, update on public.notifications to authenticated;

-- 3) Recreate SELECT policy to allow users to read their own non-deleted rows
DO $$ BEGIN
  DROP POLICY IF EXISTS "recipient can read own notifications" ON public.notifications;
  CREATE POLICY "recipient can read own notifications"
  ON public.notifications
  FOR SELECT
  TO anon, authenticated
  USING (recipient_user_id = auth.uid() AND is_deleted = false);
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 4) Recreate UPDATE policy to allow users to update their own rows
DO $$ BEGIN
  DROP POLICY IF EXISTS "recipient can update own notifications" ON public.notifications;
  CREATE POLICY "recipient can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO anon, authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 5) Helpful index (no-op if exists)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_user_id)
  WHERE read = false AND is_deleted = false;