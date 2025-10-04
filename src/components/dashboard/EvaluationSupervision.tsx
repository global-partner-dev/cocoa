import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Clock, Users, Search, Filter, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DirectorSampleEvaluation, DirectorJudgeKpi } from "@/lib/directorSupervisionService";
import { DirectorSupervisionService } from "@/lib/directorSupervisionService";
import { useTranslation } from "react-i18next";
import SensoryEvaluationDetails from "./SensoryEvaluationDetails";
import type { SensoryEvaluationData } from "@/lib/sensoryEvaluationService";

// Local helper for label styling
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

const EvaluationSupervision = () => {
  const [evaluations, setEvaluations] = useState<DirectorSampleEvaluation[]>([]);
  const [judges, setJudges] = useState<DirectorJudgeKpi[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<DirectorSampleEvaluation | null>(null);
  const [selectedJudgeEvaluation, setSelectedJudgeEvaluation] = useState<SensoryEvaluationData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterContest, setFilterContest] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { samples, judges } = await DirectorSupervisionService.getEvaluationOverview();
        if (!isMounted) return;
        setEvaluations(samples);
        setJudges(judges);
      } catch (e: any) {
        console.error("Failed to load supervision data", e);
        setError(e?.message || t('evaluationSupervision.toasts.loadFailed'));
        toast({ title: t('evaluationSupervision.toasts.errorTitle'), description: t('evaluationSupervision.toasts.loadFailed'), variant: "destructive" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [toast]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const { samples, judges } = await DirectorSupervisionService.getEvaluationOverview();
      setEvaluations(samples);
      setJudges(judges);
      toast({ title: t('evaluationSupervision.toasts.refreshedTitle'), description: t('evaluationSupervision.toasts.refreshedDesc') });
    } catch (e: any) {
      setError(e?.message || t('evaluationSupervision.toasts.refreshFailedDesc'));
      toast({ title: t('evaluationSupervision.toasts.refreshFailedTitle'), description: t('evaluationSupervision.toasts.refreshFailedDesc'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewJudgeEvaluation = async (sampleId: string, judgeId: string) => {
    try {
      setLoadingDetails(true);
      const details = await DirectorSupervisionService.getSensoryEvaluationDetails(sampleId, judgeId);
      setSelectedJudgeEvaluation(details);
    } catch (e: any) {
      console.error("Failed to load sensory evaluation details", e);
      toast({ 
        title: t('evaluationSupervision.toasts.errorTitle'), 
        description: e?.message || t('evaluationSupervision.toasts.detailsLoadFailed'), 
        variant: "destructive" 
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: DirectorSampleEvaluation["status"]) => {
    switch (status) {
      case "assigned": return "bg-blue-100 text-blue-800";
      case "evaluating": return "bg-yellow-100 text-yellow-800";
      case "evaluated": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getJudgeStatusColor = (status: "pending" | "in_progress" | "completed") => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const uniqueContests = useMemo(() => {
    return Array.from(new Set(evaluations.map(e => e.contestName))).sort();
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const matchesSearch = searchTerm === "" || 
        e.internalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.participantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || e.status === filterStatus;
      const matchesContest = filterContest === "all" || e.contestName === filterContest;
      return matchesSearch && matchesStatus && matchesContest;
    });
  }, [evaluations, searchTerm, filterStatus, filterContest]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEvaluations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvaluations = filteredEvaluations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterContest]);

  const overallStats = useMemo(() => {
    const total = evaluations.length || 1;
    const assigned = evaluations.filter(e => e.status === "assigned").length;
    const inProgress = evaluations.filter(e => e.status === "evaluating").length;
    const completed = evaluations.filter(e => e.status === "evaluated").length;
    const avgProgress = Math.round(
      (evaluations.reduce((acc, e) => acc + (e.overallProgress || 0), 0) / (evaluations.length || 1))
    );
    return { total: evaluations.length, assigned, inProgress, completed, averageProgress: avgProgress };
  }, [evaluations]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-[hsl(var(--chocolate-dark))]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg sm:text-xl font-semibold text-red-600">{t('evaluationSupervision.loadingErrorTitle')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
        <Button onClick={() => { setLoading(true); setError(null); setEvaluations([]); setJudges([]); setSelectedEvaluation(null); }} className="w-full sm:w-auto">{t('evaluationSupervision.retry')}</Button>
      </div>
    );
  }

  // Show sensory evaluation details if a judge evaluation is selected
  if (selectedJudgeEvaluation && selectedEvaluation) {
    return (
      <SensoryEvaluationDetails 
        evaluation={selectedJudgeEvaluation} 
        onBack={() => setSelectedJudgeEvaluation(null)} 
      />
    );
  }

  if (selectedEvaluation) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('evaluationSupervision.details.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {selectedEvaluation.internalCode}
            </p>
          </div>
          <Button variant="outline" onClick={() => setSelectedEvaluation(null)} className="w-full sm:w-auto">
            {t('evaluationSupervision.details.back')}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Sample Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{t('evaluationSupervision.details.sampleInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.internalCode')}</Label>
                    <p className="font-medium text-sm sm:text-base">{selectedEvaluation.internalCode}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.participant')}</Label>
                    <p className="font-medium text-sm sm:text-base truncate">{selectedEvaluation.participantName}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.contest')}</Label>
                    <p className="font-medium text-sm sm:text-base truncate">{selectedEvaluation.contestName}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.deadline')}</Label>
                    <p className="font-medium text-sm sm:text-base">{selectedEvaluation.evaluationDeadline ?? '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.status')}</Label>
                    <Badge className={`${getStatusColor(selectedEvaluation.status)} text-xs`}>
                      {t(`evaluationSupervision.status.sample.${selectedEvaluation.status}`)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.progress')}</Label>
                    <div className="flex items-center space-x-2">
                      <Progress value={selectedEvaluation.overallProgress} className="flex-1" />
                      <span className="text-xs sm:text-sm font-medium">{selectedEvaluation.overallProgress}%</span>
                    </div>
                  </div>
                </div>
                {typeof selectedEvaluation.averageScore === 'number' && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('evaluationSupervision.details.averageScore')}</Label>
                    <p className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
                      {(selectedEvaluation.averageScore / 10).toFixed(1)} / 10
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Judge Evaluations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{t('evaluationSupervision.judges.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('evaluationSupervision.judges.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {selectedEvaluation.assignedJudges.map((judge) => (
                    <div key={judge.judgeId} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">{judge.judgeName}</h4>
                          <Badge className={`${getJudgeStatusColor(judge.status)} text-xs`}>
                            {t(`evaluationSupervision.status.judge.${judge.status}`)}
                          </Badge>
                        </div>
                        {typeof judge.score === 'number' && (
                          <div className="text-left sm:text-right flex-shrink-0">
                            <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
                              {judge.score/10}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.judges.score')}</div>
                          </div>
                        )}
                      </div>
                      {judge.evaluatedAt && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                          {t('evaluationSupervision.judges.evaluatedOn', { date: new Date(judge.evaluatedAt).toLocaleDateString() })}
                        </p>
                      )}
                      {judge.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewJudgeEvaluation(selectedEvaluation.id, judge.judgeId)}
                          disabled={loadingDetails}
                          className="w-full sm:w-auto mt-2"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {loadingDetails ? t('evaluationSupervision.judges.loading') : t('evaluationSupervision.judges.viewDetails')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{t('evaluationSupervision.quickStats.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.quickStats.judgesAssigned')}</span>
                    <span className="font-medium text-sm sm:text-base">{selectedEvaluation.assignedJudges.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.quickStats.completed')}</span>
                    <span className="font-medium text-sm sm:text-base">
                      {selectedEvaluation.assignedJudges.filter(j => j.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.quickStats.inProgress')}</span>
                    <span className="font-medium text-sm sm:text-base">
                      {selectedEvaluation.assignedJudges.filter(j => j.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.quickStats.pending')}</span>
                    <span className="font-medium text-sm sm:text-base">
                      {selectedEvaluation.assignedJudges.filter(j => j.status === 'pending').length}
                    </span>
                  </div>
                </div>
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
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('evaluationSupervision.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('evaluationSupervision.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="w-full sm:w-auto">{t('evaluationSupervision.actions.refresh')}</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or participant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('evaluationSupervision.filters.all')}</SelectItem>
                  <SelectItem value="assigned">{t('evaluationSupervision.filters.assigned')}</SelectItem>
                  <SelectItem value="evaluating">Evaluating</SelectItem>
                  <SelectItem value="evaluated">{t('evaluationSupervision.filters.evaluated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contest Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contest</label>
              <Select value={filterContest} onValueChange={setFilterContest}>
                <SelectTrigger>
                  <SelectValue placeholder="All Contests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contests</SelectItem>
                  {uniqueContests.map((contest) => (
                    <SelectItem key={contest} value={contest}>
                      {contest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
              {overallStats.total}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.overview.totalSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
              {overallStats.assigned}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.overview.assigned')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {overallStats.inProgress}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.overview.inProgress')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {overallStats.completed}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.overview.completed')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="evaluations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evaluations" className="text-xs sm:text-sm">{t('evaluationSupervision.tabs.evaluations')}</TabsTrigger>
          <TabsTrigger value="judges" className="text-xs sm:text-sm">{t('evaluationSupervision.tabs.judges')}</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluations" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('evaluationSupervision.evaluations.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('evaluationSupervision.evaluations.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {paginatedEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="p-3 sm:p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => setSelectedEvaluation(evaluation)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                          {evaluation.internalCode}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {evaluation.participantName} • {evaluation.contestName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 lg:flex-shrink-0">
                        {typeof evaluation.averageScore === 'number' && (
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-bold text-[hsl(var(--chocolate-dark))]">
                              {(evaluation.averageScore / 10).toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('evaluationSupervision.evaluations.score10')}</div>
                          </div>
                        )}
                        <Badge className={`${getStatusColor(evaluation.status)} text-xs`}>
                          {evaluation.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('evaluationSupervision.evaluations.judgesProgress', { completed: evaluation.assignedJudges.filter(j => j.status === 'completed').length, total: evaluation.assignedJudges.length })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('evaluationSupervision.evaluations.due', { date: evaluation.evaluationDeadline ?? '-' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:flex-shrink-0">
                        <Progress value={evaluation.overallProgress} className="w-20 sm:w-24 flex-1 sm:flex-none" />
                        <span className="text-xs sm:text-sm font-medium">{evaluation.overallProgress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredEvaluations.length === 0 && (
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.evaluations.empty')}</div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredEvaluations.length)} of {filteredEvaluations.length} samples
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judges" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('evaluationSupervision.judgesTab.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('evaluationSupervision.judgesTab.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {judges.map((judge) => (
                  <div key={judge.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                      <h4 className="font-medium text-sm sm:text-base">{judge.name}</h4>
                      <Badge variant={judge.efficiency >= 75 ? "default" : "destructive"} className="text-xs w-fit">
                        {judge.efficiency}% {t('evaluationSupervision.judgesTab.efficiencySuffix')}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>{t('evaluationSupervision.judgesTab.assignments')}</span>
                        <span className="font-medium">
                          {judge.completedEvaluations}/{judge.totalAssignments}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>{t('evaluationSupervision.judgesTab.avgScore')}</span>
                        <span className="font-medium">{judge.averageScore/10}</span>
                      </div>
                      <Progress value={(judge.completedEvaluations / (judge.totalAssignments || 1)) * 100} />
                    </div>
                  </div>
                ))}
                {judges.length === 0 && (
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('evaluationSupervision.judgesTab.empty')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EvaluationSupervision;