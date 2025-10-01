import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Trophy, 
  TrendingUp, 
  Eye, 
  Star,
  BarChart3,
  FileText,
  Award,
  Target,
  Zap,
  Loader2,
  User,
  Users
} from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ResultsService, SampleResult, ResultsStats } from "@/lib/resultsService";
import { generateParticipantReport } from "@/lib/pdfReport";
import { useTranslation } from "react-i18next";
import { ContestsService, type ContestDisplay } from "@/lib/contestsService";

const ParticipantResults = () => {
  const { t, i18n } = useTranslation();
  const [results, setResults] = useState<SampleResult[]>([]);
  const [myResults, setMyResults] = useState<SampleResult[]>([]);
  const [stats, setStats] = useState<ResultsStats | null>(null);
  const [selectedResult, setSelectedResult] = useState<SampleResult | null>(null);
  const [detailedSensoryData, setDetailedSensoryData] = useState<any>(null);
  const [detailedDataLoading, setDetailedDataLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [myResultsLoading, setMyResultsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMyResults, setShowMyResults] = useState(false);
  const [contests, setContests] = useState<ContestDisplay[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('all');
  const { toast } = useToast();
  const { user } = useAuth();

  // Load contests on component mount
  useEffect(() => {
    loadContests();
  }, []);

  // Load results data when contest selection changes
  useEffect(() => {
    loadResultsData();
    if (user?.id) {
      loadMyResults();
    }
  }, [user?.id, selectedContestId]);

  const loadContests = async () => {
    try {
      const allContests = await ContestsService.getAllContests();
      setContests(allContests);
    } catch (err) {
      console.error('Failed to load contests:', err);
    }
  };

  const loadResultsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const contestId = selectedContestId === 'all' ? undefined : selectedContestId;

      // Load top samples and stats in parallel
      const [topSamplesResponse, statsResponse] = await Promise.all([
        ResultsService.getTopSamplesByScore(10, contestId),
        ResultsService.getResultsStats(contestId)
      ]);

      if (!topSamplesResponse.success) {
        throw new Error(topSamplesResponse.error || 'Failed to load results');
      }

      if (!statsResponse.success) {
        console.warn('Failed to load stats:', statsResponse.error);
      }

      setResults(topSamplesResponse.data || []);
      setStats(statsResponse.data || null);


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load results';
      setError(errorMessage);
      toast({
        title: t('dashboard.participantResults.toasts.errorLoading'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyResults = async () => {
    if (!user?.id) return;
    
    try {
      setMyResultsLoading(true);
      
      const contestId = selectedContestId === 'all' ? undefined : selectedContestId;
      const response = await ResultsService.getSamplesByUser(user.id, contestId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load your results');
      }

      setMyResults(response.data || []);

      if (response.data && response.data.length === 0) {
        console.log('No personal results found for user');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your results';
      console.error('Error loading personal results:', errorMessage);
      // Don't show error toast for personal results as it's not critical
    } finally {
      setMyResultsLoading(false);
    }
  };

  const loadDetailedSensoryData = async (evaluationId: string) => {
    try {
      setDetailedDataLoading(true);
      
      const response = await ResultsService.getDetailedSensoryData(evaluationId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load detailed sensory data');
      }

      setDetailedSensoryData(response.data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load detailed data';
      console.error('Error loading detailed sensory data:', errorMessage);
      toast({
        title: t('dashboard.participantResults.toasts.errorLoadingDetails'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDetailedDataLoading(false);
    }
  };

  const handleResultSelect = (result: SampleResult) => {
    setSelectedResult(result);
    setDetailedSensoryData(null); // Clear previous data
    loadDetailedSensoryData(result.id);
  };

  const getStatusColor = (status: SampleResult['status']) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'evaluated': return 'bg-blue-100 text-blue-800';
      case 'pending_results': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 8) return 'text-blue-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 9) return t('dashboard.participantResults.scoreGrades.excellent');
    if (score >= 8) return t('dashboard.participantResults.scoreGrades.veryGood');
    if (score >= 7) return t('dashboard.participantResults.scoreGrades.good');
    if (score >= 6) return t('dashboard.participantResults.scoreGrades.fair');
    return t('dashboard.participantResults.scoreGrades.needsImprovement');
  };

  const radarRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadReport = async (result: SampleResult) => {
    toast({
      title: t('dashboard.participantResults.toasts.generatingReport'),
      description: t('dashboard.participantResults.toasts.preparingPdf', { sampleName: result.sampleName }),
    });

    try {
      // When physical evaluation missing, use the same demo fallback used in UI
      let physicalEvalFallback: any = undefined;
      if (!result.physicalEvaluation) {
        const demo = buildDemoPhysicalEvaluation();
        physicalEvalFallback = {
          appearance: demo.appearance,
          aroma: demo.aroma,
          defects: demo.defects,
          moisture: demo.moisture,
          overall: demo.overall,
          notes: demo.notes,
        };
      }

      // Use real sensory data if available, otherwise fall back to demo data
      const sensoryData = detailedSensoryData || buildDemoSensoryData();

      // Include raw physical details when demo is used
      const physicalRawDetails = !result.physicalEvaluation ? sensoryData ? null : null : null;

      await generateParticipantReport({
        result,
        radarChartNode: radarRef.current,
        physicalEvalFallback,
        language: i18n.language as 'en' | 'es',
        physicalRawDetails: !result.physicalEvaluation ? (buildDemoPhysicalEvaluation().raw as any) : null,
        sensoryAttributes: (sensoryData?.attributes as any) || null,
      });

      toast({
        title: t('dashboard.participantResults.toasts.reportReady'),
        description: t('dashboard.participantResults.toasts.pdfDownloaded', { sampleName: result.sampleName }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate PDF';
      toast({ title: t('dashboard.participantResults.toasts.pdfError'), description: msg, variant: 'destructive' });
    }
  };

  const getFilteredResults = (resultsList: SampleResult[]) => {
    return resultsList.filter(result => {
      if (filterStatus === 'all') return true;
      return result.status === filterStatus;
    });
  };

  const currentResults = showMyResults ? myResults : results;
  const filteredResults = getFilteredResults(currentResults);
  const isLoadingCurrent = showMyResults ? myResultsLoading : loading;

  // Use stats from database or calculate from current results as fallback
  const totalSamples = showMyResults ? myResults.length : (stats?.totalSamples || results.length);
  const publishedResults = showMyResults ? myResults.filter(r => r.status === 'published').length : (stats?.evaluatedSamples || results.filter(r => r.status === 'published').length);
  const averageScore = showMyResults 
    ? (myResults.length > 0 ? myResults.reduce((acc, r) => acc + r.overallScore, 0) / myResults.length : 0)
    : (stats?.averageScore || (results.length > 0 ? results.reduce((acc, r) => acc + r.overallScore, 0) / results.length : 0));
  const bestScore = showMyResults 
    ? (myResults.length > 0 ? Math.max(...myResults.map(r => r.overallScore)) : 0)
    : (stats?.bestScore || (results.length > 0 ? Math.max(...results.map(r => r.overallScore)) : 0));
  const totalAwards = showMyResults 
    ? myResults.reduce((acc, r) => acc + (r.awards?.length || 0), 0)
    : (stats?.totalAwards || results.reduce((acc, r) => acc + (r.awards?.length || 0), 0));

  // Radar chart data preparation
  const getRadarData = (result: SampleResult) => {
    return [
      { attribute: 'Aroma', physical: result.physicalEvaluation?.aroma || 0, sensory: result.sensoryEvaluation.aroma },
      { attribute: 'Flavor', physical: 0, sensory: result.sensoryEvaluation.flavor },
      { attribute: 'Texture', physical: 0, sensory: result.sensoryEvaluation.texture },
      { attribute: 'Aftertaste', physical: 0, sensory: result.sensoryEvaluation.aftertaste },
      { attribute: 'Balance', physical: 0, sensory: result.sensoryEvaluation.balance },
      { attribute: 'Appearance', physical: result.physicalEvaluation?.appearance || 0, sensory: 0 },
      { attribute: 'Defects', physical: result.physicalEvaluation?.defects || 0, sensory: 0 }
    ];
  };

  // ---- Demo sensory attributes (upper/lower format) ----
  type DemoLeaf = { value: number };
  type DemoNode = { total?: number; children?: Record<string, number> } | DemoLeaf;
  type DemoEvaluation = {
    evaluator: string;
    sample_id: string;
    sample_info: string;
    date: string;
    attributes: Record<string, DemoNode>;
    global_quality: number;
    positive_qualities: string[];
    flavor_comments: string;
    recommendations: string;
  };

  const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const average = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const buildDemoSensoryData = (): DemoEvaluation => {
    const attributes: Record<string, DemoNode> = {
      cacao: { value: 6.5 },
      acidity: {
        children: {
          frutal: 2.8,
          acetic: 2.0,
          lactic: 1.8,
          mineral_butyric: 1.4,
        },
      },
      fresh_fruit: {
        children: {
          berries: 3.5,
          citrus: 4.0,
          yellow_pulp: 2.5,
          dark: 2.0,
          tropical: 2.5,
        },
      },
      brown_fruit: {
        children: { dry: 4.0, brown: 3.0, overripe: 2.0 },
      },
      vegetal: { children: { grass_herb: 3.0, earthy: 2.5 } },
      floral: { children: { orange_blossom: 4.5, flowers: 3.5 } },
      wood: { children: { light: 3.0, dark: 3.0, resin: 2.5 } },
      spice: { children: { spices: 4.5, tobacco: 3.0, umami: 3.5 } },
      nut: { children: { kernel: 4.5, skin: 3.0 } },
      caramel_panela: { value: 6.0 },
      bitterness: { value: 4.0 },
      astringency: { value: 4.5 },
      roast_degree: { children: { lactic: 4.0, mineral_butyric: 3.5 } },
      defects: {
        children: {
          dirty: 0.5,
          animal: 0.2,
          rotten: 0.1,
          smoke: 0.3,
          humid: 0.4,
          moldy: 0.1,
          overfermented: 0.3,
          other: 0.0,
        },
      },
    };

    // Totals per provided formulas
    const totalsSpec: Record<string, string[]> = {
      acidity: ['frutal', 'acetic', 'lactic', 'mineral_butyric'],
      fresh_fruit: ['berries', 'citrus', 'yellow_pulp', 'dark', 'tropical'],
      brown_fruit: ['dry', 'brown', 'overripe'],
      vegetal: ['grass_herb', 'earthy'],
      floral: ['orange_blossom', 'flowers'],
      wood: ['light', 'dark', 'resin'],
      spice: ['spices', 'tobacco', 'umami'],
      nut: ['kernel', 'skin'],
      roast_degree: ['lactic', 'mineral_butyric'],
      defects: ['dirty', 'animal', 'rotten', 'smoke', 'humid', 'moldy', 'overfermented', 'other'],
    };

    Object.entries(attributes).forEach(([k, v]) => {
      if ('children' in (v as any)) {
        const node = v as { children: Record<string, number>; total?: number };
        const get = (key: string) => Number((node.children as any)[key] ?? 0);
        switch (k) {
          case 'acidity': {
            const sum = get('frutal') + get('acetic') + get('lactic') + get('mineral_butyric');
            node.total = Math.min(10, Math.round(sum * 10) / 10);
            break;
          }
          case 'fresh_fruit': {
            const total = get('berries') + 0.8 * get('citrus') + 0.3 * get('yellow_pulp') + 0.3 * get('dark') + 0.3 * get('tropical');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'brown_fruit': {
            const total = get('dry') + 0.8 * get('brown') + 0.3 * get('overripe');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'vegetal': {
            const total = get('grass_herb') + 0.8 * get('earthy');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'floral': {
            const total = get('orange_blossom') + 0.8 * get('flowers');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'wood': {
            const total = get('light') + 0.8 * get('dark') + 0.3 * get('resin');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'spice': {
            const total = get('spices') + 0.8 * get('tobacco') + 0.3 * get('umami');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'nut': {
            const total = get('kernel') + 0.8 * get('skin');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'roast_degree': {
            const total = get('lactic') + 0.8 * get('mineral_butyric');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          case 'defects': {
            const total = get('dirty') + get('animal') + get('rotten') + get('smoke') + get('humid') + get('moldy') + get('overfermented') + get('other');
            node.total = Math.min(10, Math.round(total * 10) / 10);
            break;
          }
          default: {
            const values = Object.values(node.children || {}) as number[];
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            node.total = Math.round(avg * 10) / 10;
          }
        }
      }
    });

    return {
      evaluator: 'Demo Evaluator',
      sample_id: selectedResult?.id || 'demo-sample-id',
      sample_info: selectedResult?.sampleName || 'Demo Sample',
      date: new Date().toISOString(),
      attributes,
      global_quality: selectedResult?.sensoryEvaluation.overall || 6.5,
      positive_qualities: ['Balanced flavor', 'Pleasant floral notes'],
      flavor_comments: 'Demo data for UI presentation of sensory attributes.',
      recommendations: 'Adjust roast to enhance acidity and reduce bitterness.',
    };
  };

  // Demo Physical Evaluation builder (maps provided JSON to UI fields and scales to 0–10 where needed)
  const buildDemoPhysicalEvaluation = () => {
    // Source JSON (provided)
    const demo = {
      sample_id: "00000000-0000-0000-0000-000000000001",
      undesirable_aromas: [],
      has_undesirable_aromas: false,
      percentage_humidity: 6.5,
      broken_grains: 2.1,
      violated_grains: false,
      flat_grains: 1.5,
      affected_grains_insects: 0,
      has_affected_grains: false,
      well_fermented_beans: 85.0,
      lightly_fermented_beans: 10.0,
      purple_beans: 3.0,
      slaty_beans: 2.0,
      internal_moldy_beans: 0.0,
      over_fermented_beans: 0.0,
      notes: "Sample shows excellent fermentation and minimal defects.",
      evaluated_by: "Dr. Alice",
      evaluated_at: "2025-09-07T14:30:00Z",
      global_evaluation: "passed",
      disqualification_reasons: [],
      warnings: []
    };

    // Map to display metrics (0–10 scale where higher = better, except defects which reduce overall)
    // Appearance: higher when well_fermented high and defects like slaty/purple low
    const appearance = Math.max(
      0,
      Math.min(
        10,
        (demo.well_fermented_beans / 10) - 0.1 * (demo.slaty_beans + demo.purple_beans)
      )
    );

    // Aroma proxy: if no undesirable aromas, give a solid baseline; humidity moderate slightly reduces
    const aroma = Math.max(0, Math.min(10, 7.5 - Math.max(0, demo.percentage_humidity - 7) * 0.5 - (demo.has_undesirable_aromas ? 2 : 0)));

    // Defects: sum of normalized defect indicators (clamped 0–10)
    const defectsRaw =
      demo.broken_grains +
      (demo.affected_grains_insects || 0) +
      (demo.internal_moldy_beans || 0) +
      (demo.over_fermented_beans || 0) +
      (demo.slaty_beans || 0) +
      (demo.purple_beans || 0);
    const defects = Math.min(10, Math.round(defectsRaw * 10) / 10);

    // Moisture scaled to 0–10 as “closer to 7 is better”, simple bell-like shape
    const moisture = Math.max(0, Math.min(10, 10 - Math.abs(7 - demo.percentage_humidity) * 2));

    // Overall: simple composite, lightly penalized by defects
    const overall = Math.max(0, Math.min(10, (appearance * 0.45 + aroma * 0.25 + moisture * 0.3) - defects * 0.1));

    return {
      appearance,
      aroma,
      defects,
      moisture,
      overall,
      notes: demo.notes,
      raw: demo,
    } as const;
  };

  // Loading state
  if (loading && !showMyResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[hsl(var(--chocolate-dark))]" />
          <h2 className="text-xl font-semibold text-[hsl(var(--chocolate-dark))] mb-2">{t('dashboard.participantResults.loading.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.participantResults.loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !showMyResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-[hsl(var(--chocolate-dark))] mb-2">{t('dashboard.participantResults.error.title')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadResultsData} variant="outline">
            {t('dashboard.participantResults.error.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  if (selectedResult) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.participantResults.detailedResults.title')}</h2>
            <p className="text-muted-foreground">{selectedResult.sampleName}</p>
            {detailedDataLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('dashboard.participantResults.loading.detailedData')}
              </p>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedResult(null);
              setDetailedSensoryData(null);
            }}
            className="w-full sm:w-auto"
          >
            {t('dashboard.participantResults.detailedResults.backToResults')}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Overall + Radar in one row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.participantResults.detailedResults.overallPerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Left: awards section */}
                  <div className="flex-1">
                    {selectedResult.awards && selectedResult.awards.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">{t('dashboard.participantResults.detailedResults.awardsRecognition')}</h4>
                        <ul className="space-y-2">
                          {selectedResult.awards.map((award, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <Trophy className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium">{award}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
  
                  {/* Right: score, grade and ranking */}
                  <div className="w-full lg:w-56 shrink-0 text-center p-4 rounded-lg bg-gray-50">
                    <div className="text-3xl sm:text-4xl font-bold text-[hsl(var(--chocolate-dark))]">
                      {selectedResult.overallScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {getScoreGrade(selectedResult.overallScore)}
                    </div>
  
                    {selectedResult.ranking && selectedResult.totalParticipants && (
                      <div className="mt-4">
                        <div className="text-lg sm:text-xl font-bold text-[hsl(var(--chocolate-dark))]">
                          #{selectedResult.ranking}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          out of {selectedResult.totalParticipants} participants
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
  
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.participantResults.detailedResults.performanceRadarChart')}</CardTitle>
                <CardDescription>{t('dashboard.participantResults.detailedResults.radarDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] sm:h-[320px]" ref={radarRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      // Use real data if available, otherwise fall back to demo data
                      const sensoryData = detailedSensoryData || buildDemoSensoryData();
                      const a: any = sensoryData.attributes;
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
                        <RadarChart data={radarData} outerRadius={90}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 8 }} />
                          <Radar name="Intensity" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                          <ReTooltip formatter={(value: number | string) => Number(value).toFixed(1)} />
                        </RadarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Physical Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.participantResults.detailedResults.physicalEvaluation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedResult.physicalEvaluation ? (
                <>
                  <div className="p-3 bg-gray-50 rounded text-xs">
                    <strong>{t('dashboard.participantResults.detailedResults.physicalNotes')}:</strong> {selectedResult.physicalEvaluation.notes}
                  </div>
                </>
              ) : (
                // Use demo physical evaluation when no data is returned from backend
                (() => {
                  const p = buildDemoPhysicalEvaluation();
                  return (
                    <>
                      <div className="p-3 bg-gray-50 rounded text-xs">
                        <strong>{t('dashboard.participantResults.detailedResults.physicalNotes')}:</strong> {p.notes}
                      </div>

                      {/* Raw physical evaluation data (for future report completeness) */}
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">{t('dashboard.participantResults.detailedResults.physicalDetails')}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.evaluatedBy')}</span><span>{p.raw.evaluated_by}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.evaluatedAt')}</span><span>{new Date(p.raw.evaluated_at).toLocaleString()}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.globalEvaluation')}</span><span className="capitalize">{p.raw.global_evaluation}</span></div>

                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.humidity')}</span><span>{p.raw.percentage_humidity}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.brokenGrains')}</span><span>{p.raw.broken_grains}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.flatGrains')}</span><span>{p.raw.flat_grains}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.affectedGrains')}</span><span>{p.raw.affected_grains_insects}</span></div>

                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.wellFermented')}</span><span>{p.raw.well_fermented_beans}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.lightlyFermented')}</span><span>{p.raw.lightly_fermented_beans}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.purpleBeans')}</span><span>{p.raw.purple_beans}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.slatyBeans')}</span><span>{p.raw.slaty_beans}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.moldyBeans')}</span><span>{p.raw.internal_moldy_beans}</span></div>
                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.overFermented')}</span><span>{p.raw.over_fermented_beans}</span></div>

                          <div className="flex justify-between border rounded p-3"><span>{t('dashboard.participantResults.detailedResults.undesirableAromas')}</span><span>{p.raw.has_undesirable_aromas ? t('dashboard.participantResults.detailedResults.yes') : t('dashboard.participantResults.detailedResults.no')}</span></div>
                          <div className="sm:col-span-2 border rounded p-3"><div className="font-medium mb-1">{t('dashboard.participantResults.detailedResults.aromasList')}</div><div className="text-muted-foreground">{p.raw.undesirable_aromas.length ? p.raw.undesirable_aromas.join(', ') : t('dashboard.participantResults.detailedResults.no')}</div></div>

                          <div className="sm:col-span-2 border rounded p-3"><div className="font-medium mb-1">{t('dashboard.participantResults.detailedResults.disqualificationReasons')}</div><div className="text-muted-foreground">{p.raw.disqualification_reasons.length ? p.raw.disqualification_reasons.join('; ') : t('dashboard.participantResults.detailedResults.no')}</div></div>
                          <div className="sm:col-span-2 border rounded p-3"><div className="font-medium mb-1">{t('dashboard.participantResults.detailedResults.warnings')}</div><div className="text-muted-foreground">{p.raw.warnings.length ? p.raw.warnings.join('; ') : t('dashboard.participantResults.detailedResults.no')}</div></div>
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
            </CardContent>
          </Card>

          {/* Sensory Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.participantResults.detailedResults.sensoryEvaluation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Use real data if available, otherwise fall back to demo data
                const sensoryData = detailedSensoryData || buildDemoSensoryData();
                const entries = Object.entries(sensoryData.attributes);
                return (
                  <div className="space-y-4">
                    {entries.map(([groupKey, node]) => {
                      const isLeaf = (n: any): n is { value: number } => 'value' in n;
                      const title = formatLabel(groupKey);
                      if (isLeaf(node)) {
                        const val = (node as any).value as number;
                        return (
                          <div key={groupKey} className="flex items-center justify-between p-2 rounded border">
                            <span className="text-sm">{title}</span>
                            <span className={`text-sm font-semibold ${getScoreColor(val)}`}>{val.toFixed(1)}/10</span>
                          </div>
                        );
                      }
                      const n = node as { total?: number; children?: Record<string, number> };
                      const total = (n.total ?? 0) as number;
                      return (
                        <div key={groupKey} className="rounded border">
                          <div className="flex items-center justify-between p-2">
                            <span className="font-medium">{title}</span>
                            <span className={`font-semibold ${getScoreColor(total)}`}>{total.toFixed(1)}/10</span>
                          </div>
                          {n.children && (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 pt-0">
                              {Object.entries(n.children).map(([k, v]) => (
                                <li key={k} className="flex items-center justify-between text-sm p-3 rounded border">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--chocolate-medium))]" />
                                    <span className="text-xs sm:text-sm">{formatLabel(k)}</span>
                                  </div>
                                  <span className={`font-semibold text-sm ${getScoreColor(v)}`}>{v.toFixed(1)}/10</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('dashboard.participantResults.detailedResults.overallSensory')}</span>
                  <span className={`font-bold ${getScoreColor(selectedResult.sensoryEvaluation.overall)}`}>
                    {selectedResult.sensoryEvaluation.overall.toFixed(1)}/10
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded text-xs">
                <strong>{t('dashboard.participantResults.detailedResults.sensoryNotes')}:</strong> {detailedSensoryData?.flavor_comments || selectedResult.sensoryEvaluation.notes}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Download Report */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-1">{t('dashboard.participantResults.detailedResults.completeReport')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.participantResults.detailedResults.reportDescription')}
                </p>
              </div>
              <Button 
                onClick={() => handleDownloadReport(selectedResult)}
                className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('dashboard.participantResults.detailedResults.downloadPdfReport')}</span>
                <span className="sm:hidden">Download PDF</span>
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
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.participantResults.title')}</h2>
          <p className="text-muted-foreground">
            {showMyResults ? t('dashboard.participantResults.subtitle.myResults') : t('dashboard.participantResults.subtitle.topSamples')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={selectedContestId} onValueChange={setSelectedContestId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Contest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contests</SelectItem>
              {contests.map((contest) => (
                <SelectItem key={contest.id} value={contest.id}>
                  {contest.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              loadResultsData();
              if (user?.id) loadMyResults();
            }} 
            variant="outline"
            className="border-[hsl(var(--chocolate-medium))] text-[hsl(var(--chocolate-dark))] hover:bg-[hsl(var(--chocolate-light))] w-full sm:w-auto"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('dashboard.participantResults.refreshResults')}
          </Button>
        </div>
      </div>

      {/* Loading state for My Results */}
      {showMyResults && myResultsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[hsl(var(--chocolate-dark))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--chocolate-dark))] mb-2">{t('dashboard.participantResults.loading.myResults')}</h3>
            <p className="text-muted-foreground">{t('dashboard.participantResults.loading.myResultsSubtitle')}</p>
          </div>
        </div>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
              {totalSamples}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantResults.stats.totalSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {publishedResults}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantResults.stats.resultsAvailable')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {averageScore.toFixed(1)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantResults.stats.averageScore')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {bestScore.toFixed(1)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantResults.stats.bestScore')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">
              {totalAwards}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.participantResults.stats.awardsWon')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('dashboard.participantResults.topSamples.title')}</CardTitle>
                  <CardDescription>{t('dashboard.participantResults.topSamples.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-[hsl(var(--chocolate-dark))] mb-2">{t('dashboard.participantResults.topSamples.noResults.title')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {results.length === 0 
                        ? t('dashboard.participantResults.topSamples.noResults.noEvaluations')
                        : t('dashboard.participantResults.topSamples.noResults.noMatches')
                      }
                    </p>
                    {results.length === 0 && (
                      <Button 
                        onClick={loadResultsData} 
                        variant="outline"
                        className="border-[hsl(var(--chocolate-medium))] text-[hsl(var(--chocolate-dark))] hover:bg-[hsl(var(--chocolate-light))]"
                      >
                        {t('dashboard.participantResults.topSamples.noResults.refresh')}
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {result.ranking && result.ranking <= 3 ? (
                            <Trophy className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              result.ranking === 1 ? 'text-yellow-500' :
                              result.ranking === 2 ? 'text-gray-400' :
                              'text-amber-600'
                            }`} />
                          ) : (
                            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[hsl(var(--chocolate-dark))] text-base sm:text-lg">
                            {result.sampleName}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {result.contestName} • {result.category}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Evaluated: {result.evaluationDate}
                            </span>
                            {result.ranking && (
                              <span className="text-xs font-medium text-blue-600">
                                Rank #{result.ranking}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status and score - responsive layout */}
                      <div className="flex items-center justify-between lg:flex-col lg:items-end gap-4 lg:gap-2">
                        <div className="flex flex-col items-start lg:items-end">
                          <Badge className={`${getStatusColor(result.status)} w-fit`}>
                            {t(`dashboard.participantResults.status.${result.status}`)}
                          </Badge>
                          {result.awards && result.awards.length > 0 && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {result.awards.length} award{result.awards.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                            {result.overallScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getScoreGrade(result.overallScore)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.participantResults.topPerformers.title')}</CardTitle>
              <CardDescription>{t('dashboard.participantResults.topPerformers.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.slice(0, 3).map((result, index) => (
                  <div key={result.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Trophy className={`w-4 h-4 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                        <h4 className="font-medium text-sm">{result.sampleName}</h4>
                      </div>
                      <Badge variant="outline">#{result.ranking}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{t('dashboard.participantResults.topPerformers.participant')}: {result.participantName}</div>
                      <div>{t('dashboard.participantResults.topPerformers.score')}: {result.overallScore.toFixed(1)}/10</div>
                      <div>{t('dashboard.participantResults.topPerformers.contest')}: {result.contestName}</div>
                    </div>
                    
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('dashboard.participantResults.topPerformers.noPerformers')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.participantResults.performanceInsights.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{t('dashboard.participantResults.performanceInsights.improvingQuality.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.participantResults.performanceInsights.improvingQuality.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">{t('dashboard.participantResults.performanceInsights.strongFlavor.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.participantResults.performanceInsights.strongFlavor.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">{t('dashboard.participantResults.performanceInsights.focusTexture.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.participantResults.performanceInsights.focusTexture.description')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParticipantResults;