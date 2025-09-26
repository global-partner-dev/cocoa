import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Package, 
  Eye, 
  Download, 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  FileText,
  QrCode,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateParticipantReport } from "@/lib/pdfReport";
import { supabase } from "@/lib/supabase";
import { ResultsService } from "@/lib/resultsService";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notificationsService";
import { useTranslation } from "react-i18next";

interface SubmittedSample {
  id: string;
  sampleName: string;
  contestName: string;
  submissionDate: string;
  status: 'submitted' | 'received' | 'physical_evaluation' | 'approved' | 'assigned' | 'evaluating' | 'evaluated' | 'disqualified';
  trackingCode: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  physicalScore?: number;
  sensoryScore?: number;
  overallScore?: number;
  feedback?: string;
  qrCode?: string;
  labelGenerated: boolean;
}

interface DraftSample {
  id: string;
  sampleName: string;
  contestName: string;
  lastModified: string;
  productType: 'bean' | 'chocolate' | 'liquor';
  completionPercentage: number;
}

interface Contest {
  id: string;
  name: string;
  description: string;
  registrationDeadline: string;
  submissionDeadline: string;
  entryFee: number;
  sampleFee: number;
  status: 'open' | 'closed' | 'completed';
  categories: string[];
}

interface Notification {
  id: string;
  type: 'payment' | 'sample_received' | 'disqualified' | 'results' | 'deadline' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedSample?: string;
}



const ParticipantDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<SubmittedSample[]>([]);
  const [drafts, setDrafts] = useState<DraftSample[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  // Recent notifications from DB (latest 5)
  const { data: recentNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['participant-recent-notifications'],
    queryFn: () => fetchNotifications({ limit: 5 }),
    staleTime: 10_000,
  });
  const [selectedSample, setSelectedSample] = useState<SubmittedSample | null>(null);
  const [detailedSensoryData, setDetailedSensoryData] = useState<any>(null);
  const [physicalRawDetails, setPhysicalRawDetails] = useState<Record<string, any> | null>(null);
  const [exportRadarData, setExportRadarData] = useState<any[] | null>(null); // used for PDF rendering
  const radarRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      await refresh();
    };

    loadData();
  }, [toast]);

  // Manual refresh adapted from JudgeDashboard
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    try {
      setLoading(true);
      // 1) Fetch user samples from DB
      const samplesFromDb = await (await import("@/lib/samplesService")).SamplesService.getUserSamples();

      // 2) Map to UI shape; mark all as paid (DB always paid per business rule)
      const baseSamples: SubmittedSample[] = (samplesFromDb as any[]).map((s: any) => ({
        id: s.id,
        sampleName: s.farm_name || `Sample ${s.tracking_code}`,
        contestName: s.contests?.name || 'Unknown Contest',
        submissionDate: (s.created_at || '').split('T')[0],
        status: (() => {
          if (s.status === 'evaluated') return 'evaluated';
          if (s.status === 'approved') return 'approved';
          if (s.status === 'received') return 'received';
          if (s.status === 'disqualified') return 'disqualified';
          return 'submitted';
        })(),
        trackingCode: s.tracking_code,
        paymentStatus: 'paid',
        physicalScore: undefined,
        sensoryScore: undefined,
        overallScore: undefined,
        feedback: undefined,
        qrCode: s.qr_code_url || undefined,
        labelGenerated: !!s.qr_code_url,
      }));

      // 3) Enrich with sensory scores only (no feedback/overall needed beyond sensory overall)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const results = await ResultsService.getSamplesByUser(user.id);
        if (results.success && results.data) {
          const bySampleTracking = new Map(results.data.map(r => [r.trackingCode, r]));
          for (const bs of baseSamples) {
            const r = bySampleTracking.get(bs.trackingCode);
            if (r) {
              bs.sensoryScore = r.sensoryEvaluation.overall; // only sensory needed
              bs.overallScore = r.sensoryEvaluation.overall; // keep average card consistent
            }
          }
        }
      }

      setSamples(baseSamples);

      // 4) Fetch draft samples
      const draftSamples = await (await import("@/lib/samplesService")).SamplesService.getUserDrafts();
      const mappedDrafts: DraftSample[] = draftSamples.map((draft: any) => {
        // Calculate completion percentage based on filled fields
        const requiredFields = ['farm_name', 'country', 'owner_full_name'];
        const filledFields = requiredFields.filter(field => draft[field] && draft[field].trim() !== '');
        const completionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);

        return {
          id: draft.id,
          sampleName: draft.farm_name || `Draft ${draft.id.slice(0, 8)}`,
          contestName: draft.contests?.name || 'Unknown Contest',
          lastModified: new Date(draft.updated_at || draft.created_at).toLocaleDateString(),
          productType: draft.product_type || 'bean',
          completionPercentage
        };
      });
      setDrafts(mappedDrafts);

      // 5) Fetch available contests for participants
      const sampleSubmissionService = await import("@/lib/sampleSubmissionService");
      const availableContests = await sampleSubmissionService.SampleSubmissionService.getAvailableContests();
      const mappedContests: Contest[] = availableContests.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        registrationDeadline: c.registrationDeadline,
        submissionDeadline: c.submissionDeadline,
        entryFee: c.entryFee,
        sampleFee: c.sampleFee,
        status: c.status,
        categories: c.categories,
      }));
      setContests(mappedContests);
    } catch (err) {
      console.error('Failed to refresh', err);
      toast({
        title: t('dashboard.participantDashboard.toasts.failedToRefresh'),
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: SubmittedSample['status']) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'physical_evaluation': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'evaluating': return 'bg-orange-100 text-orange-800';
      case 'evaluated': return 'bg-teal-100 text-teal-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SubmittedSample['status']) => {
    switch (status) {
      case 'submitted': return <Upload className="w-4 h-4 text-blue-600" />;
      case 'received': return <Package className="w-4 h-4 text-green-600" />;
      case 'physical_evaluation': return <Eye className="w-4 h-4 text-yellow-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'assigned': return <Clock className="w-4 h-4 text-purple-600" />;
      case 'evaluating': return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'evaluated': return <CheckCircle className="w-4 h-4 text-teal-600" />;
      case 'disqualified': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getPaymentStatusColor = (_status: SubmittedSample['paymentStatus']) => {
    // Always paid per business rule
    return 'bg-green-100 text-green-800';
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'payment': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'sample_received': return <Package className="w-4 h-4 text-blue-600" />;
      case 'disqualified': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'results': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'deadline': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };



  const handleDownloadReport = async (sample: SubmittedSample) => {
    try {
      toast({
        title: t('dashboard.participantDashboard.toasts.generatingReport'),
        description: t('dashboard.participantDashboard.toasts.preparingPdf', { sampleName: sample.sampleName }),
      });

      // Load evaluated result for this sample (for the current user)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const results = await ResultsService.getSamplesByUser(user.id);
      if (!results.success || !results.data) throw new Error(results.error || 'No results');

      const result = results.data.find(r => r.trackingCode === sample.trackingCode);
      if (!result) throw new Error('No evaluated result found for this sample');

      // Ensure we have detailed sensory attributes for the PDF
      let sensoryAttributes = detailedSensoryData?.attributes || null;
      if (!sensoryAttributes) {
        const detailed = await ResultsService.getDetailedSensoryData(result.id);
        if (detailed.success) sensoryAttributes = detailed.data?.attributes || null;
      }

      // Build physical fallback if result lacks physicalEvaluation
      let physicalEvalFallback: any = undefined;
      if (!(result as any).physicalEvaluation) {
        // Provide basic fallback so PDF Physical section renders, using raw details when possible
        const pr = physicalRawDetails || {};
        physicalEvalFallback = {
          appearance: Number(pr.appearance ?? 0),
          aroma: Number(pr.aroma ?? 0),
          defects: Number(pr.defects ?? 0),
          moisture: Number(pr.percentage_humidity ?? 0),
          overall: Number(pr.overall ?? 0) || Number((sensoryAttributes?.global_quality as any) ?? 0) || 0,
          notes: String(pr.notes ?? ''),
        };
      }

      await generateParticipantReport({
        result,
        radarChartNode: radarRef.current, // use hidden node
        physicalEvalFallback,
        language: i18n.language as 'en' | 'es',
        physicalRawDetails: physicalRawDetails || null,
        sensoryAttributes: sensoryAttributes,
      });

      toast({
        title: t('dashboard.participantDashboard.toasts.reportReady'),
        description: t('dashboard.participantDashboard.toasts.downloadedPdf', { sampleName: sample.sampleName }),
      });
    } catch (err) {
      toast({
        title: t('dashboard.participantDashboard.toasts.failedToGenerate'),
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const getStatusProgress = (status: SubmittedSample['status']) => {
    const statusOrder = ['submitted', 'received', 'physical_evaluation', 'approved', 'assigned', 'evaluating', 'evaluated'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const unreadNotifications = (recentNotifications as any[]).filter((n) => !n.read).length;
  const totalSamples = samples.length;
  const evaluatedSamples = samples.filter(s => s.status === 'evaluated').length;
  const disqualifiedSamples = samples.filter(s => s.status === 'disqualified').length;
  const averageScore = samples
    .filter(s => s.overallScore)
    .reduce((acc, s) => acc + (s.overallScore || 0), 0) / 
    samples.filter(s => s.overallScore).length || 0;

  // Load full details when an evaluated sample is selected
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedSample || selectedSample.status !== 'evaluated') {
        setDetailedSensoryData(null);
        setPhysicalRawDetails(null);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const results = await ResultsService.getSamplesByUser(user.id);
        if (results.success && results.data) {
          const result = results.data.find(r => r.trackingCode === selectedSample.trackingCode);
          if (result) {
            // Get detailed sensory
            const detailed = await ResultsService.getDetailedSensoryData(result.id);
            if (detailed.success) {
              setDetailedSensoryData(detailed.data || null);
              // Precompute radar data for PDF (match ParticipantResults composition)
              const a: any = (detailed.data as any)?.attributes || {};
              setExportRadarData([
                { subject: 'Cacao', value: a?.cacao?.value ?? 0 },
                { subject: 'Acidity (Total)', value: a?.acidity?.total ?? 0 },
                { subject: 'Fresh Fruit (Total)', value: a?.fresh_fruit?.total ?? 0 },
                { subject: 'Brown Fruit (Total)', value: a?.brown_fruit?.total ?? 0 },
                { subject: 'Vegetal (Total)', value: a?.vegetal?.total ?? 0 },
                { subject: 'Floral (Total)', value: a?.floral?.total ?? 0 },
                { subject: 'Wood (Total)', value: a?.wood?.total ?? 0 },
                { subject: 'Spice (Total)', value: a?.spice?.total ?? 0 },
                { subject: 'Nut (Total)', value: a?.nut?.total ?? 0 },
                { subject: 'Caramel/Panela', value: a?.caramel_panela?.value ?? 0 },
                { subject: 'Bitterness', value: a?.bitterness?.value ?? 0 },
                { subject: 'Astringency', value: a?.astringency?.value ?? 0 },
                { subject: 'Roast Degree', value: a?.roast_degree?.total ?? 0 },
                { subject: 'Defects (Total)', value: a?.defects?.total ?? 0 },
              ]);
            }

            // Fetch physical evaluation raw details via samples -> physical_evaluations relation
            const { data: sampleRow, error: sampleErr } = await supabase
              .from('samples')
              .select('id, physical_evaluations(*)')
              .eq('tracking_code', selectedSample.trackingCode)
              .single();
            if (!sampleErr && sampleRow && (sampleRow as any).physical_evaluations) {
              const pe = Array.isArray((sampleRow as any).physical_evaluations)
                ? (sampleRow as any).physical_evaluations[0]
                : (sampleRow as any).physical_evaluations;
              setPhysicalRawDetails(pe || null);
            } else {
              setPhysicalRawDetails(null);
            }
          }
        }
      } catch (e) {
        console.error('Failed loading sample details', e);
      }
    };
    fetchDetails();
  }, [selectedSample]);

  if (selectedSample) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.participantDashboard.sampleDetails.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{selectedSample.sampleName}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedSample(null)}
            className="w-full sm:w-auto"
          >
            {t('dashboard.participantDashboard.sampleDetails.backToDashboard')}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Sample Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.sampleDetails.sampleInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.sampleName')}</label>
                <p className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                  {selectedSample.sampleName}
                </p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.contest')}</label>
                <p className="text-xs sm:text-sm truncate">{selectedSample.contestName}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.submissionDate')}</label>
                <p className="text-xs sm:text-sm">{selectedSample.submissionDate}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.externalCode')}</label>
                <p className="text-xs sm:text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {selectedSample.trackingCode}
                </p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.status')}</label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(selectedSample.status)}
                  </div>
                  <Badge className={`${getStatusColor(selectedSample.status)} text-xs`}>
                    {t(`dashboard.participantDashboard.status.${selectedSample.status}`)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.progress')}</label>
                <Progress value={getStatusProgress(selectedSample.status)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(getStatusProgress(selectedSample.status))}% {t('dashboard.participantDashboard.sampleDetails.complete')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* QR Code & Label */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.sampleDetails.shippingInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {selectedSample.qrCode && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.qrCode')}</label>
                  <div className="mt-2 p-3 sm:p-4 bg-gray-50 rounded-lg text-center">
                    <img
                      src={selectedSample.qrCode}
                      alt="QR Code"
                      className="mx-auto mb-2 max-h-32 sm:max-h-40 rounded border"
                    /> 
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!selectedSample.qrCode}
                  onClick={() => selectedSample.qrCode && window.open(selectedSample.qrCode, '_blank')}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  <span className="text-xs sm:text-sm">{t('dashboard.participantDashboard.sampleDetails.downloadQrCode')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.sampleDetails.evaluationResults')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {selectedSample.status === 'evaluated' ? (
                <>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.sensoryEvaluation')}</label>
                    <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
                      {selectedSample.sensoryScore !== undefined 
                        ? `${selectedSample.sensoryScore.toFixed(1)}/10`
                        : 'Available'}
                    </div>
                  </div>
                  
                  {selectedSample.feedback && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.judgeFeedback')}</label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 p-3 bg-gray-50 rounded">
                        {selectedSample.feedback}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleDownloadReport(selectedSample)}
                    className="w-full bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span className="text-xs sm:text-sm">{t('dashboard.participantDashboard.sampleDetails.downloadPdfReport')}</span>
                  </Button>

                  {/* Visible Radar Chart - sensory attributes */}
                  {detailedSensoryData && (
                    <div className="mt-4">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.performanceRadar')}</label>
                      <div className="mt-2 h-64 sm:h-80 bg-gray-50 rounded-lg p-2" ref={radarRef}>
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const a: any = detailedSensoryData?.attributes || {};
                            const radarData = [
                              { subject: 'Cacao', value: a?.cacao?.value ?? 0 },
                              { subject: 'Acidity (Total)', value: a?.acidity?.total ?? 0 },
                              { subject: 'Fresh Fruit (Total)', value: a?.fresh_fruit?.total ?? 0 },
                              { subject: 'Brown Fruit (Total)', value: a?.brown_fruit?.total ?? 0 },
                              { subject: 'Vegetal (Total)', value: a?.vegetal?.total ?? 0 },
                              { subject: 'Floral (Total)', value: a?.floral?.total ?? 0 },
                              { subject: 'Wood (Total)', value: a?.wood?.total ?? 0 },
                              { subject: 'Spice (Total)', value: a?.spice?.total ?? 0 },
                              { subject: 'Nut (Total)', value: a?.nut?.total ?? 0 },
                              { subject: 'Caramel/Panela', value: a?.caramel_panela?.value ?? 0 },
                              { subject: 'Bitterness', value: a?.bitterness?.value ?? 0 },
                              { subject: 'Astringency', value: a?.astringency?.value ?? 0 },
                              { subject: 'Roast Degree', value: a?.roast_degree?.total ?? 0 },
                              { subject: 'Defects (Total)', value: a?.defects?.total ?? 0 },
                            ];
                            return (
                              <RadarChart data={radarData} outerRadius={80}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 8 }} />
                                <Radar name="Intensity" dataKey="value" stroke="#6b3e26" fill="#6b3e26" fillOpacity={0.4} />
                              </RadarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Physical Evaluation Summary */}
                  <div className="mt-4">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.physicalEvaluation')}</label>
                    {physicalRawDetails ? (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.humidity')}</span>
                          <span className="font-semibold">{physicalRawDetails.percentage_humidity ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.brokenGrains')}</span>
                          <span className="font-semibold">{physicalRawDetails.broken_grains ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.flatGrains')}</span>
                          <span className="font-semibold">{physicalRawDetails.flat_grains ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.affectedGrains')}</span>
                          <span className="font-semibold">{physicalRawDetails.affected_grains_insects ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.wellFermented')}</span>
                          <span className="font-semibold">{physicalRawDetails.well_fermented_beans ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.lightlyFermented')}</span>
                          <span className="font-semibold">{physicalRawDetails.lightly_fermented_beans ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.purpleBeans')}</span>
                          <span className="font-semibold">{physicalRawDetails.purple_beans ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.slatyBeans')}</span>
                          <span className="font-semibold">{physicalRawDetails.slaty_beans ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.internalMoldy')}</span>
                          <span className="font-semibold">{physicalRawDetails.internal_moldy_beans ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{t('dashboard.participantDashboard.sampleDetails.overFermented')}</span>
                          <span className="font-semibold">{physicalRawDetails.over_fermented_beans ?? 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-2 bg-gray-50 p-2 rounded">
                          <div className="text-xs text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.notes')}</div>
                          <div className="mt-1 text-xs sm:text-sm">{physicalRawDetails.notes || '—'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.sampleDetails.noPhysicalData')}</div>
                    )}
                  </div>

                  {/* Removed hidden radar; using visible chart node for PDF capture, like ParticipantResults */}
                </>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Eye className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('dashboard.participantDashboard.sampleDetails.evaluationInProgress')}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {t('dashboard.participantDashboard.sampleDetails.resultsAvailable')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.participantDashboard.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.participantDashboard.subtitle')}</p>
        </div>
        <div className="flex items-center justify-end sm:justify-start gap-3 sm:gap-4">
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('dashboard.participantDashboard.refresh')}</span>
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
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.stats.totalSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {evaluatedSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.stats.evaluated')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {disqualifiedSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.stats.disqualifiedSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
              {averageScore ? averageScore.toFixed(1) : '--'}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.stats.averageScore')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Submitted Samples */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.mySamples.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('dashboard.participantDashboard.mySamples.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="p-3 sm:p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => setSelectedSample(sample)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(sample.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                            {sample.sampleName}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {sample.contestName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('dashboard.participantDashboard.mySamples.submitted')}: {sample.submissionDate} • Tracking: {sample.trackingCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end space-x-3 lg:flex-shrink-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="text-left lg:text-right">
                            <Badge className={`${getStatusColor(sample.status)} text-xs`}>
                              {t(`dashboard.participantDashboard.status.${sample.status}`)}
                            </Badge>
                          </div>
                          <div className="w-16 sm:w-20 flex-shrink-0">
                            <Progress value={getStatusProgress(sample.status)} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              {Math.round(getStatusProgress(sample.status))}%
                            </p>
                          </div>
                        </div>
                        {sample.overallScore && (
                          <div className="text-left lg:text-right flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-[hsl(var(--chocolate-dark))]">
                              {sample.overallScore.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('dashboard.participantDashboard.mySamples.score')}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        {/* Draft Samples */}
        {drafts.length > 0 && (
          <div className="xl:col-span-2" style={{ marginTop: '1rem' }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Draft Samples</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Continue working on your unsubmitted samples</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer border-dashed border-orange-300 bg-orange-50/50"
                      onClick={() => navigate(`/dashboard/submission?draftId=${draft.id}`)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-1">
                            <FileText className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">
                              {draft.sampleName}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {draft.contestName} • {draft.productType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last modified: {draft.lastModified}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end space-x-3 lg:flex-shrink-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="text-left lg:text-right">
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                Draft
                              </Badge>
                            </div>
                            <div className="w-16 sm:w-20 flex-shrink-0">
                              <Progress value={draft.completionPercentage} className="h-2" />
                              <p className="text-xs text-muted-foreground text-center mt-1">
                                {draft.completionPercentage}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Open Contests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.openContests.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {contests.filter(c => c.status === 'open').map((contest) => (
                  <div key={contest.id} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="font-medium text-sm sm:text-base truncate">{contest.name}</h4>
                      <Badge variant="default" className="text-xs w-fit">{t('dashboard.participantDashboard.openContests.open')}</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{contest.description}</p>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <div>{t('dashboard.participantDashboard.openContests.registration')}: {contest.registrationDeadline}</div>
                      <div>{t('dashboard.participantDashboard.openContests.submission')}: {contest.submissionDeadline}</div>
                      <div className="font-medium">
                        {t('dashboard.participantDashboard.openContests.entry')}: ${contest.entryFee} • {t('dashboard.participantDashboard.openContests.sample')}: ${contest.sampleFee}
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => navigate('/dashboard/submission')}>
                      {t('dashboard.participantDashboard.openContests.registerSample')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.participantDashboard.recentNotifications.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationsLoading ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.recentNotifications.loading')}</div>
                ) : recentNotifications.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantDashboard.recentNotifications.noNotifications')}</div>
                ) : (
                  (recentNotifications as any[]).map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-2 sm:p-3 rounded-lg border ${
                        n.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon('info')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs sm:text-sm font-medium ${
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
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
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

export default ParticipantDashboard;