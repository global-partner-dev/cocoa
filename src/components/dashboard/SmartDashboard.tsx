import { useAuth } from "@/hooks/useAuth";
import DashboardHome from "./DashboardHome";
import JudgeDashboard from "./JudgeDashboard";
import ParticipantDashboard from "./ParticipantDashboard";
import EvaluatorDashboard from "./EvaluatorDashboard";

const SmartDashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Show appropriate dashboard based on user role
  switch (user.role) {
    case 'judge':
      return <JudgeDashboard />;
    case 'evaluator':
      return <EvaluatorDashboard />;
    case 'participant':
      return <ParticipantDashboard />;
    case 'admin':
    case 'director':
      // For admin/director, show the general dashboard home
      return <DashboardHome />;
    default:
      return <DashboardHome />;
  }
};

export default SmartDashboard;