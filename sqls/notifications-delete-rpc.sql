-- Secure server-side RPC to soft-delete a notification owned by the current user
-- Use this if client-side UPDATE hits RLS edge cases

create or replace function public.delete_notification(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  update public.notifications
    set is_deleted = true
  where id = p_id and recipient_user_id = auth.uid();

  return found; -- true if a row was updated
end;
$$;

grant execute on function public.delete_notification(uuid) to anon, authenticated;