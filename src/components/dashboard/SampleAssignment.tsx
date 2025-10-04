import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserCheck, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JudgeAssignmentService, UIJudge, UISample } from "@/lib/judgeAssignmentService";
import { useTranslation } from "react-i18next";

const SampleAssignment = () => {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<UISample[]>([]);
  const [judges, setJudges] = useState<UIJudge[]>([]);
  const [selectedSample, setSelectedSample] = useState<UISample | null>(null);
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single');
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [s, j] = await Promise.all([
        JudgeAssignmentService.getSamplesForAssignment(),
        JudgeAssignmentService.getAvailableJudges(50),
      ]);
      setSamples(s);
      setJudges(j);
    } catch (e) {
      console.error(e);
      toast({ title: t('dashboard.sampleAssignment.toasts.failedToLoad'), variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  type UIStatus = 'approved' | 'assigned' | 'evaluating' | 'evaluated';

  // Derive UI status from DB status + presence of assignment rows
  const deriveUIStatus = (s: UISample): UIStatus => {
    if (s.status === 'evaluated') return 'evaluated';
    if (s.hasEvaluating) return 'evaluating';
    if (s.assignedJudges && s.assignedJudges.length > 0) return 'assigned';
    return 'approved';
  };

  const getStatusColor = (status: UIStatus) => {
    switch (status) {
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'evaluating': return 'bg-orange-100 text-orange-800';
      case 'evaluated': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: UIStatus) => {
    switch (status) {
      case 'approved': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'assigned': return <UserCheck className="w-4 h-4 text-yellow-600" />;
      case 'evaluating': return <Users className="w-4 h-4 text-orange-600" />;
      case 'evaluated': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return null;
    }
  };

  const handleJudgeSelection = (judgeId: string, checked: boolean) => {
    if (checked) {
      setSelectedJudges(prev => [...prev, judgeId]);
    } else {
      setSelectedJudges(prev => prev.filter(id => id !== judgeId));
    }
  };

  const handleSampleSelection = (sampleId: string, checked: boolean) => {
    if (checked) {
      setSelectedSamples(prev => [...prev, sampleId]);
    } else {
      setSelectedSamples(prev => prev.filter(id => id !== sampleId));
    }
  };

  const handleAssignJudges = async () => {
    try {
      if (assignmentMode === 'single' && selectedSample) {
        await JudgeAssignmentService.assignJudgesToSample(selectedSample.id, selectedJudges);
        await loadData(); // refresh both samples and judges
        setSelectedSample(null);
        setSelectedJudges([]);
        toast({
          title: t('dashboard.sampleAssignment.toasts.judgesAssigned'),
          description: t('dashboard.sampleAssignment.toasts.judgesAssignedDescription', {
            count: selectedJudges.length,
            sampleCode: selectedSample.internalCode
          }),
        });
      } else if (assignmentMode === 'bulk' && selectedSamples.length > 0) {
        await JudgeAssignmentService.bulkAssign(selectedSamples, selectedJudges);
        await loadData(); // refresh both samples and judges
        setSelectedSamples([]);
        setSelectedJudges([]);
        toast({
          title: t('dashboard.sampleAssignment.toasts.bulkAssignmentComplete'),
          description: t('dashboard.sampleAssignment.toasts.bulkAssignmentDescription', {
            judgeCount: selectedJudges.length,
            sampleCount: selectedSamples.length
          }),
        });
      }
    } catch (e: any) {
      console.error(e);
      toast({ 
        title: t('dashboard.sampleAssignment.toasts.assignmentFailed'), 
        description: e.message || t('dashboard.sampleAssignment.toasts.assignmentFailedDescription'), 
        variant: 'destructive' 
      });
    }
  };

  const getJudgeName = (judgeId: string) => {
    return judges.find(j => j.id === judgeId)?.name || 'Unknown Judge';
  };

  const getStatusText = (status: UIStatus) => {
    switch (status) {
      case 'approved': return t('dashboard.sampleAssignment.samples.status.approved');
      case 'assigned': return t('dashboard.sampleAssignment.samples.status.assigned');
      case 'evaluating': return t('dashboard.sampleAssignment.samples.status.evaluating');
      case 'evaluated': return t('dashboard.sampleAssignment.samples.status.evaluated');
      default: return status;
    }
  };

  const availableJudges = judges.filter(judge => judge.available);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.sampleAssignment.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.sampleAssignment.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button variant="outline" onClick={loadData} disabled={isRefreshing} className="gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('dashboard.sampleAssignment.refresh')}
          </Button>
          <Select value={assignmentMode} onValueChange={(value: 'single' | 'bulk') => setAssignmentMode(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('dashboard.sampleAssignment.assignmentMode.single')}</SelectItem>
              <SelectItem value="bulk">{t('dashboard.sampleAssignment.assignmentMode.bulk')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
              {samples.filter(s => s.status === 'approved').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleAssignment.summary.readyForAssignment')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {samples.filter(s => (s.assignedJudges?.length ?? 0) > 0).length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleAssignment.summary.assigned')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
              {samples.filter(s => s.hasEvaluating).length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleAssignment.summary.underEvaluation')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {samples.filter(s => s.status === 'evaluated').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleAssignment.summary.completed')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Samples List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleAssignment.samples.title')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {assignmentMode === 'single' 
                ? t('dashboard.sampleAssignment.samples.description.single')
                : t('dashboard.sampleAssignment.samples.description.bulk')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {samples.map((sample) => {
                const uiStatus = deriveUIStatus(sample);
                return (
                  <div
                    key={sample.id}
                    className={`p-3 border rounded-lg transition-[var(--transition-smooth)] ${
                      assignmentMode === 'single' 
                        ? 'cursor-pointer hover:shadow-[var(--shadow-chocolate)]' 
                        : ''
                    } ${
                      selectedSample?.id === sample.id ? 'ring-2 ring-[hsl(var(--chocolate-medium))]' : ''
                    }`}
                    onClick={() => {
                      if (assignmentMode === 'single') {
                        setSelectedSample(sample);
                        setSelectedJudges(sample.assignedJudges || []);
                      }
                    }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        {assignmentMode === 'bulk' && sample.status === 'approved' && (
                          <div className="flex-shrink-0 mt-1">
                            <Checkbox
                              checked={selectedSamples.includes(sample.id)}
                              onCheckedChange={(checked) => 
                                handleSampleSelection(sample.id, checked as boolean)
                              }
                            />
                          </div>
                        )}
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(uiStatus)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                            {sample.internalCode}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {sample.participantName}
                          </p>
                          {sample.assignedJudges && sample.assignedJudges.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {t('dashboard.sampleAssignment.samples.judges')} {sample.assignedJudges.map(getJudgeName).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end space-x-2 lg:flex-shrink-0">
                        <Badge className={`${getStatusColor(uiStatus)} text-xs`}>
                          {getStatusText(uiStatus)}
                        </Badge>
                        {sample.evaluationProgress !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {sample.evaluationProgress}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Judge Assignment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleAssignment.judgeAssignment.title')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {assignmentMode === 'single' 
                ? selectedSample 
                  ? t('dashboard.sampleAssignment.judgeAssignment.description.singleSelected', { sampleCode: selectedSample.internalCode })
                  : t('dashboard.sampleAssignment.judgeAssignment.description.singleNotSelected')
                : selectedSamples.length > 0
                  ? t('dashboard.sampleAssignment.judgeAssignment.description.bulkSelected', { count: selectedSamples.length })
                  : t('dashboard.sampleAssignment.judgeAssignment.description.bulkNotSelected')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(assignmentMode === 'single' && selectedSample) || 
             (assignmentMode === 'bulk' && selectedSamples.length > 0) ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {availableJudges.map((judge) => (
                    <div
                      key={judge.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3 sm:gap-4"
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          <Checkbox
                            checked={selectedJudges.includes(judge.id)}
                            onCheckedChange={(checked) => 
                              handleJudgeSelection(judge.id, checked as boolean)
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">{judge.name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {judge.specialization}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {judge.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="text-sm font-medium">
                          {judge.currentAssignments}/{judge.maxAssignments}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('dashboard.sampleAssignment.judgeAssignment.assignments')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <span className="text-sm font-medium">
                      {t('dashboard.sampleAssignment.judgeAssignment.selectedJudges', { count: selectedJudges.length })}
                    </span>
                    <Button
                      onClick={handleAssignJudges}
                      disabled={selectedJudges.length === 0}
                      className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t('dashboard.sampleAssignment.judgeAssignment.assignJudges')}
                    </Button>
                  </div>
                  
                  {selectedJudges.length > 0 && (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <strong>{t('dashboard.sampleAssignment.judgeAssignment.selected')}</strong> {selectedJudges.map(getJudgeName).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                {assignmentMode === 'single' 
                  ? t('dashboard.sampleAssignment.judgeAssignment.noSelection.single')
                  : t('dashboard.sampleAssignment.judgeAssignment.noSelection.bulk')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Judge Availability Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleAssignment.judgeAvailability.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('dashboard.sampleAssignment.judgeAvailability.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {judges.map((judge) => (
              <div
                key={judge.id}
                className={`p-3 sm:p-4 border rounded-lg ${
                  judge.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm sm:text-base">{judge.name}</h4>
                  <Badge variant={judge.available ? "default" : "destructive"} className="text-xs w-fit">
                    {judge.available ? t('dashboard.sampleAssignment.judgeAvailability.available') : t('dashboard.sampleAssignment.judgeAvailability.full')}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  {judge.specialization}
                </p>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span>{t('dashboard.sampleAssignment.judgeAvailability.assignments')}</span>
                  <span className={`font-medium ${
                    judge.currentAssignments >= judge.maxAssignments 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {judge.currentAssignments}/{judge.maxAssignments}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      judge.currentAssignments >= judge.maxAssignments 
                        ? 'bg-red-500' 
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(judge.currentAssignments / judge.maxAssignments) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SampleAssignment;