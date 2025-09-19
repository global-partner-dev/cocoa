-- Lock down notification functions and add index + batch helper
-- Run after notifications.sql

-- 1) Revoke broad execute permissions on helper functions
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text,text,uuid,uuid,uuid,boolean,timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.broadcast_to_role(text,text,text,text,text,text,uuid,uuid,uuid,boolean,timestamptz) FROM anon, authenticated;

-- 2) Secure wrapper for privileged creation (optional RPC)
CREATE OR REPLACE FUNCTION public.notify_user_secure(
  p_user_id uuid,
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_details text default null,
  p_sample_id uuid default null,
  p_contest_id uuid default null,
  p_related_user_id uuid default null,
  p_action_required boolean default false,
  p_expires_at timestamptz default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','director')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  PERFORM public.notify_user(
    p_user_id, p_type, p_priority, p_title, p_message, p_details,
    p_sample_id, p_contest_id, p_related_user_id, p_action_required, p_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user_secure(uuid,text,text,text,text,text,uuid,uuid,uuid,boolean,timestamptz) TO authenticated;

-- 3) Unread partial index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_user_id)
  WHERE read = false AND is_deleted = false;

-- 4) Optional: server-side batch mark read for current user (RPC)
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.notifications
    SET read = true
  WHERE recipient_user_id = auth.uid() AND read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;