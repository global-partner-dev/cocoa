import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Filter, Eye, CheckCircle, Clock, AlertTriangle, Trash2, RefreshCw, CreditCard, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SampleManagementService, type SampleManagement } from "@/lib/sampleManagement";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import PayPalButtonsMount from '@/components/payments/PayPalButtonsMount';
import visa from "@/assets/visa.png";
import nequi from "@/assets/nequi.png";
import paypal from "@/assets/paypal.png";

// Using SampleManagement interface from the service

const SampleManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [samples, setSamples] = useState<SampleManagement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [trackingCodeSearch, setTrackingCodeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingForPhysicalEval, setPayingForPhysicalEval] = useState(false);
  const [hasPaidForPhysicalEval, setHasPaidForPhysicalEval] = useState(false);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);
  const [unpaidSamples, setUnpaidSamples] = useState<string[]>([]);
  const [paidSamples, setPaidSamples] = useState<string[]>([]);
  
  // Payment modal state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'nequi' | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [payingAmount, setPayingAmount] = useState<number | null>(null);

  const { toast } = useToast();

  const getStatusColor = (status: SampleManagement['status']) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-yellow-100 text-yellow-800';
      case 'physical_evaluation': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SampleManagement['status']) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'received': return <Package className="w-4 h-4 text-yellow-600" />;
      case 'physical_evaluation': return <Eye className="w-4 h-4 text-orange-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'disqualified': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: SampleManagement['status']) => {
    switch (status) {
      case 'submitted': return t('dashboard.sampleManagement.sampleList.status.submitted');
      case 'received': return t('dashboard.sampleManagement.sampleList.status.received');
      case 'physical_evaluation': return t('dashboard.sampleManagement.sampleList.status.evaluated');
      case 'approved': return t('dashboard.sampleManagement.sampleList.status.approved');
      case 'disqualified': return t('dashboard.sampleManagement.sampleList.status.disqualified');
      default: return status as string;
    }
  };

  // Load samples from database
  const loadSamples = async () => {
    try {
      setLoading(true);
      const result = await SampleManagementService.getAllSamples();
      
      if (result.success && result.data) {
        setSamples(result.data);
      } else {
        toast({
          title: t('dashboard.sampleManagement.toasts.errorLoading'),
          description: result.error || t('dashboard.sampleManagement.toasts.errorLoadingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      toast({
        title: t('dashboard.sampleManagement.toasts.errorLoading'),
        description: t('dashboard.sampleManagement.toasts.errorLoadingUnexpected'),
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
        title: t('dashboard.sampleManagement.toasts.samplesRefreshed'),
        description: t('dashboard.sampleManagement.toasts.samplesRefreshedDescription'),
      });
    } catch (error) {
      console.error('Error refreshing samples:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Pay & Start Physical Evaluation
  const handlePayAndStartPhysicalEvaluation = async () => {
    // Check if there are unpaid samples that need physical evaluation
    if (unpaidSamples.length === 0) {
      toast({
        title: t('dashboard.sampleManagement.toasts.noUnpaidSamples'),
        description: t('dashboard.sampleManagement.toasts.noUnpaidSamplesDescription'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the contest information to calculate the total amount
      const { ContestsService } = await import('@/lib/contestsService');
      const contests = await ContestsService.getAvailableContests();
      
      if (contests.length === 0) {
        toast({
          title: t('dashboard.sampleManagement.toasts.noContestFound'),
          description: t('dashboard.sampleManagement.toasts.noContestFoundDescription'),
          variant: "destructive"
        });
        return;
      }

      // Use the first contest's sample price (assuming all samples are from the same contest)
      const contest = contests[0];
      const samplePrice = contest.samplePrice || 0;
      const totalAmount = unpaidSamples.length * samplePrice; // Only calculate for unpaid samples
      
      setPayingAmount(totalAmount);
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error('Error calculating payment amount:', error);
      toast({
        title: t('dashboard.sampleManagement.toasts.paymentCalculationError'),
        description: t('dashboard.sampleManagement.toasts.paymentCalculationErrorDescription'),
        variant: "destructive"
      });
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (details: any) => {
    try {
      setPayingForPhysicalEval(true);
      
      console.log('Payment success - unpaidSamples:', unpaidSamples);
      console.log('Payment success - payingAmount:', payingAmount);
      console.log('Payment success - details:', details);
      
      // Record the payment in the database (only for unpaid samples)
      const { FinanceService } = await import('@/lib/financeService');
      const amountCents = Math.round((payingAmount || 0) * 100);
      
      console.log('Payment success - amountCents:', amountCents);
      
      const paymentResult = await FinanceService.recordDirectorPhysicalEvaluationPayment(
        unpaidSamples, // Only process unpaid samples
        amountCents,
        'USD',
        {
          orderId: details.orderID,
          captureId: details.captureID
        }
      );
      
      console.log('Payment success - paymentResult:', paymentResult);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
      
      // Update only the paid samples to 'physical_evaluation' status
      const updatedSamples = samples.map(sample => 
        unpaidSamples.includes(sample.id) && sample.status === 'received'
          ? { ...sample, status: 'physical_evaluation' as const }
          : sample
      );
      setSamples(updatedSamples);

      toast({
        title: t('dashboard.sampleManagement.toasts.physicalEvalStarted'),
        description: t('dashboard.sampleManagement.toasts.physicalEvalStartedDescription', {
          count: unpaidSamples.length
        }),
      });

      // Close modal and reset state
      setPaymentDialogOpen(false);
      setPaymentMethod(null);
      setAgreeTerms(false);
      setPayingAmount(null);
      
      // Refresh payment status
      await checkPaymentStatus();
    } catch (error) {
      console.error('Error starting physical evaluation:', error);
      toast({
        title: t('dashboard.sampleManagement.toasts.physicalEvalError'),
        description: t('dashboard.sampleManagement.toasts.physicalEvalErrorDescription'),
        variant: "destructive"
      });
    } finally {
      setPayingForPhysicalEval(false);
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
        setHasPaidForPhysicalEval(!paymentStatus.hasUnpaidSamples);
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

  const handleReceiveSample = async (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    try {
      const result = await SampleManagementService.updateSampleStatus(sampleId, 'received');
      
      if (result.success) {
        // Update local state
        const updatedSamples = samples.map(s =>
          s.id === sampleId
            ? {
                ...s,
                status: 'received' as const,
                receivedDate: new Date().toISOString().split('T')[0]
              }
            : s
        );
        setSamples(updatedSamples);

        toast({
          title: t('dashboard.sampleManagement.toasts.sampleReceived'),
          description: t('dashboard.sampleManagement.toasts.sampleReceivedDescription', {
            externalCode: sample.externalCode
          }),
        });
      } else {
        toast({
          title: t('dashboard.sampleManagement.toasts.errorUpdating'),
          description: result.error || t('dashboard.sampleManagement.toasts.errorUpdatingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error receiving sample:', error);
      toast({
        title: t('dashboard.sampleManagement.toasts.errorUpdating'),
        description: t('dashboard.sampleManagement.toasts.errorUpdatingUnexpected'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteSample = async (sampleId: string) => {
    const sampleToDelete = samples.find(s => s.id === sampleId);
    if (!sampleToDelete) return;

    try {
      const result = await SampleManagementService.deleteSample(sampleId);
      
      if (result.success) {
        // Update local state
        const updatedSamples = samples.filter(sample => sample.id !== sampleId);
        setSamples(updatedSamples);

        toast({
          title: t('dashboard.sampleManagement.toasts.sampleDeleted'),
          description: t('dashboard.sampleManagement.toasts.sampleDeletedDescription', {
            externalCode: sampleToDelete.externalCode
          }),
          variant: "destructive"
        });
      } else {
        toast({
          title: t('dashboard.sampleManagement.toasts.errorDeleting'),
          description: result.error || t('dashboard.sampleManagement.toasts.errorDeletingDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting sample:', error);
      toast({
        title: t('dashboard.sampleManagement.toasts.errorDeleting'),
        description: t('dashboard.sampleManagement.toasts.errorDeletingUnexpected'),
        variant: "destructive"
      });
    }
  };

  const filteredSamples = samples.filter(sample => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      sample.externalCode.toLowerCase().includes(term) ||
      sample.participantName.toLowerCase().includes(term) ||
      sample.origin.toLowerCase().includes(term) ||
      sample.contest.toLowerCase().includes(term) ||
      sample.category.toLowerCase().includes(term) ||
      (sample.farmName && sample.farmName.toLowerCase().includes(term)) ||
      (sample.ownerFullName && sample.ownerFullName.toLowerCase().includes(term)) ||
      (sample.notes && sample.notes.toLowerCase().includes(term)) ||
      (sample.weight && sample.weight.toString().includes(term)) ||
      (sample.liquorName && sample.liquorName.toLowerCase().includes(term)) ||
      (sample.lotNumber && sample.lotNumber.toLowerCase().includes(term));

    const matchesTracking = trackingCodeSearch
      ? sample.internalCode.toLowerCase().includes(trackingCodeSearch.toLowerCase()) ||
        sample.externalCode.toLowerCase().includes(trackingCodeSearch.toLowerCase())
      : true;

    const matchesStatus = filterStatus === 'all' || sample.status === filterStatus;

    return matchesSearch && matchesTracking && matchesStatus;
  });

  const stats = {
    total: samples.length,
    submitted: samples.filter(s => s.status === 'submitted').length,
    received: samples.filter(s => s.status === 'received').length,
    physical_evaluation: samples.filter(s => s.status === 'physical_evaluation').length,
    approved: samples.filter(s => s.status === 'approved').length,
    disqualified: samples.filter(s => s.status === 'disqualified').length
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.sampleManagement.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.sampleManagement.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Only show Pay & Start Physical Evaluation button for directors */}
          {user?.role === 'director' && (
            <Button
              onClick={handlePayAndStartPhysicalEvaluation}
              disabled={
                payingForPhysicalEval || 
                checkingPaymentStatus ||
                unpaidSamples.length === 0
              }
              className={`w-full sm:w-auto ${
                hasPaidForPhysicalEval 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] text-white'
              }`}
              size="sm"
            >
              <CreditCard className={`w-4 h-4 mr-2 ${payingForPhysicalEval || checkingPaymentStatus ? 'animate-pulse' : ''}`} />
              {checkingPaymentStatus 
                ? t('dashboard.sampleManagement.checkingPaymentStatus')
                : payingForPhysicalEval 
                  ? t('dashboard.sampleManagement.processing') 
                  : unpaidSamples.length === 0
                    ? t('dashboard.sampleManagement.allSamplesPaid')
                    : t('dashboard.sampleManagement.payAndStartPhysicalEval')
              }
            </Button>
          )}
          <Button
            onClick={refreshSamples}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? t('dashboard.sampleManagement.refreshing') : t('dashboard.sampleManagement.refresh')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
              {stats.total}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.totalSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {stats.submitted}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.submitted')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">
              {stats.received}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.received')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">
              {stats.physical_evaluation}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.physicalEval')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.approved')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {stats.disqualified}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.sampleManagement.summary.disqualified')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>{t('dashboard.sampleManagement.filters.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('dashboard.sampleManagement.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                placeholder={t('dashboard.sampleManagement.filters.internalCodePlaceholder')}
                value={trackingCodeSearch}
                onChange={(e) => setTrackingCodeSearch(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.sampleManagement.filters.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.sampleManagement.filters.allStatus')}</SelectItem>
                  <SelectItem value="submitted">{t('dashboard.sampleManagement.filters.status.submitted')}</SelectItem>
                  <SelectItem value="received">{t('dashboard.sampleManagement.filters.status.received')}</SelectItem>
                  <SelectItem value="physical_evaluation">{t('dashboard.sampleManagement.filters.status.evaluated')}</SelectItem>
                  <SelectItem value="approved">{t('dashboard.sampleManagement.filters.status.approved')}</SelectItem>
                  <SelectItem value="disqualified">{t('dashboard.sampleManagement.filters.status.disqualified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Samples List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sampleManagement.sampleList.title')}</CardTitle>
          <CardDescription>{t('dashboard.sampleManagement.sampleList.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>{t('dashboard.sampleManagement.sampleList.loading')}</span>
              </div>
            ) : filteredSamples.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.sampleManagement.sampleList.noSamplesFound')}</h3>
                <p className="text-muted-foreground">
                  {samples.length === 0 
                    ? t('dashboard.sampleManagement.sampleList.noSamplesSubmitted')
                    : t('dashboard.sampleManagement.sampleList.noSamplesMatch')}
                </p>
              </div>
            ) : (
              filteredSamples.map((sample) => (
              <div
                key={sample.id}
                className="p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(sample.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-lg sm:text-base">
                          {sample.externalCode}
                        </h3>
                        <Badge variant="outline" className="text-xs w-fit">
                          {sample.internalCode}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="truncate">
                          {sample.participantName} • {sample.origin}
                        </p>
                        <p className="text-xs">
                          {t('dashboard.sampleManagement.sampleList.submitted')} {sample.submissionDate}
                          {sample.receivedDate && ` • ${t('dashboard.sampleManagement.sampleList.received')} ${sample.receivedDate}`}
                        </p>
                        {sample.weight && (
                          <p className="text-xs">
                            {t('dashboard.sampleManagement.sampleList.weight')} {sample.weight}kg
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status and actions - responsive layout */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:gap-2 lg:items-end">
                    <Badge className={`${getStatusColor(sample.status)} w-fit self-start sm:self-auto`}>
                      {getStatusLabel(sample.status)}
                    </Badge>
                    
                    <div className="flex flex-wrap gap-2">
                      {sample.status === 'submitted' && (
                        <Button
                          size="sm"
                          onClick={() => handleReceiveSample(sample.id)}
                          className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] text-xs sm:text-sm"
                        >
                          <Package className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">{t('dashboard.sampleManagement.sampleList.receive')}</span>
                          <span className="sm:hidden">Receive</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSample(sample.id)}
                        className="text-xs sm:text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">{t('dashboard.sampleManagement.sampleList.delete')}</span>
                        <span className="sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
                
                {sample.notes && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm bg-gray-50 p-3 rounded">
                      <strong>{t('dashboard.sampleManagement.sampleList.notes')}</strong> {sample.notes}
                    </p>
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentDialogOpen} onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) { setPaymentMethod(null); setAgreeTerms(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.sampleManagement.payment.title')}</DialogTitle>
            <DialogDescription>{t('dashboard.sampleManagement.payment.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="font-medium mb-3">{t('dashboard.sampleManagement.payment.summaryTitle')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('dashboard.sampleManagement.payment.totalReceivedSamples')}</span>
                  <span>{samples.filter(s => s.status === 'received').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.sampleManagement.payment.paidSamples')}</span>
                  <span className="text-green-600">{paidSamples.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.sampleManagement.payment.unpaidSamples')}</span>
                  <span className="text-amber-600">{unpaidSamples.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.sampleManagement.payment.samplePrice')}</span>
                  <span>${((payingAmount ?? 0) / Math.max(unpaidSamples.length, 1)).toFixed(2)}</span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between font-semibold">
                  <span>{t('dashboard.sampleManagement.payment.totalAmount')}</span>
                  <span>${payingAmount?.toFixed(2) ?? '-'}</span>
                </div>
              </div>
            </div>

            {/* Methods */}
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('dashboard.sampleManagement.payment.methodLabel')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { value: 'card', label: t('dashboard.sampleManagement.payment.methods.card'), icon: CreditCard, img: visa },
                  { value: 'nequi', label: t('dashboard.sampleManagement.payment.methods.nequi'), icon: DollarSign, img: nequi },
                  { value: 'paypal', label: t('dashboard.sampleManagement.payment.methods.paypal'), icon: DollarSign, img: paypal },
                ].map(({ value, label, icon: Icon, img }) => (
                  <button
                    type="button"
                    key={value}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                      paymentMethod === value
                        ? 'border-[hsl(var(--chocolate-medium))] bg-[hsl(var(--chocolate-cream))] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentMethod(value as 'paypal' | 'card' | 'nequi')}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <img src={img} alt={`${label} logo`} className="h-6 w-auto object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* Details per method */}
            {paymentMethod === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input disabled placeholder="1234 5678 9012 3456" className="h-10 rounded-md border px-3 text-sm bg-muted/50" />
                <input disabled placeholder="John Doe" className="h-10 rounded-md border px-3 text-sm bg-muted/50" />
                <input disabled placeholder="MM/YY" className="h-10 rounded-md border px-3 text-sm bg-muted/50" />
                <input disabled placeholder="CVV" className="h-10 rounded-md border px-3 text-sm bg-muted/50" />
                <p className="md:col-span-2 text-xs text-muted-foreground">{t('dashboard.sampleManagement.payment.comingSoon.card')}</p>
              </div>
            )}

            {paymentMethod === 'nequi' && (
              <div className="text-sm text-muted-foreground">
                {t('dashboard.sampleManagement.payment.comingSoon.nequi')}
              </div>
            )}

            {/* Agreement */}
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
              <span>{t('dashboard.sampleManagement.payment.agreeTerms')}</span>
            </label>

            {/* PayPal action zone */}
            {paymentMethod === 'paypal' && payingAmount != null && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.sampleManagement.payment.total')}</span>
                  <span className="font-semibold">${payingAmount}</span>
                </div>
                <PayPalButtonsMount
                  amount={String(payingAmount)}
                  disabled={!agreeTerms}
                  onApproved={async ({ orderId, captureId }) => {
                    try {
                      // Record payment and start physical evaluation
                      await handlePaymentSuccess({ orderID: orderId, captureID: captureId });
                      toast({ 
                        title: t('dashboard.sampleManagement.toasts.paymentSuccessTitle'), 
                        description: t('dashboard.sampleManagement.toasts.paymentSuccessDesc') 
                      });
                    } catch (e: any) {
                      toast({ 
                        title: t('dashboard.sampleManagement.toasts.paymentFailedTitle'), 
                        description: e?.message || t('dashboard.sampleManagement.toasts.paymentFailedDesc'), 
                        variant: 'destructive' 
                      });
                    }
                  }}
                />
                {!agreeTerms && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {t('dashboard.sampleManagement.payment.enablePayPalHint')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="justify-between">
            <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentMethod(null); setAgreeTerms(false); }}>
              {t('dashboard.sampleManagement.payment.back')}
            </Button>
            {paymentMethod !== 'paypal' && (
              <Button disabled className="opacity-60">
                {t('dashboard.sampleManagement.payment.paySubmit', { amount: payingAmount ?? '-' })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SampleManagement;