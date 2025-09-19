import { supabase } from "@/lib/supabase";
import type { DbNotificationRow, NotificationPriority, NotificationType } from "@/types/notifications";

export interface NotificationQuery {
  type?: NotificationType | "all";
  priority?: NotificationPriority | "all";
  unreadOnly?: boolean;
  limit?: number;
}

export async function fetchNotifications(params: NotificationQuery = {}): Promise<DbNotificationRow[]> {
  const { type = "all", priority = "all", unreadOnly = false, limit = 100 } = params;
  let q = supabase
    .from("notifications")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type !== "all") q = q.eq("type", type);
  if (priority !== "all") q = q.eq("priority", priority);
  if (unreadOnly) q = q.eq("read", false);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAsUnread(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: false })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNotification(id: string) {
  // Use secure server-side RPC to avoid RLS edge cases and noisy 403 logs
  const { data, error } = await supabase.rpc('delete_notification', { p_id: id });
  if (error) throw error;
  if (!data) throw new Error('Delete failed (not owner or not found)');
}

export function notificationPrettyType(type: NotificationType) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}