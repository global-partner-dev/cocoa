import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle, Clock, DollarSign, RefreshCw, Star, TrendingUp, AlertTriangle, FileText, Award, Gavel, Info, Package, Mail, Check, Trash2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SensoryEvaluationForm from "./SensoryEvaluationForm";
import { Checkbox } from "@/components/ui/checkbox";
import PayPalButtonsMount from '@/components/payments/PayPalButtonsMount';
import { ResultsService, SampleResult } from "@/lib/resultsService";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications, notificationPrettyType, markAsRead as markDbAsRead, markAsUnread as markDbAsUnread, deleteNotification as deleteDbNotification } from "@/lib/notificationsService";
import visa from "@/assets/visa.png";
import nequi from "@/assets/nequi.png";
import paypal from "@/assets/paypal.png";
import { useTranslation } from "react-i18next";

// Local mock notifications (can be replaced by real source later)
interface Notification {
  id: string;
  type: 'assignment' | 'deadline' | 'reminder' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: 'E001', type: 'info', title: 'Welcome Evaluator', message: 'You can evaluate Top 10 samples after payment.', timestamp: new Date().toISOString(), read: false },
  { id: 'E002', type: 'reminder', title: 'Complete Evaluations', message: 'Don\'t forget to complete your pending evaluations.', timestamp: new Date().toISOString(), read: false },
];

const EvaluatorDashboard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [topSamples, setTopSamples] = useState<SampleResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [selectedSample, setSelectedSample] = useState<SampleResult | null>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  // Front-end pay-to-evaluate gate: store paid sample IDs in memory
  const [paidSamples, setPaidSamples] = useState<Set<string>>(new Set());
  // Track which samples current evaluator already evaluated
  const [evaluatedByMe, setEvaluatedByMe] = useState<Set<string>>(new Set());
  // Contest filter
  const [selectedContestId, setSelectedContestId] = useState<string>('all');

  // Recent notifications (max 5)
  // Notification filters
  const [notifTypeFilter, setNotifTypeFilter] = useState<'all' | string>('all');
  const [notifPriorityFilter, setNotifPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');

  const { data: recentNotifications = [], isLoading: notificationsLoading, refetch: refetchRecent } = useQuery({
    queryKey: ['evaluator-recent-notifications', notifTypeFilter, notifPriorityFilter],
    queryFn: () => fetchNotifications({ limit: 5, type: notifTypeFilter as any, priority: notifPriorityFilter as any }),
    staleTime: 10_000,
  });

  // Unread count from DB for header badge and overview card
  const { data: unreadCountFromDb = 0, refetch: refetchUnread } = useQuery({
    queryKey: ['evaluator-unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5_000,
  });

  // Fetch all contests for the filter dropdown
  const { data: contests = [], isLoading: contestsLoading } = useQuery({
    queryKey: ['evaluator-contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Now that unreadCountFromDb is declared, derive values that depend on it
  const unreadNotifications = unreadCountFromDb; // use DB-backed count for accuracy
  const paidCount = paidSamples.size;

  const loadTop = async () => {
    try {
      setLoading(true);
      const contestFilter = selectedContestId === 'all' ? undefined : selectedContestId;
      const res = await ResultsService.getTopSamplesByScore(10, contestFilter);
      if (!res.success) throw new Error(res.error || t('evaluatorDashboard.toasts.failedLoadTop10'));
      setTopSamples(res.data || []);
    } catch (e: any) {
      console.error(e);
      toast({ title: t('evaluatorDashboard.toasts.failedLoadTop10'), description: e?.message || t('evaluatorDashboard.toasts.unknownError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadTop();
      // Load paid samples from DB
      try {
        const { FinanceService } = await import('@/lib/financeService');
        const res = await FinanceService.getPaidSampleIds();
        if (res.success && res.data) setPaidSamples(res.data);
      } catch {}
      // Load which samples current evaluator has already evaluated (final_evaluations)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('final_evaluations')
            .select('sample_id')
            .eq('evaluator_id', user.id);
          if (!error && data) {
            setEvaluatedByMe(new Set(data.map(d => d.sample_id)));
          }
        }
      } catch {}
    })();
  }, [selectedContestId]);

  const refresh = async () => {
    await loadTop();
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const isPaid = (sampleId: string) => paidSamples.has(sampleId);
  const [payingSampleId, setPayingSampleId] = useState<string | null>(null);
  const [payingAmount, setPayingAmount] = useState<number | null>(null); // dollars
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'nequi' | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const payForSample = async (sampleId: string) => {
    try {
      const { FinanceService } = await import('@/lib/financeService');
      // Gate: Only allow payments when the contest is in final evaluation stage
      const gate = await FinanceService.canEvaluatorPayForSample(sampleId);
      if (!gate.success || !gate.allowed) throw new Error(gate.error || t('evaluatorDashboard.toasts.paymentSetupFailedDesc'));

      // Fetch evaluation price from the contest of this sample
      const priceRes = await FinanceService.getEvaluationPriceCentsForSample(sampleId);
      if (!priceRes.success || priceRes.data == null) throw new Error(priceRes.error || t('evaluatorDashboard.toasts.paymentSetupFailedDesc'));
      const amountDollars = Math.round(priceRes.data) / 100;
      setPayingSampleId(sampleId);
      setPayingAmount(amountDollars);
      setPaymentMethod('paypal');
      setPaymentDialogOpen(true);
    } catch (e: any) {
      toast({ title: t('evaluatorDashboard.toasts.paymentSetupFailedTitle'), description: e?.message || t('evaluatorDashboard.toasts.paymentSetupFailedDesc'), variant: 'destructive' });
    }
  };

  const startEvaluation = async (sample: SampleResult) => {
    if (!isPaid(sample.id)) {
      toast({ title: t('evaluatorDashboard.toasts.paymentRequiredTitle'), description: t('evaluatorDashboard.toasts.paymentRequiredDesc') });
      return;
    }

    setSelectedSample(sample);
    setExistingEvaluation(null);

    // In final evaluation stage, use the final evaluations table instead of regular sensory evaluations
    try {
      setLoading(true);
      const { FinalEvaluationService } = await import('@/lib/finalEvaluationService');
      const existing = await FinalEvaluationService.getForSample(sample.id);
      if (existing.success && existing.data && existing.data.length > 0) {
        // If needed, you can map to the SensoryEvaluationForm structure later
        // For now we keep the form blank for final evaluation to be filled.
      }
    } catch (error) {
      console.warn('Could not load existing final evaluation (may not exist yet).');
    } finally {
      setLoading(false);
    }
  };

  if (selectedSample) {
    return (
      <>
        {/* Payment Modal (visible from list too) */}
        <Dialog open={paymentDialogOpen} onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) { setPaymentMethod(null); setAgreeTerms(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('evaluatorDashboard.payment.title')}</DialogTitle>
              <DialogDescription>{t('evaluatorDashboard.payment.description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="font-medium mb-3">{t('evaluatorDashboard.payment.summaryTitle')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('evaluatorDashboard.payment.evaluationFee')}</span>
                    <span>${payingAmount ?? '-'}</span>
                  </div>
                  <div className="border-t my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>{t('evaluatorDashboard.payment.totalAmount')}</span>
                    <span>${payingAmount ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* Methods */}
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('evaluatorDashboard.payment.methodLabel')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'card', label: t('evaluatorDashboard.payment.methods.card'), icon: CreditCard, img: '/visa.png' },
                    { value: 'nequi', label: t('evaluatorDashboard.payment.methods.nequi'), icon: DollarSign, img: '/nequi.png' },
                    { value: 'paypal', label: t('evaluatorDashboard.payment.methods.paypal'), icon: DollarSign, img: '/paypal.png' },
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
                  <p className="md:col-span-2 text-xs text-muted-foreground">{t('evaluatorDashboard.payment.comingSoon.card')}</p>
                </div>
              )}

              {paymentMethod === 'nequi' && (
                <div className="text-sm text-muted-foreground">
                  {t('evaluatorDashboard.payment.comingSoon.nequi')}
                </div>
              )}

              {/* Agreement */}
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
                <span>{t('evaluatorDashboard.payment.agreeTerms')}</span>
              </label>

              {/* PayPal action zone */}
              {paymentMethod === 'paypal' && payingAmount != null && payingSampleId && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('evaluatorDashboard.payment.total')}</span>
                    <span className="font-semibold">${payingAmount}</span>
                  </div>
                  <PayPalButtonsMount
                    amount={String(payingAmount)}
                    disabled={!agreeTerms}
                    onApproved={async ({ orderId, captureId }) => {
                      try {
                        const { FinanceService } = await import('@/lib/financeService');
                        const cents = Math.round(Number(payingAmount) * 100);
                        const res = await FinanceService.recordEvaluatorPayment(payingSampleId, cents, 'USD', { orderId, captureId });
                        if (!res.success) throw new Error(res.error);
                        setPaidSamples(prev => new Set(prev).add(payingSampleId));
                        toast({ title: t('evaluatorDashboard.toasts.paymentSuccessTitle'), description: t('evaluatorDashboard.toasts.paymentSuccessDesc') });
                      } catch (e: any) {
                        toast({ title: t('evaluatorDashboard.toasts.paymentFailedTitle'), description: e?.message || t('evaluatorDashboard.toasts.paymentFailedDesc'), variant: 'destructive' });
                      } finally {
                        setPayingSampleId(null);
                        setPayingAmount(null);
                        setPaymentMethod(null);
                        setPaymentDialogOpen(false);
                        setAgreeTerms(false);
                      }
                    }}
                  />
                  {!agreeTerms && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('evaluatorDashboard.payment.enablePayPalHint')}</Badge>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="justify-between">
              <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentMethod(null); setAgreeTerms(false); }}>{t('evaluatorDashboard.payment.back')}</Button>
              {paymentMethod !== 'paypal' && (
                <Button disabled className="opacity-60">{t('evaluatorDashboard.payment.paySubmit', { amount: payingAmount ?? '-' })}</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('evaluatorDashboard.sensory.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t('evaluatorDashboard.sensory.sampleLabel', { code: selectedSample.internalCode })}</p>
          </div>
          <Button variant="outline" onClick={() => { setSelectedSample(null); setExistingEvaluation(null); }} className="w-full sm:w-auto">
            <span className="text-xs sm:text-sm">{t('evaluatorDashboard.sensory.backToDashboard')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('evaluatorDashboard.sensory.formTitle')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('evaluatorDashboard.sensory.formDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SensoryEvaluationForm
                metaDefaults={{ evaluatorName: t('evaluatorDashboard.sensory.currentEvaluator'), sampleCode: selectedSample.internalCode }}
                initialData={existingEvaluation}
                referenceImageUrl="/sensory_wheel.jpg"
                category="chocolate"
                onCancel={() => { setSelectedSample(null); setExistingEvaluation(null); }}
onSubmit={async (result) => {
                  try {
                    setLoading(true);
                    const { FinalEvaluationService } = await import('@/lib/finalEvaluationService');
                    if (!selectedSample?.contestId) throw new Error(t('evaluatorDashboard.sensory.missingContestRef'));
                    const payload = {
                      contestId: selectedSample.contestId,
                      sampleId: selectedSample.id,
                      overallQuality: Number(result?.scores?.overallQuality ?? 0),
                      flavorComments: result?.comments?.flavorComments ?? null,
                      producerRecommendations: result?.comments?.producerRecommendations ?? null,
                      additionalPositive: result?.comments?.additionalPositive ?? null,
                      // Optional breakdowns for cocoa bean/liquor (map only if present)
                      cacao: result?.scores?.cacao ?? null,
                      bitterness: result?.scores?.bitterness ?? null,
                      astringency: result?.scores?.astringency ?? null,
                      caramelPanela: result?.scores?.caramelPanela ?? null,
                      acidityTotal: result?.scores?.acidityTotal ?? null,
                      freshFruitTotal: result?.scores?.freshFruitTotal ?? null,
                      brownFruitTotal: result?.scores?.brownFruitTotal ?? null,
                      vegetalTotal: result?.scores?.vegetalTotal ?? null,
                      floralTotal: result?.scores?.floralTotal ?? null,
                      woodTotal: result?.scores?.woodTotal ?? null,
                      spiceTotal: result?.scores?.spiceTotal ?? null,
                      nutTotal: result?.scores?.nutTotal ?? null,
                      roastDegree: result?.scores?.roastDegree ?? null,
                      defectsTotal: result?.scores?.defectsTotal ?? null,
                      // Chocolate-specific attributes (for evaluators)
                      chocolate: result?.scores?.chocolate ? {
                        appearance: {
                          color: result.scores.chocolate.appearance?.color ?? null,
                          gloss: result.scores.chocolate.appearance?.gloss ?? null,
                          surfaceHomogeneity: result.scores.chocolate.appearance?.surfaceHomogeneity ?? null,
                        },
                        aroma: {
                          aromaIntensity: result.scores.chocolate.aroma?.aromaIntensity ?? null,
                          aromaQuality: result.scores.chocolate.aroma?.aromaQuality ?? null,
                          specificNotes: {
                            floral: result.scores.chocolate.aroma?.specificNotes?.floral ?? null,
                            fruity: result.scores.chocolate.aroma?.specificNotes?.fruity ?? null,
                            toasted: result.scores.chocolate.aroma?.specificNotes?.toasted ?? null,
                            hazelnut: result.scores.chocolate.aroma?.specificNotes?.hazelnut ?? null,
                            earthy: result.scores.chocolate.aroma?.specificNotes?.earthy ?? null,
                            spicy: result.scores.chocolate.aroma?.specificNotes?.spicy ?? null,
                            milky: result.scores.chocolate.aroma?.specificNotes?.milky ?? null,
                            woody: result.scores.chocolate.aroma?.specificNotes?.woody ?? null,
                          },
                        },
                        texture: {
                          smoothness: result.scores.chocolate.texture?.smoothness ?? null,
                          melting: result.scores.chocolate.texture?.melting ?? null,
                          body: result.scores.chocolate.texture?.body ?? null,
                        },
                        flavor: {
                          sweetness: result.scores.chocolate.flavor?.sweetness ?? null,
                          bitterness: result.scores.chocolate.flavor?.bitterness ?? null,
                          acidity: result.scores.chocolate.flavor?.acidity ?? null,
                          flavorIntensity: result.scores.chocolate.flavor?.flavorIntensity ?? null,
                          flavorNotes: {
                            citrus: result.scores.chocolate.flavor?.flavorNotes?.citrus ?? null,
                            redFruits: result.scores.chocolate.flavor?.flavorNotes?.redFruits ?? null,
                            nuts: result.scores.chocolate.flavor?.flavorNotes?.nuts ?? null,
                            caramel: result.scores.chocolate.flavor?.flavorNotes?.caramel ?? null,
                            malt: result.scores.chocolate.flavor?.flavorNotes?.malt ?? null,
                            wood: result.scores.chocolate.flavor?.flavorNotes?.wood ?? null,
                            spices: result.scores.chocolate.flavor?.flavorNotes?.spices ?? null,
                          },
                        },
                        aftertaste: {
                          persistence: result.scores.chocolate.aftertaste?.persistence ?? null,
                          aftertasteQuality: result.scores.chocolate.aftertaste?.aftertasteQuality ?? null,
                          finalBalance: result.scores.chocolate.aftertaste?.finalBalance ?? null,
                        },
                      } : undefined,
                    };
                    const saveResult = await FinalEvaluationService.save(payload);
                    if (!saveResult.success) throw new Error(saveResult.error || t('evaluatorDashboard.toasts.saveFailedTitle'));
                    // Mark as evaluated for this evaluator immediately (optimistic)
                    setEvaluatedByMe(prev => new Set(prev).add(selectedSample.id));
                    toast({ title: t('evaluatorDashboard.sensory.saveSuccessTitle'), description: t('evaluatorDashboard.sensory.saveSuccessDesc', { score: payload.overallQuality.toFixed(1) }) });
                    setSelectedSample(null);
                    setExistingEvaluation(null);
                    await refresh();
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: t('evaluatorDashboard.sensory.saveFailedTitle'), description: e?.message || t('evaluatorDashboard.sensory.saveFailedDesc'), variant: 'destructive' });
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('evaluatorDashboard.sensory.sampleInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <div className="text-xs sm:text-sm"><span className="text-muted-foreground">{t('evaluatorDashboard.sensory.internalCode')}</span> <span className="font-medium">{selectedSample.internalCode}</span></div>
              <div className="text-xs sm:text-sm"><span className="text-muted-foreground">{t('evaluatorDashboard.sensory.contest')}</span> <span className="font-medium break-words">{selectedSample.contestName}</span></div>
              <div className="text-xs sm:text-sm"><span className="text-muted-foreground">{t('evaluatorDashboard.sensory.status')}</span> <Badge className="bg-green-100 text-green-800 text-xs">{t('evaluatorDashboard.sensory.statusTop')}</Badge></div>
              <div className="text-xs sm:text-sm"><span className="text-muted-foreground">{t('evaluatorDashboard.sensory.overallScore')}</span> <span className="font-medium">{selectedSample.overallScore?.toFixed?.(2) ?? selectedSample.overallScore}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {/* Global Payment Modal from list view */}
        <Dialog open={paymentDialogOpen} onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) { setPaymentMethod(null); setAgreeTerms(false); } }}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{t('evaluatorDashboard.payment.title')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">{t('evaluatorDashboard.payment.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
              <h4 className="font-medium mb-3 text-sm sm:text-base">{t('evaluatorDashboard.payment.summaryTitle')}</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span>{t('evaluatorDashboard.payment.evaluationFee')}</span>
                  <span>${payingAmount ?? '-'}</span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between font-semibold">
                  <span>{t('evaluatorDashboard.payment.totalAmount')}</span>
                  <span>${payingAmount ?? '-'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-medium">{t('evaluatorDashboard.payment.methodLabel')}</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'card', label: t('evaluatorDashboard.payment.methods.card'), icon: CreditCard, img: visa },
                  { value: 'nequi', label: t('evaluatorDashboard.payment.methods.nequi'), icon: DollarSign, img: nequi },
                  { value: 'paypal', label: t('evaluatorDashboard.payment.methods.paypal'), icon: DollarSign, img: paypal },
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
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-medium text-xs sm:text-sm">{label}</span>
                    </div>
                    <img src={img} alt={`${label} logo`} className="h-5 sm:h-6 w-auto object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 text-xs sm:text-sm">
              <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
              <span>{t('evaluatorDashboard.payment.agreeTerms')}</span>
            </label>

            {paymentMethod === 'paypal' && payingAmount != null && payingSampleId && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">{t('evaluatorDashboard.payment.total')}</span>
                  <span className="font-semibold">${payingAmount}</span>
                </div>
                <PayPalButtonsMount
                  amount={String(payingAmount)}
                  disabled={!agreeTerms}
                  onApproved={async ({ orderId, captureId }) => {
                    try {
                      const { FinanceService } = await import('@/lib/financeService');
                      const cents = Math.round(Number(payingAmount) * 100);
                      const res = await FinanceService.recordEvaluatorPayment(payingSampleId, cents, 'USD', { orderId, captureId });
                      if (!res.success) throw new Error(res.error);
                      setPaidSamples(prev => new Set(prev).add(payingSampleId));
                      toast({ title: t('evaluatorDashboard.toasts.paymentSuccessTitle'), description: t('evaluatorDashboard.toasts.paymentSuccessDesc') });
                    } catch (e: any) {
                      toast({ title: t('evaluatorDashboard.toasts.paymentFailedTitle'), description: e?.message || t('evaluatorDashboard.toasts.paymentFailedDesc'), variant: 'destructive' });
                    } finally {
                      setPayingSampleId(null);
                      setPayingAmount(null);
                      setPaymentMethod(null);
                      setPaymentDialogOpen(false);
                      setAgreeTerms(false);
                    }
                  }}
                />
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">{t('evaluatorDashboard.payment.clickToEvaluate')}</Badge>
                {!agreeTerms && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">{t('evaluatorDashboard.payment.enablePayPalHint')}</Badge>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row justify-between gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => { setPaymentDialogOpen(false); setPaymentMethod(null); setAgreeTerms(false); }} className="w-full sm:w-auto">
              <span className="text-xs sm:text-sm">{t('evaluatorDashboard.payment.back')}</span>
            </Button>
            {paymentMethod !== 'paypal' && (
              <Button disabled className="opacity-60 w-full sm:w-auto">
                <span className="text-xs sm:text-sm">{t('evaluatorDashboard.payment.paySubmit', { amount: payingAmount ?? '-' })}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('evaluatorDashboard.header.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('evaluatorDashboard.header.subtitle')}</p>
        </div>
        <div className="flex items-center justify-end sm:justify-start gap-3 sm:gap-4">
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{t('evaluatorDashboard.header.notifications')}</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadNotifications}</span>
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await refresh(); await refetchRecent(); await refetchUnread(); }} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('evaluatorDashboard.header.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{topSamples.length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluatorDashboard.overview.topSamples')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{paidCount}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluatorDashboard.overview.paidItems')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{unreadNotifications}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluatorDashboard.overview.unreadNotices')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">10</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('evaluatorDashboard.overview.maxSlots')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two column: Top 10 and Recent Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">{t('evaluatorDashboard.top10.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('evaluatorDashboard.top10.description')}</CardDescription>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={selectedContestId} onValueChange={setSelectedContestId}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder={t('evaluatorDashboard.top10.filterByContest')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('evaluatorDashboard.top10.allContests')}</SelectItem>
                    {contests.map((contest: any) => (
                      <SelectItem key={contest.id} value={contest.id}>
                        {contest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col sm:flex-row items-center justify-center py-6 sm:py-8 gap-3 sm:gap-2">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[hsl(var(--chocolate-medium))]" />
                <span className="text-sm sm:text-base text-muted-foreground">{t('evaluatorDashboard.top10.loading')}</span>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {topSamples.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">{t('evaluatorDashboard.top10.empty')}</div>
                ) : (
                  topSamples.map((s) => {
                    const paid = isPaid(s.id);
                    return (
                      <div key={s.id} className="border rounded-md p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                            <span className="font-medium text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">{s.internalCode}</span>
                            <Badge variant="secondary" className="text-xs">{t('evaluatorDashboard.top10.rank')}#{s.ranking ?? '-'}</Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{s.contestName}</div>
                          <div className="text-xs text-muted-foreground">{t('evaluatorDashboard.top10.overall')} {s.overallScore?.toFixed?.(2) ?? s.overallScore}</div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {!paid ? (
                            payingSampleId === s.id && payingAmount != null ? (
                              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => payForSample(s.id)}>
                                <DollarSign className="w-4 h-4" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.top10.payEvaluate')}</span>
                              </Button>
                            ) : (
                              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => payForSample(s.id)}>
                                <DollarSign className="w-4 h-4" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.top10.payEvaluate')}</span>
                              </Button>
                            )
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 gap-1 text-xs w-fit">
                              <CheckCircle className="w-3 h-3" /> {t('evaluatorDashboard.top10.paid')}
                            </Badge>
                          )}
                          {evaluatedByMe.has(s.id) && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs w-fit">{t('evaluatorDashboard.top10.evaluated')}</Badge>
                          )}
                          <Button onClick={() => startEvaluation(s)} disabled={!paid} className="gap-2 w-full sm:w-auto">
                            <Clock className="w-4 h-4" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.top10.evaluate')}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('evaluatorDashboard.notifications.title')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('evaluatorDashboard.notifications.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="py-4 sm:py-6 text-center text-muted-foreground text-xs sm:text-sm">{t('evaluatorDashboard.notifications.loading')}</div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-4 sm:py-6 text-center text-muted-foreground text-xs sm:text-sm">{t('evaluatorDashboard.notifications.empty')}</div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {recentNotifications.map((n: any) => (
                  <div key={n.id} className="border rounded-md p-2 sm:p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {n.type === 'sample_received' && <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                        {n.type === 'sample_disqualified' && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                        {n.type === 'sample_approved' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                        {n.type === 'sample_assigned_to_judge' && <Gavel className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        {(n.type === 'judge_evaluated_sample' || n.type === 'evaluator_evaluated_sample') && <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                        {(n.type === 'contest_created' || n.type === 'contest_completed') && <FileText className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                        {n.type === 'contest_final_stage' && <Award className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        {n.type === 'final_ranking_top3' && <Award className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        {n.type === 'sample_added' && <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                        {n.type === 'user_registered' && <Info className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                        <span className="font-medium text-xs sm:text-sm">{n.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs w-fit">{notificationPrettyType(n.type)}</Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{n.message}</div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      {!n.read ? (
                        <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto" onClick={async () => { await markDbAsRead(n.id); await refetchRecent(); await refetchUnread(); }}>
                          <Check className="w-3 h-3" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.notifications.read')}</span>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto" onClick={async () => { await markDbAsUnread(n.id); await refetchRecent(); await refetchUnread(); }}>
                          <Mail className="w-3 h-3" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.notifications.unread')}</span>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto" onClick={async () => { await deleteDbNotification(n.id); await refetchRecent(); await refetchUnread(); }}>
                        <Trash2 className="w-3 h-3" /> <span className="text-xs sm:text-sm">{t('evaluatorDashboard.notifications.delete')}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
};

export default EvaluatorDashboard;