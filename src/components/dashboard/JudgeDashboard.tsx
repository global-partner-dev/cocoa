import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Clock, CheckCircle, AlertCircle, Eye, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SensoryEvaluationForm from "./SensoryEvaluationForm";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notificationsService";
import { useTranslation } from "react-i18next";

interface AssignedSample {
  id: string;
  internalCode: string;
  contestName: string;
  assignedDate: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  evaluationProgress?: number;
  scores?: SensoryScores;
  hasEvaluation?: boolean;
}

interface SensoryScores {
  aroma: number;
  flavor: number;
  texture: number;
  aftertaste: number;
  balance: number;
  overallScore: number;
  defectsTotal: number;
  notes?: string;
}

interface Contest {
  id: string;
  name: string;
  status: 'active' | 'completed';
  samplesAssigned: number;
  samplesCompleted: number;
  deadline: string;
}

interface Notification {
  id: string;
  type: 'assignment' | 'deadline' | 'reminder' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const JudgeDashboard = () => {
  const [samples, setSamples] = useState<AssignedSample[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  // Recent notifications from DB (latest 5)
  const { data: recentNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['judge-recent-notifications'],
    queryFn: () => fetchNotifications({ limit: 5 }),
    staleTime: 10_000,
  });
  const [selectedSample, setSelectedSample] = useState<AssignedSample | null>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const getStatusColor = (status: AssignedSample['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AssignedSample['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'in_progress': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return null;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment': return <Star className="w-4 h-4 text-blue-600" />;
      case 'deadline': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'reminder': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    // This function is not currently used but kept for future implementation
    console.log('Mark notification as read:', notificationId);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const unreadNotifications = (recentNotifications as any[]).filter((n: any) => !n.read).length;
  const totalSamples = samples.length;
  const completedSamples = samples.filter(s => s.status === 'completed').length;
  const pendingSamples = samples.filter(s => s.status === 'pending').length;
  const inProgressSamples = samples.filter(s => s.status === 'in_progress').length;

  // Load real data for judge
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [asgs, acts] = await Promise.all([
          (await import("@/lib/judgeAssignmentService")).JudgeAssignmentService.getAssignedSamplesForJudge(),
          (await import("@/lib/judgeAssignmentService")).JudgeAssignmentService.getActiveContestsForJudge(),
        ]);
        
        // Check for existing sensory evaluations
        const { SensoryEvaluationService } = await import("@/lib/sensoryEvaluationService");
        const evaluationSamples = await SensoryEvaluationService.getSamplesForJudge();
        
        // Map service DTOs to this component's types and merge with evaluation data
        const samplesWithEvaluations = asgs.map((sample: any) => {
          const evaluationSample = evaluationSamples && Array.isArray(evaluationSamples) ? 
            evaluationSamples.find((es: any) => es.id === sample.id) : null;
          
          return {
            ...sample,
            hasEvaluation: evaluationSample?.hasEvaluation || false,
            status: evaluationSample?.hasEvaluation ? 'completed' : sample.status,
            evaluationProgress: evaluationSample?.hasEvaluation ? 100 : sample.evaluationProgress,
          };
        });
        
        setSamples(samplesWithEvaluations);
        setContests(acts);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error(e);
        toast({ title: "Failed to load dashboard data", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      const [asgs, acts] = await Promise.all([
        (await import("@/lib/judgeAssignmentService")).JudgeAssignmentService.getAssignedSamplesForJudge(),
        (await import("@/lib/judgeAssignmentService")).JudgeAssignmentService.getActiveContestsForJudge(),
      ]);
      
      // Check for existing sensory evaluations
      const { SensoryEvaluationService } = await import("@/lib/sensoryEvaluationService");
      const evaluationSamples = await SensoryEvaluationService.getSamplesForJudge();
      
      // Map service DTOs to this component's types and merge with evaluation data
      const samplesWithEvaluations = asgs.map((sample: any) => {
        const evaluationSample = evaluationSamples && Array.isArray(evaluationSamples) ? 
          evaluationSamples.find((es: any) => es.id === sample.id) : null;
        
        return {
          ...sample,
          hasEvaluation: evaluationSample?.hasEvaluation || false,
          status: evaluationSample?.hasEvaluation ? 'completed' : sample.status,
          evaluationProgress: evaluationSample?.hasEvaluation ? 100 : sample.evaluationProgress,
        };
      });
      
      setSamples(samplesWithEvaluations);
      setContests(acts);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error(e);
      toast({ title: "Failed to refresh", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Function to load existing evaluation data for a sample
  const loadExistingEvaluation = async (sampleId: string) => {
    try {
      const { SensoryEvaluationService } = await import("@/lib/sensoryEvaluationService");
      const result = await SensoryEvaluationService.getSensoryEvaluation(sampleId);
      
      if (result.success && result.data) {
        // Transform the data to match SensoryEvaluationResult format
        const evaluationResult = {
          meta: {
            evaluationDate: result.data.evaluationDate,
            evaluationTime: result.data.evaluationTime,
            evaluatorName: result.data.evaluatorName,
            sampleCode: result.data.sampleCode,
            sampleNotes: result.data.sampleNotes,
            evaluationType: result.data.evaluationType,
          },
          scores: {
            cacao: result.data.cacao,
            bitterness: result.data.bitterness,
            astringency: result.data.astringency,
            caramelPanela: result.data.caramelPanela,
            acidityTotal: result.data.acidityTotal,
            freshFruitTotal: result.data.freshFruitTotal,
            brownFruitTotal: result.data.brownFruitTotal,
            vegetalTotal: result.data.vegetalTotal,
            floralTotal: result.data.floralTotal,
            woodTotal: result.data.woodTotal,
            spiceTotal: result.data.spiceTotal,
            nutTotal: result.data.nutTotal,
            roastDegree: result.data.roastDegree,
            defectsTotal: result.data.defectsTotal,
            acidity: result.data.acidity,
            freshFruit: result.data.freshFruit,
            brownFruit: result.data.brownFruit,
            vegetal: result.data.vegetal,
            floral: result.data.floral,
            wood: result.data.wood,
            spice: result.data.spice,
            nut: result.data.nut,
            defects: result.data.defects,
            sweetness: result.data.sweetness,
            textureNotes: result.data.textureNotes,
            overallQuality: result.data.overallQuality,
          },
          comments: {
            flavorComments: result.data.flavorComments,
            producerRecommendations: result.data.producerRecommendations,
            additionalPositive: result.data.additionalPositive,
          },
          verdict: {
            result: result.data.verdict,
            reasons: result.data.disqualificationReasons,
            otherReason: result.data.otherDisqualificationReason,
          },
        };
        setExistingEvaluation(evaluationResult);
      } else {
        setExistingEvaluation(null);
      }
    } catch (error) {
      console.error('Error loading existing evaluation:', error);
      setExistingEvaluation(null);
    }
  };

  // Function to handle sample selection
  const handleSampleSelect = async (sample: AssignedSample) => {
    setSelectedSample(sample);
    setLoading(true);
    
    // If the sample is pending and doesn't have an evaluation, mark it as in progress
    if (sample.status === 'pending' && !sample.hasEvaluation) {
      try {
        const { SensoryEvaluationService } = await import("@/lib/sensoryEvaluationService");
        await SensoryEvaluationService.startEvaluation(sample.id);
        
        // Update local state to reflect the status change
        const updatedSamples = samples.map(s =>
          s.id === sample.id ? { ...s, status: 'in_progress' as const, evaluationProgress: 10 } : s
        );
        setSamples(updatedSamples);
        setSelectedSample({ ...sample, status: 'in_progress', evaluationProgress: 10 });
      } catch (error) {
        console.error('Error starting evaluation:', error);
        // Continue anyway - the evaluation can still be done
      }
    }
    
    await loadExistingEvaluation(sample.id);
    setLoading(false);
  };

  if (selectedSample) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('judgeDashboard.sensory.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t('judgeDashboard.sensory.sampleLabel', { code: selectedSample.internalCode })}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedSample(null)}
            className="w-full sm:w-auto"
          >
            {t('judgeDashboard.sensory.backToDashboard')}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Sample Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('judgeDashboard.sensory.sampleInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.internalCode')}</label>
                <p className="text-base sm:text-lg font-semibold text-[hsl(var(--chocolate-dark))]">
                  {selectedSample.internalCode}
                </p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.contest')}</label>
                <p className="text-xs sm:text-sm truncate">{selectedSample.contestName}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.assignedDate')}</label>
                <p className="text-xs sm:text-sm">{selectedSample.assignedDate}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.deadline')}</label>
                <p className="text-xs sm:text-sm font-medium text-red-600">{selectedSample.deadline}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.status')}</label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(selectedSample.status)}
                  </div>
                  <Badge className={`${getStatusColor(selectedSample.status)} text-xs`}>
                    {selectedSample.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              {selectedSample.evaluationProgress !== undefined && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('judgeDashboard.sensory.progress')}</label>
                  <Progress value={selectedSample.evaluationProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSample.evaluationProgress}% complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sensory Evaluation Form */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{t('judgeDashboard.sensory.formTitle')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('judgeDashboard.sensory.formDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center py-6 sm:py-8 gap-3 sm:gap-2">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[hsl(var(--chocolate-medium))]" />
                    <span className="text-xs sm:text-sm text-muted-foreground">{t('judgeDashboard.sensory.loading')}</span>
                  </div>
                ) : (
                  <SensoryEvaluationForm
                  metaDefaults={{
                    evaluatorName: 'Current Judge',
                    sampleCode: selectedSample.internalCode,
                  }}
                  initialData={existingEvaluation}
                  referenceImageUrl="/sensory_wheel.jpg"
                  category={selectedSample.category as 'cocoa_bean' | 'cocoa_liquor' | 'chocolate'}
                  onCancel={() => {
                    setSelectedSample(null);
                    setExistingEvaluation(null);
                  }}
                  onSubmit={async (result) => {
                    try {
                      setLoading(true);
                      
                      // Save sensory evaluation to database
                      const { SensoryEvaluationService } = await import("@/lib/sensoryEvaluationService");
                      const saveResult = await SensoryEvaluationService.saveSensoryEvaluation(
                        selectedSample.id,
                        result
                      );

                      if (!saveResult.success) {
                        throw new Error(saveResult.error || 'Failed to save evaluation');
                      }

                      // Update local state
                      const updatedSamples = samples.map(sample =>
                        sample.id === selectedSample.id
                          ? {
                              ...selectedSample,
                              status: 'completed' as const,
                              evaluationProgress: 100,
                              scores: {
                                aroma: result.scores.cacao ?? 0,
                                flavor: result.scores.overallQuality ?? 0,
                                texture: result.scores.astringency ?? 0,
                                aftertaste: result.scores.bitterness ?? 0,
                                balance: result.scores.caramelPanela ?? 0,
                                overallScore: result.scores.overallQuality ?? 0,
                                defectsTotal: result.scores.defectsTotal ?? 0,
                                notes: result.comments.flavorComments || undefined,
                              },
                            }
                          : sample
                      );
                      setSamples(updatedSamples);
                      setSelectedSample(null);
                      setExistingEvaluation(null);
                      
                      toast({
                        title: t('judgeDashboard.toasts.savedTitle'),
                        description: t('judgeDashboard.toasts.savedDesc', { code: selectedSample.internalCode, score: result.scores.overallQuality?.toFixed(1) ?? '0.0' }),
                      });
                    } catch (error) {
                      console.error('Error saving sensory evaluation:', error);
                      toast({
                        title: t('judgeDashboard.toasts.saveFailedTitle'),
                        description: error instanceof Error ? error.message : t('judgeDashboard.toasts.unknownError'),
                        variant: 'destructive',
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('judgeDashboard.header.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('judgeDashboard.header.subtitle')}</p>
        </div>
        <div className="flex items-center justify-end sm:justify-start gap-3 sm:gap-4">
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{t('judgeDashboard.header.notifications')}</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
              {totalSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('judgeDashboard.stats.totalAssigned')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {pendingSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('judgeDashboard.stats.pending')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
              {inProgressSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('judgeDashboard.stats.inProgress')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {completedSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('judgeDashboard.stats.completed')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Assigned Samples */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('judgeDashboard.assigned.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('judgeDashboard.assigned.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="p-3 sm:p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => handleSampleSelect(sample)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(sample.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                            {sample.internalCode}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {sample.contestName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned: {sample.assignedDate} • Due: {sample.deadline}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end space-x-3 lg:flex-shrink-0">
                        <div className="text-left lg:text-right">
                          {getDaysUntilDeadline(sample.deadline) <= 2 && (
                            <div className="text-xs text-red-600 font-medium">
                              {t('judgeDashboard.assigned.dueInDays', { days: getDaysUntilDeadline(sample.deadline) })}
                            </div>
                          )}
                          <Badge className={`${getStatusColor(sample.status)} text-xs`}>
                            {sample.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {sample.evaluationProgress !== undefined && (
                          <div className="w-16 sm:w-20 flex-shrink-0">
                            <Progress value={sample.evaluationProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              {sample.evaluationProgress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {sample.scores && sample.status === 'completed' && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Overall Score:</span>
                          <span className="font-semibold text-[hsl(var(--chocolate-dark))]">
                            {sample.scores.overallScore.toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Active Contests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('judgeDashboard.sidebar.activeContests')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {contests.map((contest) => (
                  <div key={contest.id} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="font-medium text-sm sm:text-base truncate">{contest.name}</h4>
                      <Badge variant={contest.status === 'active' ? 'default' : 'secondary'} className="text-xs w-fit">
                        {contest.status}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {t('judgeDashboard.sidebar.deadline')}: {contest.deadline}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>{t('judgeDashboard.sidebar.recentNotifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationsLoading ? (
                  <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                ) : recentNotifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('dashboard.notifications.empty')}</div>
                ) : (
                  recentNotifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border ${
                        n.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon('info')}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${
                            n.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {n.title}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            n.read ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JudgeDashboard;