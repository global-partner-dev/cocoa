import { useAuth } from "@/hooks/useAuth";
import Notifications from "./Notifications";

const SmartNotifications = () => {
  const { user } = useAuth();
  if (!user) return null;
  // Unified, role-aware notifications fetched from Supabase (RLS ensures scope)
  return <Notifications />;
};

export default SmartNotifications;