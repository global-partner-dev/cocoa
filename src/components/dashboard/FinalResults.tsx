import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { RefreshCw, Trophy, Star, Eye, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import { generateParticipantReport } from '@/lib/pdfReport'
import { useTranslation } from 'react-i18next'
import { ContestsService, type ContestDisplay } from '@/lib/contestsService'
import { ResultsService } from '@/lib/resultsService'
import { FinalResultsService } from '@/lib/finalResultsService'

// Aggregates final evaluations and provides a details panel with radar + PDF like ParticipantResults

// Judge comment interface for final evaluations
interface JudgeComment {
  judgeNumber: number;
  evaluationDate: string;
  flavor_comments: string;
  producer_recommendations: string;
  additional_positive: string;
  overall_quality: number;
}

type Row = {
  sample_id: string
  avg_score: number
  count: number
  latest: string
  samples: {
    id: string
    tracking_code: string
    created_at: string
    category: string | null
    contests: { id: string; name: string }
    profiles: { name: string | null }
    cocoa_bean: Array<{ farm_name: string }> | null
    cocoa_liquor: Array<{ name: string }> | null
    chocolate: Array<{ name: string }> | null
  }
}

type SampleResultLike = {
  id: string
  sampleName: string
  contestName: string
  participantName: string
  submissionDate: string
  evaluationDate: string
  status: 'published'
  physicalEvaluation?: {
    appearance: number
    aroma: number
    defects: number
    moisture: number
    overall: number
    notes: string
  }
  sensoryEvaluation: {
    aroma: number
    flavor: number
    texture: number
    aftertaste: number
    balance: number
    overall: number
    notes: string
  }
  overallScore: number
  ranking?: number
  totalParticipants?: number
  category: string
  awards?: string[]
  judgeComments: string
  recommendations: string[]
  trackingCode: string
  internalCode: string
}

const FinalResults = () => {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<SampleResultLike | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [physicalDetail, setPhysicalDetail] = useState<null | {
    appearance: number
    aroma: number
    defects: number
    moisture: number
    overall: number
    notes: string
    raw: any
  }>(null)
  const [sensoryDetail, setSensoryDetail] = useState<null | any>(null)
  const [judgeComments, setJudgeComments] = useState<JudgeComment[]>([])
  const [judgeCommentsLoading, setJudgeCommentsLoading] = useState(false)
  const [contests, setContests] = useState<ContestDisplay[]>([])
  const [selectedContestId, setSelectedContestId] = useState<string>('all')
  const radarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadContests()
  }, [])

  useEffect(() => {
    load()
  }, [selectedContestId])

  const loadContests = async () => {
    try {
      const allContests = await ContestsService.getAllContests()
      setContests(allContests)
    } catch (err) {
      console.error('Failed to load contests:', err)
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      const contestIdFilter = selectedContestId !== 'all' ? selectedContestId : undefined
      const response = await FinalResultsService.getAggregatedResultsWithOutlierFiltering(contestIdFilter)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load results')
      }
      
      setRows(response.data || [])
    } catch (e: any) {
      console.error(e)
      toast({ title: t('finalResults.toasts.loadFailedTitle'), description: e?.message || t('finalResults.toasts.unknownError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const getProductName = (sample: Row['samples']): string => {
    return FinalResultsService.getProductName(sample)
  }

  const toSampleResultLike = (r: Row, rank: number, total: number): SampleResultLike => {
    const internalCode = FinalResultsService.generateInternalCode(r.samples.created_at, r.samples.id)
    const productName = getProductName(r.samples)
    
    return {
      id: r.sample_id,
      sampleName: productName,
      contestName: r.samples.contests?.name ?? 'Unknown Contest',
      participantName: r.samples.profiles?.name ?? 'Unknown Participant',
      submissionDate: new Date(r.samples.created_at).toLocaleDateString(),
      evaluationDate: new Date(r.latest).toLocaleDateString(),
      status: 'published',
      sensoryEvaluation: {
        aroma: r.avg_score,
        flavor: r.avg_score,
        texture: 7,
        aftertaste: r.avg_score,
        balance: r.avg_score,
        overall: r.avg_score,
        notes: 'Averaged from final evaluations'
      },
      overallScore: r.avg_score,
      ranking: rank,
      totalParticipants: total,
      category: 'Fine Flavor',
      awards: rank <= 3 ? (rank === 1 ? ['Gold Medal', 'Best in Show'] : rank === 2 ? ['Silver Medal'] : ['Bronze Medal']) : undefined,
      judgeComments: 'Aggregated final result based on evaluator scores.',
      recommendations: [],
      trackingCode: r.samples.tracking_code,
      internalCode
    }
  }

  const computePhysicalFromRow = (row: any) => {
    return FinalResultsService.computePhysicalScores(row)
  }

  const loadJudgeComments = async (sampleId: string) => {
    try {
      setJudgeCommentsLoading(true)
      
      const response = await FinalResultsService.getAllJudgeComments(sampleId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load judge comments')
      }

      setJudgeComments(response.data || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load judge comments'
      console.error('Error loading judge comments:', errorMessage)
      // Don't show error toast as it's not critical
    } finally {
      setJudgeCommentsLoading(false)
    }
  }

  const loadDetailsForSample = async (sampleId: string) => {
    try {
      setDetailLoading(true)
      setPhysicalDetail(null)
      setSensoryDetail(null)
      setJudgeComments([])

      // Load physical evaluation and final evaluation using the service
      const [physResponse, finalEvalResponse] = await Promise.all([
        FinalResultsService.getPhysicalEvaluation(sampleId),
        FinalResultsService.getLatestEvaluationForSample(sampleId)
      ])

      if (!physResponse.success) {
        console.warn('Failed to load physical evaluation:', physResponse.error)
      } else if (physResponse.data) {
        setPhysicalDetail(computePhysicalFromRow(physResponse.data))
      }

      if (!finalEvalResponse.success) {
        console.warn('Failed to load final evaluation:', finalEvalResponse.error)
      } else if (finalEvalResponse.data) {
        // Transform final evaluation data to sensory detail format
        const transformed = FinalResultsService.transformToSensoryDetail(finalEvalResponse.data)
        setSensoryDetail(transformed)
      }

      // Load judge comments in parallel
      loadJudgeComments(sampleId)
    } catch (err: any) {
      console.error(err)
      toast({ title: t('finalResults.toasts.detailsFailedTitle'), description: err?.message || t('finalResults.toasts.unknownError'), variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }

  // Build radar chart data from sensory evaluation (0–10)
  // Now uses chocolate-specific data from final_evaluations table
  const getSensoryRadarData = () => {
    const s = sensoryDetail as any
    if (!s) return [] as any[]
    
    // Calculate average values for each category
    const appearanceAvg = ((s.appearance?.color ?? 0) + (s.appearance?.gloss ?? 0) + (s.appearance?.surfaceHomogeneity ?? 0)) / 3
    const aromaAvg = ((s.aroma?.intensity ?? 0) + (s.aroma?.quality ?? 0)) / 2
    const textureAvg = ((s.texture?.smoothness ?? 0) + (s.texture?.melting ?? 0) + (s.texture?.body ?? 0)) / 3
    const flavorAvg = ((s.flavor?.sweetness ?? 0) + (s.flavor?.bitterness ?? 0) + (s.flavor?.acidity ?? 0) + (s.flavor?.intensity ?? 0)) / 4
    const aftertasteAvg = ((s.aftertaste?.persistence ?? 0) + (s.aftertaste?.quality ?? 0) + (s.aftertaste?.finalBalance ?? 0)) / 3
    
    return [
      { subject: 'Appearance', value: appearanceAvg },
      { subject: 'Aroma', value: aromaAvg },
      { subject: 'Texture', value: textureAvg },
      { subject: 'Flavor', value: flavorAvg },
      { subject: 'Aftertaste', value: aftertasteAvg },
      { subject: 'Defects', value: s.defects?.total ?? 0 },
    ]
  }

  const handleDownload = async (result: SampleResultLike) => {
    try {
      toast({ title: t('finalResults.toasts.reportGenerating'), description: t('finalResults.report.generating', { name: result.sampleName }) })
      await generateParticipantReport({
        result: result as any,
        radarChartNode: radarRef.current, // captures the sensory radar
        physicalEvalFallback: physicalDetail ?? undefined,
        language: i18n.language as 'en' | 'es',
        physicalRawDetails: physicalDetail?.raw ?? null, // include full physical details in PDF
        sensoryAttributes: sensoryDetail ?? null,
      })
      toast({ title: t('finalResults.toasts.reportReady'), description: t('finalResults.report.ready', { name: result.sampleName }) })
    } catch (err: any) {
      toast({ title: t('finalResults.toasts.reportError'), description: err?.message || t('finalResults.toasts.unknownError'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('finalResults.header.title')}</h2>
          <p className="text-muted-foreground">{t('finalResults.header.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedContestId} onValueChange={setSelectedContestId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('finalResults.contestFilter.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('finalResults.contestFilter.all')}</SelectItem>
              {contests.map((contest) => (
                <SelectItem key={contest.id} value={contest.id}>
                  {contest.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('finalResults.header.refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('finalResults.topRanking.title')}</CardTitle>
          <CardDescription>{t('finalResults.topRanking.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">{t('finalResults.topRanking.empty')}</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r, i) => {
                const isSelected = selected?.id === r.sample_id
                return (
                  <div key={r.sample_id} className="border rounded-md p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            {i === 0 ? <Trophy className="w-4 h-4 text-yellow-600" /> : <Star className="w-4 h-4 text-yellow-600" />}
                            <span className="font-medium text-[hsl(var(--chocolate-dark))] text-lg sm:text-base">{getProductName(r.samples)}</span>
                          </div>
                          <Badge variant="secondary" className="w-fit">{t('finalResults.row.rank')} #{i + 1}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{r.samples.contests?.name ?? t('finalResults.row.contestFallback')}</div>
                        <div className="text-xs text-muted-foreground">{t('finalResults.row.avg')} {r.avg_score.toFixed(2)} · {t('finalResults.row.evaluations')} {r.count}</div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                          onClick={async () => {
                            // Toggle: collapse if this item is already selected
                            if (selected?.id === r.sample_id) {
                              setSelected(null)
                              setPhysicalDetail(null)
                              setSensoryDetail(null)
                              return
                            }
                            const model = toSampleResultLike(r, i + 1, rows.length)
                            setSelected(model)
                            await loadDetailsForSample(r.sample_id)
                          }}
                        >
                          <Eye className="w-4 h-4" /> 
                          <span className="hidden sm:inline">{isSelected ? t('finalResults.actions.less') : t('finalResults.actions.view')}</span>
                          <span className="sm:hidden">{isSelected ? 'Less' : 'View'}</span>
                        </Button>
                        {isSelected && (
                          <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => handleDownload(selected!)}>
                            <Download className="w-4 h-4" /> 
                            <span className="hidden sm:inline">{t('finalResults.actions.pdf')}</span>
                            <span className="sm:hidden">PDF</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg sm:text-xl">{t('finalResults.details.radarTitle')}</CardTitle>
                              <CardDescription>{t('finalResults.details.radarDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div ref={radarRef as any} className="w-full h-[300px] sm:h-[360px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart data={getSensoryRadarData()}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 9 }} />
                                    <ReTooltip formatter={(value: number | string) => Number(value).toFixed(1)} />
                                    <Radar name="Intensity" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg sm:text-xl">{t('finalResults.details.summaryTitle')}</CardTitle>
                              <CardDescription>{t('finalResults.details.summaryDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div><span className="text-muted-foreground">{t('finalResults.details.contest')}:</span> <span className="font-medium">{selected.contestName}</span></div>
                                  <div><span className="text-muted-foreground">{t('finalResults.details.participant')}:</span> <span className="font-medium">{selected.participantName}</span></div>
                                  <div><span className="text-muted-foreground">{t('finalResults.details.submission')}:</span> <span className="font-medium">{selected.submissionDate}</span></div>
                                  <div><span className="text-muted-foreground">{t('finalResults.details.evaluation')}:</span> <span className="font-medium">{selected.evaluationDate}</span></div>
                                </div>
                                <div className="pt-2 border-t">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('finalResults.details.overall')}:</span>
                                    <span className="font-bold text-lg text-[hsl(var(--chocolate-dark))]">{selected.overallScore.toFixed(2)}</span>
                                  </div>
                                </div>
                                {selected.awards?.length ? (
                                  <div className="pt-2 border-t">
                                    <div className="text-muted-foreground mb-1">{t('finalResults.details.awards')}:</div>
                                    <div className="font-medium">{selected.awards.join(', ')}</div>
                                  </div>
                                ) : null}
                                {selected.judgeComments && (
                                  <div className="pt-2 border-t">
                                    <div className="text-muted-foreground mb-1">{t('finalResults.details.summary')}:</div>
                                    <div className="font-medium">{selected.judgeComments}</div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle>{t('finalResults.details.physicalTitle')}</CardTitle>
                              <CardDescription>{t('finalResults.details.physicalDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {detailLoading ? (
                                <div className="text-sm text-muted-foreground">{t('finalResults.details.loadingPhysical')}</div>
                              ) : physicalDetail ? (
                                <div className="space-y-4 text-sm">
                                  {/* Full raw details */}
                                  {physicalDetail.raw && (
                                    <Accordion type="multiple" className="w-full">
                                      {(() => {
                                        const r: any = physicalDetail.raw
                                        const fmt = (v: any) => (v === null || v === undefined ? '-' : Array.isArray(v) ? (v.length ? v.join(', ') : t('finalResults.common.none')) : String(v))
                                        const num = (v: any) => (v === null || v === undefined ? '-' : Number(v).toString())
                                        return (
                                          <>
                                            <AccordionItem value="aromas-humidity">
                                              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                                {t('finalResults.physical.undesirableAromas.title')} & {t('finalResults.physical.humidity.title')}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="space-y-4 pt-2">
                                                  <div>
                                                    <div className="text-muted-foreground text-xs font-medium mb-2">{t('finalResults.physical.undesirableAromas.title')}</div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                      <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.undesirableAromas.has')}</span><span className="font-medium">{r.has_undesirable_aromas ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                                      <div className="flex justify-between p-2 border rounded sm:col-span-2"><span>{t('finalResults.physical.undesirableAromas.list')}</span><span className="font-medium">{fmt(r.undesirable_aromas)}</span></div>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <div className="text-muted-foreground text-xs font-medium mb-2">{t('finalResults.physical.humidity.title')}</div>
                                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                                      <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.humidity.percentage')}</span><span className="font-medium">{num(r.percentage_humidity)}%</span></div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>

                                            <AccordionItem value="grains">
                                              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                                {t('finalResults.physical.grains.title')}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.broken')}</span><span className="font-medium">{num(r.broken_grains)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.violated')}</span><span className="font-medium">{r.violated_grains ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.flat')}</span><span className="font-medium">{num(r.flat_grains)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.affectedInsects')}</span><span className="font-medium">{num(r.affected_grains_insects)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded sm:col-span-2"><span>{t('finalResults.physical.grains.hasAffected')}</span><span className="font-medium">{r.has_affected_grains ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>

                                            <AccordionItem value="fermentation">
                                              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                                {t('finalResults.physical.fermentation.title')}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.wellFermented')}</span><span className="font-medium">{num(r.well_fermented_beans)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.lightlyFermented')}</span><span className="font-medium">{num(r.lightly_fermented_beans)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.purple')}</span><span className="font-medium">{num(r.purple_beans)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.slaty')}</span><span className="font-medium">{num(r.slaty_beans)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.internalMoldy')}</span><span className="font-medium">{num(r.internal_moldy_beans)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.overFermented')}</span><span className="font-medium">{num(r.over_fermented_beans)}</span></div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>

                                            <AccordionItem value="meta">
                                              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                                {t('finalResults.physical.meta.title')}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="grid grid-cols-1 gap-2 text-xs pt-2">
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.evaluatedBy')}</span><span className="font-medium">{fmt(r.evaluated_by)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.evaluatedAt')}</span><span className="font-medium">{r.evaluated_at ? new Date(r.evaluated_at).toLocaleString() : '-'}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.globalEvaluation')}</span><span className="font-medium capitalize">{fmt(r.global_evaluation)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.disqualificationReasons')}</span><span className="font-medium">{fmt(r.disqualification_reasons)}</span></div>
                                                  <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.warnings')}</span><span className="font-medium">{fmt(r.warnings)}</span></div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          </>
                                        )
                                      })()}
                                    </Accordion>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">{t('finalResults.details.noPhysical')}</div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Sensory Evaluation</CardTitle>
                              <CardDescription>From latest final evaluation</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {detailLoading ? (
                                <div className="text-sm text-muted-foreground">{t('finalResults.details.loadingSensory')}</div>
                              ) : sensoryDetail ? (
                                <Accordion type="multiple" className="w-full">
                                  {/* Appearance Section */}
                                  <AccordionItem value="appearance">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Appearance (5%)
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-2">
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Color</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.appearance?.color || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Gloss</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.appearance?.gloss || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Surface Homogeneity</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.appearance?.surfaceHomogeneity || 0).toFixed(1)}/10</span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Aroma Section */}
                                  <AccordionItem value="aroma">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Aroma (25%)
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Intensity</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.aroma?.intensity || 0).toFixed(1)}/10</span>
                                          </div>
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Quality</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.aroma?.quality || 0).toFixed(1)}/10</span>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-2">Specific Notes:</div>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Floral</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.floral || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Fruity</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.fruity || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Toasted</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.toasted || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Hazelnut</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.hazelnut || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Earthy</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.earthy || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Spicy</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.spicy || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Milky</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.milky || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Woody</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.aroma?.specificNotes?.woody || 0).toFixed(1)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Texture Section */}
                                  <AccordionItem value="texture">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Texture (20%)
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-2">
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Smoothness</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.texture?.smoothness || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Melting</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.texture?.melting || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Body</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.texture?.body || 0).toFixed(1)}/10</span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Flavor Section */}
                                  <AccordionItem value="flavor">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Flavor (40%)
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Sweetness</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.flavor?.sweetness || 0).toFixed(1)}/10</span>
                                          </div>
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Bitterness</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.flavor?.bitterness || 0).toFixed(1)}/10</span>
                                          </div>
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Acidity</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.flavor?.acidity || 0).toFixed(1)}/10</span>
                                          </div>
                                          <div className="flex items-center justify-between p-2 rounded border">
                                            <span className="text-xs">Intensity</span>
                                            <span className="font-semibold text-sm">{Number(sensoryDetail.flavor?.intensity || 0).toFixed(1)}/10</span>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-2">Flavor Notes:</div>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Citrus</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.citrus || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Red Fruits</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.redFruits || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Nuts</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.nuts || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Caramel</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.caramel || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Malt</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.malt || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Wood</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.wood || 0).toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                                              <span className="text-xs">Spices</span>
                                              <span className="font-semibold text-xs">{Number(sensoryDetail.flavor?.flavorNotes?.spices || 0).toFixed(1)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Aftertaste Section */}
                                  <AccordionItem value="aftertaste">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Aftertaste (10%)
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-2">
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Persistence</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.aftertaste?.persistence || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Quality</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.aftertaste?.quality || 0).toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded border">
                                          <span className="text-xs">Final Balance</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.aftertaste?.finalBalance || 0).toFixed(1)}/10</span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Defects Section */}
                                  <AccordionItem value="defects">
                                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                      Defects
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="grid grid-cols-1 gap-2 text-sm pt-2">
                                        <div className="flex items-center justify-between p-2 rounded border bg-destructive/10">
                                          <span className="text-xs">Total Defects</span>
                                          <span className="font-semibold text-sm">{Number(sensoryDetail.defects?.total || 0).toFixed(1)}/10</span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ) : (
                                <div className="text-sm text-muted-foreground">No sensory evaluation found.</div>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {/* Judge Comments Section */}
                        <Card>
                          <CardHeader>
                            <CardTitle>All Judge Comments</CardTitle>
                            <CardDescription>Comments from all judges who evaluated this sample</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {judgeCommentsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading judge comments...</span>
                              </div>
                            ) : judgeComments.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">No comments from judges yet.</p>
                            ) : (
                              <Accordion type="single" collapsible className="w-full">
                                {judgeComments.map((judge, index) => (
                                  <AccordionItem key={index} value={`judge-${index}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                      <div className="flex items-center justify-between w-full pr-4">
                                        <span className="font-medium">Judge {judge.judgeNumber}</span>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span>Quality: {judge.overall_quality.toFixed(1)}/10</span>
                                          <span>{new Date(judge.evaluationDate).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-2">
                                        {judge.flavor_comments && (
                                          <div className="p-3 bg-gray-50 rounded">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">Flavor Comments</div>
                                            <div className="text-sm">{judge.flavor_comments}</div>
                                          </div>
                                        )}
                                        {judge.producer_recommendations && (
                                          <div className="p-3 bg-gray-50 rounded">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">Producer Recommendations</div>
                                            <div className="text-sm">{judge.producer_recommendations}</div>
                                          </div>
                                        )}
                                        {judge.additional_positive && (
                                          <div className="p-3 bg-gray-50 rounded">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">Additional Positive Notes</div>
                                            <div className="text-sm">{judge.additional_positive}</div>
                                          </div>
                                        )}
                                        {!judge.flavor_comments && !judge.producer_recommendations && !judge.additional_positive && (
                                          <p className="text-sm text-muted-foreground italic">No comments provided by this judge.</p>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FinalResults