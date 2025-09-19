import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Filter, Eye, CheckCircle, Clock, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SampleManagementService, type SampleManagement } from "@/lib/sampleManagement";
import { useTranslation } from "react-i18next";

// Using SampleManagement interface from the service

const SampleManagement = () => {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<SampleManagement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [trackingCodeSearch, setTrackingCodeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Load samples on component mount
  useEffect(() => {
    loadSamples();
  }, []);

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
      sample.origin.toLowerCase().includes(term);

    const matchesTracking = trackingCodeSearch
      ? sample.internalCode.toLowerCase().includes(trackingCodeSearch.toLowerCase())
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
    </div>
  );
};

export default SampleManagement;