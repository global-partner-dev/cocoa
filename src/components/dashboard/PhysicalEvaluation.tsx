import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, XCircle, Eye, Save, Send, AlertCircle, RefreshCw, Package, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  PhysicalEvaluationService, 
  type PhysicalEvaluationSample, 
  type PhysicalEvaluationData 
} from "@/lib/physicalEvaluationService";
import { useTranslation } from "react-i18next";

// Using PhysicalEvaluationSample and PhysicalEvaluationData from the service

const PhysicalEvaluation = () => {
  const { t } = useTranslation();
  
  // Get odor arrays from translations
  const TYPICAL_ODORS = t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.typicalOdors', { returnObjects: true }) as string[];
  const ATYPICAL_ODORS = t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.atypicalOdors', { returnObjects: true }) as string[];
  
  const [samples, setSamples] = useState<PhysicalEvaluationSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<PhysicalEvaluationSample | null>(null);
  const [evaluationData, setEvaluationData] = useState<Partial<PhysicalEvaluationData>>({
    undesirableAromas: [],
    hasUndesirableAromas: false,
    hasAffectedGrains: false,
    violatedGrains: false
  });
  // Local UI state for non-critical odor checklists
  const [odorTypical, setOdorTypical] = useState<string[]>([]);
  const [odorAtypical, setOdorAtypical] = useState<string[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterContest, setFilterContest] = useState<string>('all');

  // Utility to toggle items in a list
  const toggleFromList = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
    checked: boolean
  ) => {
    setList(checked ? [...list, item] : list.filter((i) => i !== item));
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPaidForPhysicalEval, setHasPaidForPhysicalEval] = useState(false);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);
  const [unpaidSamples, setUnpaidSamples] = useState<string[]>([]);
  const [paidSamples, setPaidSamples] = useState<string[]>([]);
  const { toast } = useToast();

  const getStatusColor = (status: PhysicalEvaluationSample['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'physical_evaluation': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: PhysicalEvaluationSample['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'disqualified': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'physical_evaluation': return <Eye className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  // Load samples from database
  const loadSamples = async () => {
    try {
      setLoading(true);
      const result = await PhysicalEvaluationService.getSamplesForEvaluation();
      
      if (result.success && result.data) {
        setSamples(result.data);
      } else {
        toast({
          title: t('dashboard.physicalEvaluation.toasts.errorLoadingSamples'),
          description: result.error || t('dashboard.physicalEvaluation.toasts.errorLoadingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      toast({
        title: t('dashboard.physicalEvaluation.toasts.errorLoadingSamples'),
        description: t('dashboard.physicalEvaluation.toasts.unexpectedError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh samples
  const refreshSamples = async () => {
    try {
      setRefreshing(true);
      await loadSamples();
      toast({
        title: t('dashboard.physicalEvaluation.toasts.samplesRefreshed'),
        description: t('dashboard.physicalEvaluation.toasts.samplesRefreshedDescription'),
      });
    } catch (error) {
      console.error('Error refreshing samples:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Check payment status for physical evaluation
  const checkPaymentStatus = async () => {
    try {
      setCheckingPaymentStatus(true);
      const samplesNeedingPhysicalEval = samples.filter(s => s.status === 'received');
      
      if (samplesNeedingPhysicalEval.length === 0) {
        setHasPaidForPhysicalEval(false);
        setUnpaidSamples([]);
        setPaidSamples([]);
        return;
      }

      const { FinanceService } = await import('@/lib/financeService');
      const sampleIds = samplesNeedingPhysicalEval.map(s => s.id);
      
      const paymentStatus = await FinanceService.getUnpaidSamplesForPhysicalEvaluation(sampleIds);
      
      if (paymentStatus.success) {
        setUnpaidSamples(paymentStatus.unpaidSamples);
        setPaidSamples(paymentStatus.paidSamples);
        // Physical evaluation is unlocked if there are any paid samples
        setHasPaidForPhysicalEval(paymentStatus.paidSamples.length > 0);
      } else {
        console.error('Error checking payment status:', paymentStatus.error);
        setHasPaidForPhysicalEval(false);
        setUnpaidSamples([]);
        setPaidSamples([]);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setHasPaidForPhysicalEval(false);
      setUnpaidSamples([]);
      setPaidSamples([]);
    } finally {
      setCheckingPaymentStatus(false);
    }
  };

  // Load samples on component mount
  useEffect(() => {
    loadSamples();
  }, []);

  // Check payment status when samples change
  useEffect(() => {
    if (samples.length > 0) {
      checkPaymentStatus();
    }
  }, [samples]);

  const handleEvaluationChange = <K extends keyof PhysicalEvaluationData>(
    field: K, 
    value: PhysicalEvaluationData[K]
  ) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAromaToggle = (aroma: string, checked: boolean) => {
    const currentAromas = evaluationData.undesirableAromas || [];
    const exists = currentAromas.includes(aroma);
    const newAromas = checked ? (exists ? currentAromas : [...currentAromas, aroma]) : currentAromas.filter(a => a !== aroma);
    setEvaluationData(prev => ({
      ...prev,
      undesirableAromas: newAromas,
      hasUndesirableAromas: newAromas.length > 0
    }));
  };

  const handleSaveEvaluation = async () => {
    if (!selectedSample) return;

    try {
      setSaving(true);
      const result = await PhysicalEvaluationService.savePhysicalEvaluation(
        selectedSample.id,
        {
          ...evaluationData,
          typicalOdors: odorTypical,
          atypicalOdors: odorAtypical,
        }
      );
      
      if (result.success && result.data) {
        // Update local state with the updated sample
        const updatedSamples = samples.map(sample => 
          sample.id === selectedSample.id ? result.data! : sample
        );
        setSamples(updatedSamples);
        
        // Reset form
        setSelectedSample(null);
        setEvaluationData({
          undesirableAromas: [],
          hasUndesirableAromas: false,
          hasAffectedGrains: false,
          violatedGrains: false
        });

        const evaluation = PhysicalEvaluationService.evaluatePhysicalCriteria(evaluationData);
        toast({
          title: evaluation.globalEvaluation === 'disqualified' ? t('dashboard.physicalEvaluation.toasts.sampleDisqualified') : t('dashboard.physicalEvaluation.toasts.evaluationSaved'),
          description: evaluation.globalEvaluation === 'disqualified' 
            ? t('dashboard.physicalEvaluation.toasts.sampleDisqualifiedDescription')
            : t('dashboard.physicalEvaluation.toasts.evaluationSavedDescription'),
          variant: evaluation.globalEvaluation === 'disqualified' ? "destructive" : "default"
        });
      } else {
        toast({
          title: t('dashboard.physicalEvaluation.toasts.errorSaving'),
          description: result.error || t('dashboard.physicalEvaluation.toasts.errorSavingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: t('dashboard.physicalEvaluation.toasts.errorSaving'),
        description: t('dashboard.physicalEvaluation.toasts.unexpectedError'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSample = async (sampleId: string) => {
    try {
      const result = await PhysicalEvaluationService.approveSample(sampleId);
      
      if (result.success && result.data) {
        // Update local state
        const updatedSamples = samples.map(sample => 
          sample.id === sampleId ? result.data! : sample
        );
        setSamples(updatedSamples);
        
        toast({
          title: t('dashboard.physicalEvaluation.toasts.sampleApproved'),
          description: t('dashboard.physicalEvaluation.toasts.sampleApprovedDescription'),
        });
      } else {
        toast({
          title: t('dashboard.physicalEvaluation.toasts.errorApproving'),
          description: result.error || t('dashboard.physicalEvaluation.toasts.errorApprovingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error approving sample:', error);
      toast({
        title: t('dashboard.physicalEvaluation.toasts.errorApproving'),
        description: t('dashboard.physicalEvaluation.toasts.unexpectedError'),
        variant: "destructive"
      });
    }
  };

  const handleNotifyParticipant = (sample: PhysicalEvaluationSample) => {
    if (sample.physicalEvaluation?.disqualificationReasons.length) {
      toast({
        title: t('dashboard.physicalEvaluation.toasts.notificationSent'),
        description: t('dashboard.physicalEvaluation.toasts.notificationSentDescription', { participant: sample.participantName }),
      });
    }
  };

  if (selectedSample) {
    const currentEvaluation = PhysicalEvaluationService.evaluatePhysicalCriteria(evaluationData);
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.physicalEvaluation.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.sampleInfo', { code: selectedSample.internalCode, participant: selectedSample.participantName })}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedSample(null);
              setEvaluationData({
                undesirableAromas: [],
                hasUndesirableAromas: false,
                hasAffectedGrains: false,
                violatedGrains: false
              });
              setOdorTypical([]);
              setOdorAtypical([]);
            }}
            className="w-full sm:w-auto"
          >
            {t('dashboard.physicalEvaluation.evaluationForm.backToList')}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.physicalEvaluation.evaluationForm.title')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('dashboard.physicalEvaluation.evaluationForm.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8 relative">
            {/* Payment Warning Banner */}
            {unpaidSamples.length > 0 && !checkingPaymentStatus && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">
                      {t('dashboard.physicalEvaluation.paymentWarning.title')}
                    </h4>
                    <p className="text-sm text-amber-700 mb-2">
                      {t('dashboard.physicalEvaluation.paymentWarning.description', { count: unpaidSamples.length })}
                    </p>
                    <p className="text-xs text-amber-600">
                      {t('dashboard.physicalEvaluation.paymentWarning.instruction')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Lock Overlay - Only show if no paid samples exist */}
            {!hasPaidForPhysicalEval && !checkingPaymentStatus && unpaidSamples.length > 0 && paidSamples.length === 0 && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-center p-6">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">
                    {t('dashboard.physicalEvaluation.paymentRequired.title')}
                  </h3>
                  <p className="text-sm text-amber-700 mb-4">
                    {t('dashboard.physicalEvaluation.paymentRequired.description')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.physicalEvaluation.paymentRequired.instruction')}
                  </p>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {checkingPaymentStatus && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-center p-6">
                  <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.physicalEvaluation.checkingPaymentStatus')}
                  </p>
                </div>
              </div>
            )}
            
            {/* 1. Odor Checklist */}
            <div>
              <Label className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">{t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.description')}</p>
              {/* Checkbox columns (without image and without separate Critical column) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="font-medium mb-2 text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.typical')}</h4>
                  {TYPICAL_ODORS.map((item) => (
                    <div key={item} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`typ-${item}`}
                        checked={odorTypical.includes(item)}
                        onCheckedChange={(c) => toggleFromList(odorTypical, setOdorTypical, item, c as boolean)}
                      />
                      <Label htmlFor={`typ-${item}`} className="text-xs sm:text-sm">{item}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-red-700 text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.odorChecklist.atypical')}</h4>
                  {ATYPICAL_ODORS.map((item) => (
                    <div key={item} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`atyp-${item}`}
                        checked={odorAtypical.includes(item)}
                        onCheckedChange={(c) => {
                          const checked = c as boolean;
                          toggleFromList(odorAtypical, setOdorAtypical, item, checked);
                          // When an Atypical is selected, reflect it as undesirable aroma for backend rules
                          handleAromaToggle(item, checked);
                        }}
                      />
                      <Label htmlFor={`atyp-${item}`} className="text-xs sm:text-sm">{item}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Humidity */}
            <div>
              <Label htmlFor="humidity" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.humidity.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.humidity.description')}</p>
              <Input
                id="humidity"
                type="number"
                step="0.1"
                value={evaluationData.percentageHumidity || ''}
                onChange={(e) => handleEvaluationChange('percentageHumidity', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.humidity.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 3. Broken grains */}
            <div>
              <Label htmlFor="brokenGrains" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.brokenGrains.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.brokenGrains.description')}</p>
              <Input
                id="brokenGrains"
                type="number"
                step="0.1"
                value={evaluationData.brokenGrains || ''}
                onChange={(e) => handleEvaluationChange('brokenGrains', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.brokenGrains.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 4. Violated grains */}
            <div>
              <Label className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.violatedGrains.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">{t('dashboard.physicalEvaluation.evaluationForm.violatedGrains.description')}</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="violatedGrains"
                  checked={evaluationData.violatedGrains || false}
                  onCheckedChange={(checked) => handleEvaluationChange('violatedGrains', checked as boolean)}
                />
                <Label htmlFor="violatedGrains" className="text-xs sm:text-sm">{t('dashboard.physicalEvaluation.evaluationForm.violatedGrains.label')}</Label>
              </div>
            </div>

            {/* 5. Flat grains */}
            <div>
              <Label htmlFor="flatGrains" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.flatGrains.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.flatGrains.description')}</p>
              <Input
                id="flatGrains"
                type="number"
                step="0.1"
                value={evaluationData.flatGrains || ''}
                onChange={(e) => handleEvaluationChange('flatGrains', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.flatGrains.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 6. Affected grains/insects */}
            <div>
              <Label htmlFor="affectedGrains" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.affectedGrains.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.affectedGrains.description')}</p>
              <Input
                id="affectedGrains"
                type="number"
                min="0"
                value={evaluationData.affectedGrainsInsects || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  handleEvaluationChange('affectedGrainsInsects', value);
                  handleEvaluationChange('hasAffectedGrains', value >= 1);
                }}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.affectedGrains.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 7. Fermentation */}
            <div>
              <Label className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.fermentation.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">{t('dashboard.physicalEvaluation.evaluationForm.fermentation.description')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wellFermented" className="text-xs sm:text-sm">{t('dashboard.physicalEvaluation.evaluationForm.fermentation.wellFermented')}</Label>
                  <Input
                    id="wellFermented"
                    type="number"
                    step="0.1"
                    value={evaluationData.wellFermentedBeans || ''}
                    onChange={(e) => handleEvaluationChange('wellFermentedBeans', parseFloat(e.target.value))}
                    placeholder={t('dashboard.physicalEvaluation.evaluationForm.fermentation.placeholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="lightlyFermented" className="text-xs sm:text-sm">{t('dashboard.physicalEvaluation.evaluationForm.fermentation.lightlyFermented')}</Label>
                  <Input
                    id="lightlyFermented"
                    type="number"
                    step="0.1"
                    value={evaluationData.lightlyFermentedBeans || ''}
                    onChange={(e) => handleEvaluationChange('lightlyFermentedBeans', parseFloat(e.target.value))}
                    placeholder={t('dashboard.physicalEvaluation.evaluationForm.fermentation.placeholder')}
                  />
                </div>
              </div>
              {evaluationData.wellFermentedBeans !== undefined && evaluationData.lightlyFermentedBeans !== undefined && (
                <p className="text-xs sm:text-sm mt-2">
                  <span className="text-muted-foreground">{t('dashboard.physicalEvaluation.evaluationForm.fermentation.totalFermented')} </span>
                  <span className={`font-medium ${(evaluationData.wellFermentedBeans + evaluationData.lightlyFermentedBeans) >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                    {evaluationData.wellFermentedBeans + evaluationData.lightlyFermentedBeans}%
                  </span>
                </p>
              )}
            </div>

            {/* 8. Purple beans */}
            <div>
              <Label htmlFor="purpleBeans" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.purpleBeans.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.purpleBeans.description')}</p>
              <Input
                id="purpleBeans"
                type="number"
                step="0.1"
                value={evaluationData.purpleBeans || ''}
                onChange={(e) => handleEvaluationChange('purpleBeans', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.purpleBeans.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 9. Slaty beans */}
            <div>
              <Label htmlFor="slatyBeans" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.slatyBeans.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.slatyBeans.description')}</p>
              <Input
                id="slatyBeans"
                type="number"
                step="0.1"
                value={evaluationData.slatyBeans || ''}
                onChange={(e) => handleEvaluationChange('slatyBeans', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.slatyBeans.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 10. Internal moldy beans */}
            <div>
              <Label htmlFor="moldyBeans" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.moldyBeans.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.moldyBeans.description')}</p>
              <Input
                id="moldyBeans"
                type="number"
                step="0.1"
                value={evaluationData.internalMoldyBeans || ''}
                onChange={(e) => handleEvaluationChange('internalMoldyBeans', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.moldyBeans.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* 11. Over-fermented beans */}
            <div>
              <Label htmlFor="overFermented" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.overFermented.title')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('dashboard.physicalEvaluation.evaluationForm.overFermented.description')}</p>
              <Input
                id="overFermented"
                type="number"
                step="0.1"
                value={evaluationData.overFermentedBeans || ''}
                onChange={(e) => handleEvaluationChange('overFermentedBeans', parseFloat(e.target.value))}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.overFermented.placeholder')}
                className="w-full sm:max-w-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm sm:text-base font-semibold">{t('dashboard.physicalEvaluation.evaluationForm.notes.title')}</Label>
              <Textarea
                id="notes"
                value={evaluationData.notes || ''}
                onChange={(e) => handleEvaluationChange('notes', e.target.value)}
                placeholder={t('dashboard.physicalEvaluation.evaluationForm.notes.placeholder')}
                rows={4}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Evaluation Results */}
            {currentEvaluation.disqualificationReasons.length > 0 && (
              <div className="p-3 sm:p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.results.disqualified.title')}</h4>
                    <ul className="text-xs sm:text-sm text-red-700 mt-2 space-y-1">
                      {currentEvaluation.disqualificationReasons.map((reason, index) => (
                        <li key={index}>• {reason}</li>
                      ))}
                    </ul>
                    {(odorTypical.length > 0 || odorAtypical.length > 0) && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <div>{t('dashboard.physicalEvaluation.evaluationForm.results.disqualified.observedOdors')}</div>
                        {odorTypical.length > 0 && (<div><span className="font-medium">{t('dashboard.physicalEvaluation.evaluationForm.results.disqualified.typical')}</span> {odorTypical.join(', ')}</div>)}
                        {odorAtypical.length > 0 && (<div><span className="font-medium">{t('dashboard.physicalEvaluation.evaluationForm.results.disqualified.atypical')}</span> {odorAtypical.join(', ')}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentEvaluation.warnings.length > 0 && (
              <div className="p-3 sm:p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.results.warnings.title')}</h4>
                    <ul className="text-xs sm:text-sm text-yellow-700 mt-2 space-y-1">
                      {currentEvaluation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {currentEvaluation.disqualificationReasons.length === 0 && (
              <div className="p-3 sm:p-4 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800 text-sm sm:text-base">{t('dashboard.physicalEvaluation.evaluationForm.results.passed.title')}</h4>
                    <p className="text-xs sm:text-sm text-green-700 mt-1">{t('dashboard.physicalEvaluation.evaluationForm.results.passed.description')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedSample(null);
                  setEvaluationData({
                    undesirableAromas: [],
                    hasUndesirableAromas: false,
                    hasAffectedGrains: false,
                    violatedGrains: false
                  });
                }}
                className="w-full sm:w-auto"
              >
                {t('dashboard.physicalEvaluation.evaluationForm.actions.cancel')}
              </Button>
              <Button 
                onClick={handleSaveEvaluation}
                disabled={saving}
                className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? t('dashboard.physicalEvaluation.evaluationForm.actions.saving') : t('dashboard.physicalEvaluation.evaluationForm.actions.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.physicalEvaluation.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.physicalEvaluation.subtitle')}</p>
        </div>
        <Button
          onClick={refreshSamples}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? t('dashboard.physicalEvaluation.refreshing') : t('dashboard.physicalEvaluation.refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
              {loading ? (
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                samples.filter(s => s.status === 'received').length
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.physicalEvaluation.summary.pendingEvaluation')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {loading ? (
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                samples.filter(s => s.status === 'physical_evaluation').length
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.physicalEvaluation.summary.underEvaluation')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {loading ? (
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                samples.filter(s => s.status === 'approved').length
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.physicalEvaluation.summary.approved')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
              {loading ? (
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                samples.filter(s => s.status === 'disqualified').length
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.physicalEvaluation.summary.disqualified')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Samples List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">{t('dashboard.physicalEvaluation.samplesList.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('dashboard.physicalEvaluation.samplesList.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, participant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="physical_evaluation">Under Evaluation</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterContest} onValueChange={setFilterContest}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by contest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contests</SelectItem>
                  {Array.from(new Set(samples.map(s => s.contestName))).sort().map((contestName) => (
                    <SelectItem key={contestName} value={contestName}>
                      {contestName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm sm:text-base">{t('dashboard.physicalEvaluation.loading')}</span>
              </div>
            ) : samples.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.physicalEvaluation.samplesList.noSamples.title')}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('dashboard.physicalEvaluation.samplesList.noSamples.description')}
                </p>
              </div>
            ) : (
              samples
                .filter(sample => {
                  // Show samples that are:
                  // 1. Already in submitted, physical_evaluation, approved, or disqualified status
                  // 2. In received status AND have been paid for
                  const statusMatch = sample.status === 'submitted' ||
                         sample.status === 'physical_evaluation' || 
                         sample.status === 'approved' || 
                         sample.status === 'disqualified' ||
                         (sample.status === 'received' && paidSamples.includes(sample.id));
                  
                  if (!statusMatch) return false;
                  
                  // Apply filters
                  const term = searchTerm.toLowerCase();
                  const matchesSearch = !searchTerm || 
                    sample.internalCode.toLowerCase().includes(term) ||
                    sample.participantName.toLowerCase().includes(term) ||
                    sample.contestName.toLowerCase().includes(term);
                  
                  const matchesStatus = filterStatus === 'all' || sample.status === filterStatus;
                  const matchesContest = filterContest === 'all' || sample.contestName === filterContest;
                  
                  return matchesSearch && matchesStatus && matchesContest;
                })
                .map((sample) => (
              <div
                key={sample.id}
                className="p-3 sm:p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                onClick={() => setSelectedSample(sample)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                  <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(sample.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                        {sample.internalCode}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {sample.participantName} • {sample.contestName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.physicalEvaluation.samplesList.submitted')} {sample.submissionDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 lg:flex-shrink-0">
                    <Badge className={`${getStatusColor(sample.status)} text-xs`}>
                      {t(`dashboard.physicalEvaluation.samplesList.status.${sample.status}`)}
                    </Badge>
                    {sample.status === 'physical_evaluation' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveSample(sample.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {t('dashboard.physicalEvaluation.samplesList.actions.approve')}
                      </Button>
                    )}
                    {/* {sample.status === 'disqualified' && sample.physicalEvaluation?.disqualificationReasons.length && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotifyParticipant(sample);
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Notify
                      </Button>
                    )} */}
                  </div>
                </div>
                
                {/* Show only warnings if available (hide summary grid) */}
                {sample.physicalEvaluation && sample.physicalEvaluation.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="mt-2 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded text-xs sm:text-sm">
                      <strong className="text-yellow-800">{t('dashboard.physicalEvaluation.samplesList.warnings.title')}</strong>
                      <ul className="text-yellow-700 mt-1 space-y-1">
                        {sample.physicalEvaluation.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Always show disqualification reasons for disqualified samples */}
                {sample.status === 'disqualified' && (
                  <div className="mt-3 pt-3 border-t">
                    {sample.physicalEvaluation?.disqualificationReasons?.length > 0 ? (
                      <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded text-xs sm:text-sm">
                        <strong className="text-red-800">{t('dashboard.physicalEvaluation.samplesList.disqualificationReasons.title')}</strong>
                        <ul className="text-red-700 mt-1 space-y-1">
                          {sample.physicalEvaluation.disqualificationReasons.map((reason, index) => (
                            <li key={index}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded text-xs sm:text-sm">
                        <strong className="text-red-800">Status:</strong>
                        <p className="text-red-700 mt-1">
                          {t('dashboard.physicalEvaluation.samplesList.disqualificationReasons.noReasons')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhysicalEvaluation;