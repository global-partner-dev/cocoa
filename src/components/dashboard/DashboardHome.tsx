import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, FileText, Bell, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notificationsService";
import { useTranslation } from "react-i18next";


const DashboardHome = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [counts, setCounts] = useState({
    users: null as number | null,
    participants: null as number | null,
    judges: null as number | null,
    evaluators: null as number | null,
    activeContests: null as number | null,
    samples: null as number | null,
    samplesApproved: null as number | null,
    samplesEvaluated: null as number | null,
  });

  useEffect(() => {
    const loadCounts = async () => {
      const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const [
        usersRes,
        participantsRes,
        judgesRes,
        evaluatorsRes,
        contestsRes,
        samplesRes,
        approvedRes,
        evaluatedRows,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'participant'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'judge'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'evaluator'),
        supabase
          .from('contests')
          .select('*', { count: 'exact', head: true })
          .lte('start_date', now)
          .gte('end_date', now),
        supabase.from('samples').select('*', { count: 'exact', head: true }),
        // Approved samples materialized in top_results
        supabase.from('top_results').select('*', { count: 'exact', head: true }),
        // Distinct evaluated samples (fetch IDs, then distinct in client). If you want Approved-only, add .eq('verdict','Approved')
        supabase.from('sensory_evaluations').select('sample_id'),
      ]);

      const evaluatedDistinct = new Set((evaluatedRows.data || []).map((r: any) => r.sample_id).filter(Boolean)).size;

      setCounts({
        users: usersRes.count ?? 0,
        participants: participantsRes.count ?? 0,
        judges: judgesRes.count ?? 0,
        evaluators: evaluatorsRes.count ?? 0,
        activeContests: contestsRes.count ?? 0,
        samples: samplesRes.count ?? 0,
        samplesApproved: approvedRes.count ?? 0,
        samplesEvaluated: evaluatedDistinct,
      });
    };

    loadCounts().catch(console.error);
  }, []);

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'admin':
        return t('dashboard.roleMsg.admin');
      case 'director':
        return t('dashboard.roleMsg.director');
      case 'judge':
        return t('dashboard.roleMsg.judge');
      case 'participant':
        return t('dashboard.roleMsg.participant');
      case 'evaluator':
        return t('dashboard.roleMsg.evaluator');
      default:
        return '';
    }
  };

  const stats = [
    { title: t('dashboard.stats.totalUsers'), value: counts.users ?? '—', icon: Users, color: "text-blue-600" },
    { title: t('dashboard.stats.totalParticipants'), value: counts.participants ?? '—', icon: Users, color: "text-blue-600" },
    { title: t('dashboard.stats.totalJudges'), value: counts.judges ?? '—', icon: Users, color: "text-blue-600" },
    { title: t('dashboard.stats.totalEvaluators'), value: counts.evaluators ?? '—', icon: Users, color: "text-blue-600" },
    { title: t('dashboard.stats.activeContests'), value: counts.activeContests ?? '—', icon: Calendar, color: "text-green-600" },
    { title: t('dashboard.stats.samplesSubmitted'), value: counts.samples ?? '—', icon: FileText, color: "text-yellow-600" },
    { title: t('dashboard.stats.samplesApproved'), value: counts.samplesApproved ?? '—', icon: FileText, color: "text-yellow-600" },
    { title: t('dashboard.stats.samplesEvaluated'), value: counts.samplesEvaluated ?? '—', icon: FileText, color: "text-yellow-600" },
  ];

  // Recent notifications (latest 5) from DB
  const { data: recentNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['dashboard-recent-notifications'],
    queryFn: () => fetchNotifications({ limit: 5 }),
    staleTime: 10_000,
  });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[hsl(var(--chocolate-dark))] to-[hsl(var(--chocolate-medium))] rounded-lg p-4 sm:p-6 lg:p-8 text-[hsl(var(--chocolate-cream))]">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{t('dashboard.welcomeBack', { name: user?.name })}</h1>
        <p className="text-[hsl(var(--chocolate-cream)_/_0.9)] text-sm sm:text-base lg:text-lg">
          {getWelcomeMessage()}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('dashboard.notifications.title')}</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('dashboard.notifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {notificationsLoading ? (
              <div className="py-2 text-xs sm:text-sm text-muted-foreground">{t('dashboard.notifications.loading')}</div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-2 text-xs sm:text-sm text-muted-foreground">{t('dashboard.notifications.empty')}</div>
            ) : (
              recentNotifications.map((n: any) => (
                <div key={n.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    n.priority === 'urgent' ? 'bg-red-500' :
                    n.priority === 'high' ? 'bg-orange-500' :
                    n.priority === 'medium' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('dashboard.quickActions.title')}</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('dashboard.quickActions.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {user?.role === 'admin' && (
              <>
                <Link to="/dashboard/users">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.admin.manageUsers')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.admin.manageUsersDesc')}</p>
                  </div>
                </Link>
                <Link to="/dashboard/contests">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.admin.createContest')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.admin.createContestDesc')}</p>
                  </div>
                </Link>
              </>
            )}
            {user?.role === 'director' && (
              <>
                <Link to="/dashboard/samples">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.director.sampleManagement')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.director.sampleManagementDesc')}</p>
                  </div>
                </Link>
                <Link to="/dashboard/physical-evaluation">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.director.physicalEvaluation')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.director.physicalEvaluationDesc')}</p>
                  </div>
                </Link>
                <Link to="/dashboard/sample-assignment">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.director.judgeAssignment')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.director.judgeAssignmentDesc')}</p>
                  </div>
                </Link>
                <Link to="/dashboard/evaluation-supervision">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.director.evaluationSupervision')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.director.evaluationSupervisionDesc')}</p>
                  </div>
                </Link>
              </>
            )}
            {user?.role === 'participant' && (
              <>
                <Link to="/dashboard/submission">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.participant.submitSample')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.participant.submitSampleDesc')}</p>
                  </div>
                </Link>
                <Link to="/dashboard/results">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.participant.viewResults')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.participant.viewResultsDesc')}</p>
                  </div>
                </Link>
              </>
            )}
            {(user?.role === 'judge' || user?.role === 'evaluator') && (
              <>
                <Link to="/dashboard/evaluation">
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                    <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.reviewer.sampleEvaluation')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.reviewer.sampleEvaluationDesc')}</p>
                  </div>
                </Link>
                <div className="p-2 sm:p-3 border rounded-lg hover:bg-[hsl(var(--secondary))] cursor-pointer transition-[var(--transition-smooth)]">
                  <p className="text-xs sm:text-sm font-medium">{t('dashboard.quickActions.reviewer.evaluationHistory')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.quickActions.reviewer.evaluationHistoryDesc')}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;