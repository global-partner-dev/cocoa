import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { RefreshCw, Trophy, Star, Eye, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import { generateParticipantReport } from '@/lib/pdfReport'
import { useTranslation } from 'react-i18next'
import { ContestsService, type ContestDisplay } from '@/lib/contestsService'
import { ResultsService, JudgeComment } from '@/lib/resultsService'

// Aggregates final evaluations and provides a details panel with radar + PDF like ParticipantResults

type Row = {
  sample_id: string
  avg_score: number
  count: number
  latest: string
  samples: {
    id: string
    tracking_code: string
    created_at: string
    contests: { id: string; name: string }
    profiles: { name: string | null }
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
      let query = supabase
        .from('final_evaluations')
        .select(`
          sample_id,
          overall_quality,
          evaluation_date,
          sample:sample_id!inner (
            id,
            tracking_code,
            created_at,
            contest_id,
            contests (
              id,
              name
            ),
            profiles (
              name
            )
          )
        `)
      
      if (selectedContestId !== 'all') {
        query = query.eq('sample.contest_id', selectedContestId)
      }
      
      const { data, error } = await query
      if (error) throw error

      const map = new Map<string, { sum: number; count: number; latest: string; row: any }>()
      for (const r of (data || [])) {
        const key = (r as any).sample_id as string
        const prev = map.get(key)
        const score = Number((r as any).overall_quality || 0)
        const date = (r as any).evaluation_date || (r as any).created_at
        if (!prev) {
          map.set(key, { sum: score, count: 1, latest: date, row: r })
        } else {
          const latest = new Date(date) > new Date(prev.latest) ? date : prev.latest
          map.set(key, { sum: prev.sum + score, count: prev.count + 1, latest, row: r })
        }
      }
      const arr: Row[] = Array.from(map.entries()).map(([sample_id, v]) => ({
        sample_id,
        avg_score: v.count ? v.sum / v.count : 0,
        count: v.count,
        latest: v.latest,
        samples: (v.row as any).sample,
      }))
      arr.sort((a, b) => b.avg_score - a.avg_score)
      setRows(arr)
    } catch (e: any) {
      console.error(e)
      toast({ title: t('finalResults.toasts.loadFailedTitle'), description: e?.message || t('finalResults.toasts.unknownError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toSampleResultLike = (r: Row, rank: number, total: number): SampleResultLike => {
    const internalCode = generateInternalCode(r.samples.created_at, r.samples.id)
    return {
      id: r.sample_id,
      sampleName: `Sample ${internalCode}`,
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

  const generateInternalCode = (createdAt: string, id: string) => {
    const date = new Date(createdAt)
    const y = date.getFullYear().toString().slice(-2)
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const shortId = id.replace(/[^a-f0-9]/gi, '').slice(0, 6).toUpperCase()
    return `${y}${m}${d}-${shortId}`
  }

  const computePhysicalFromRow = (row: any) => {
    const appearance = Math.max(0, Math.min(10, (Number(row.well_fermented_beans || 0) / 10) - 0.1 * (Number(row.slaty_beans || 0) + Number(row.purple_beans || 0))))
    const aroma = Math.max(0, Math.min(10, 7.5 - Math.max(0, Number(row.percentage_humidity || 0) - 7) * 0.5 - (row.has_undesirable_aromas ? 2 : 0)))
    const defectsRaw = Number(row.broken_grains || 0) + Number(row.affected_grains_insects || 0) + Number(row.internal_moldy_beans || 0) + Number(row.over_fermented_beans || 0) + Number(row.slaty_beans || 0) + Number(row.purple_beans || 0)
    const defects = Math.min(10, Math.round(defectsRaw * 10) / 10)
    const moisture = Math.max(0, Math.min(10, 10 - Math.abs(7 - Number(row.percentage_humidity || 0)) * 2))
    const overall = Math.max(0, Math.min(10, (appearance * 0.45 + aroma * 0.25 + moisture * 0.3) - defects * 0.1))
    return { appearance, aroma, defects, moisture, overall, notes: String(row.notes || ''), raw: row }
  }

  const loadJudgeComments = async (sampleId: string) => {
    try {
      setJudgeCommentsLoading(true)
      
      const response = await ResultsService.getAllJudgeComments(sampleId)
      
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

      const [phys, sens] = await Promise.all([
        supabase
          .from('physical_evaluations')
          .select('*')
          .eq('sample_id', sampleId)
          .order('evaluated_at', { ascending: false })
          .limit(1),
        supabase
          .from('final_evaluations')
          .select('*')
          .eq('sample_id', sampleId)
          .order('evaluation_date', { ascending: false })
          .limit(1)
      ])

      if (phys.error) throw phys.error
      if (sens.error) throw sens.error

      if (phys.data && phys.data.length) {
        setPhysicalDetail(computePhysicalFromRow(phys.data[0]))
      }

      if (sens.data && sens.data.length) {
        const e = sens.data[0] as any
        setSensoryDetail({
          cacao: { value: e.cacao || 0 },
          acidity: { total: e.acidity_total || 0, children: { frutal: e.acidity_frutal || 0, acetic: e.acidity_acetic || 0, lactic: e.acidity_lactic || 0, mineral_butyric: e.acidity_mineral_butyric || 0 } },
          fresh_fruit: { total: e.fresh_fruit_total || 0, children: { berries: e.fresh_fruit_berries || 0, citrus: e.fresh_fruit_citrus || 0, yellow_pulp: e.fresh_fruit_yellow_pulp || 0, dark: e.fresh_fruit_dark || 0, tropical: e.fresh_fruit_tropical || 0 } },
          brown_fruit: { total: e.brown_fruit_total || 0, children: { dry: e.brown_fruit_dry || 0, brown: e.brown_fruit_brown || 0, overripe: e.brown_fruit_overripe || 0 } },
          vegetal: { total: e.vegetal_total || 0, children: { grass_herb: e.vegetal_grass_herb || 0, earthy: e.vegetal_earthy || 0 } },
          floral: { total: e.floral_total || 0, children: { orange_blossom: e.floral_orange_blossom || 0, flowers: e.floral_flowers || 0 } },
          wood: { total: e.wood_total || 0, children: { light: e.wood_light || 0, dark: e.wood_dark || 0, resin: e.wood_resin || 0 } },
          spice: { total: e.spice_total || 0, children: { spices: e.spice_spices || 0, tobacco: e.spice_tobacco || 0, umami: e.spice_umami || 0 } },
          nut: { total: e.nut_total || 0, children: { kernel: e.nut_kernel || 0, skin: e.nut_skin || 0 } },
          caramel_panela: { value: e.caramel_panela || 0 },
          bitterness: { value: e.bitterness || 0 },
          astringency: { value: e.astringency || 0 },
          roast_degree: { total: e.roast_degree || 0, children: { lactic: e.roast_lactic || 0, mineral_butyric: e.roast_mineral_butyric || 0 } },
          defects: { total: e.defects_total || 0, children: { dirty: e.defects_dirty || 0, animal: e.defects_animal || 0, rotten: e.defects_rotten || 0, smoke: e.defects_smoke || 0, humid: e.defects_humid || 0, moldy: e.defects_moldy || 0, overfermented: e.defects_overfermented || 0, other: e.defects_other || 0 } },
        })
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
  const getSensoryRadarData = () => {
    const s = sensoryDetail as any
    if (!s) return [] as any[]
    return [
      { subject: 'Cacao', value: s.cacao?.value ?? 0 },
      { subject: 'Acidity (Total)', value: s.acidity?.total ?? 0 },
      { subject: 'Fresh Fruit (Total)', value: s.fresh_fruit?.total ?? 0 },
      { subject: 'Brown Fruit (Total)', value: s.brown_fruit?.total ?? 0 },
      { subject: 'Vegetal (Total)', value: s.vegetal?.total ?? 0 },
      { subject: 'Floral (Total)', value: s.floral?.total ?? 0 },
      { subject: 'Wood (Total)', value: s.wood?.total ?? 0 },
      { subject: 'Spice (Total)', value: s.spice?.total ?? 0 },
      { subject: 'Nut (Total)', value: s.nut?.total ?? 0 },
      { subject: 'Caramel/Panela', value: s.caramel_panela?.value ?? 0 },
      { subject: 'Bitterness', value: s.bitterness?.value ?? 0 },
      { subject: 'Astringency', value: s.astringency?.value ?? 0 },
      { subject: 'Roast Degree', value: s.roast_degree?.total ?? 0 },
      { subject: 'Defects (Total)', value: s.defects?.total ?? 0 },
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
                            <span className="font-medium text-[hsl(var(--chocolate-dark))] text-lg sm:text-base">{r.samples.tracking_code}</span>
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
                                    <div className="space-y-3 pt-3 border-t">
                                      <h4 className="font-medium">{t('finalResults.details.fullPhysicalTitle')}</h4>
                                      {(() => {
                                        const r: any = physicalDetail.raw
                                        const fmt = (v: any) => (v === null || v === undefined ? '-' : Array.isArray(v) ? (v.length ? v.join(', ') : t('finalResults.common.none')) : String(v))
                                        const num = (v: any) => (v === null || v === undefined ? '-' : Number(v).toString())
                                        return (
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                              <div className="text-muted-foreground text-xs font-medium">{t('finalResults.physical.undesirableAromas.title')}</div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.undesirableAromas.has')}</span><span className="font-medium">{r.has_undesirable_aromas ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                                <div className="flex justify-between p-2 border rounded sm:col-span-2"><span>{t('finalResults.physical.undesirableAromas.list')}</span><span className="font-medium">{fmt(r.undesirable_aromas)}</span></div>
                                              </div>

                                              <div className="text-muted-foreground text-xs font-medium mt-4">{t('finalResults.physical.humidity.title')}</div>
                                              <div className="grid grid-cols-1 gap-2 text-xs">
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.humidity.percentage')}</span><span className="font-medium">{num(r.percentage_humidity)}%</span></div>
                                              </div>

                                              <div className="text-muted-foreground text-xs font-medium mt-4">{t('finalResults.physical.grains.title')}</div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.broken')}</span><span className="font-medium">{num(r.broken_grains)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.violated')}</span><span className="font-medium">{r.violated_grains ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.flat')}</span><span className="font-medium">{num(r.flat_grains)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.grains.affectedInsects')}</span><span className="font-medium">{num(r.affected_grains_insects)}</span></div>
                                                <div className="flex justify-between p-2 border rounded sm:col-span-2"><span>{t('finalResults.physical.grains.hasAffected')}</span><span className="font-medium">{r.has_affected_grains ? t('finalResults.common.yes') : t('finalResults.common.no')}</span></div>
                                              </div>
                                            </div>

                                            <div className="space-y-4">
                                              <div className="text-muted-foreground text-xs font-medium">{t('finalResults.physical.fermentation.title')}</div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.wellFermented')}</span><span className="font-medium">{num(r.well_fermented_beans)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.lightlyFermented')}</span><span className="font-medium">{num(r.lightly_fermented_beans)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.purple')}</span><span className="font-medium">{num(r.purple_beans)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.slaty')}</span><span className="font-medium">{num(r.slaty_beans)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.internalMoldy')}</span><span className="font-medium">{num(r.internal_moldy_beans)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.fermentation.overFermented')}</span><span className="font-medium">{num(r.over_fermented_beans)}</span></div>
                                              </div>

                                              <div className="text-muted-foreground text-xs font-medium mt-4">{t('finalResults.physical.meta.title')}</div>
                                              <div className="grid grid-cols-1 gap-2 text-xs">
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.evaluatedBy')}</span><span className="font-medium">{fmt(r.evaluated_by)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.evaluatedAt')}</span><span className="font-medium">{r.evaluated_at ? new Date(r.evaluated_at).toLocaleString() : '-'}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.globalEvaluation')}</span><span className="font-medium capitalize">{fmt(r.global_evaluation)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.disqualificationReasons')}</span><span className="font-medium">{fmt(r.disqualification_reasons)}</span></div>
                                                <div className="flex justify-between p-2 border rounded"><span>{t('finalResults.physical.meta.warnings')}</span><span className="font-medium">{fmt(r.warnings)}</span></div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                    </div>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                  {[{ k: 'cacao', label: t('finalResults.sensory.cacao'), v: sensoryDetail.cacao?.value || 0 }, { k: 'acidity', label: t('finalResults.sensory.acidityTotal'), v: sensoryDetail.acidity?.total || 0 }, { k: 'fresh_fruit', label: t('finalResults.sensory.freshFruitTotal'), v: sensoryDetail.fresh_fruit?.total || 0 }, { k: 'brown_fruit', label: t('finalResults.sensory.brownFruitTotal'), v: sensoryDetail.brown_fruit?.total || 0 }, { k: 'floral', label: t('finalResults.sensory.floralTotal'), v: sensoryDetail.floral?.total || 0 }, { k: 'vegetal', label: t('finalResults.sensory.vegetalTotal'), v: sensoryDetail.vegetal?.total || 0 }, { k: 'wood', label: t('finalResults.sensory.woodTotal'), v: sensoryDetail.wood?.total || 0 }, { k: 'spice', label: t('finalResults.sensory.spiceTotal'), v: sensoryDetail.spice?.total || 0 }, { k: 'nut', label: t('finalResults.sensory.nutTotal'), v: sensoryDetail.nut?.total || 0 }, { k: 'caramel_panela', label: t('finalResults.sensory.caramelPanela'), v: sensoryDetail.caramel_panela?.value || 0 }, { k: 'bitterness', label: t('finalResults.sensory.bitterness'), v: sensoryDetail.bitterness?.value || 0 }, { k: 'astringency', label: t('finalResults.sensory.astringency'), v: sensoryDetail.astringency?.value || 0 }, { k: 'roast_degree', label: t('finalResults.sensory.roastDegree'), v: sensoryDetail.roast_degree?.total || 0 }, { k: 'defects', label: t('finalResults.sensory.defectsTotal'), v: sensoryDetail.defects?.total || 0 }].map((item) => (
                                    <div key={item.k} className="flex items-center justify-between p-3 rounded border">
                                      <span className="text-xs sm:text-sm truncate">{item.label}</span>
                                      <span className="font-semibold text-sm">{Number(item.v).toFixed(1)}/10</span>
                                    </div>
                                  ))}
                                </div>
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
                                        {judge.sample_notes && (
                                          <div className="p-3 bg-gray-50 rounded">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">Sample Notes</div>
                                            <div className="text-sm">{judge.sample_notes}</div>
                                          </div>
                                        )}
                                        {judge.texture_notes && (
                                          <div className="p-3 bg-gray-50 rounded">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">Texture Notes</div>
                                            <div className="text-sm">{judge.texture_notes}</div>
                                          </div>
                                        )}
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
                                        {!judge.sample_notes && !judge.texture_notes && !judge.flavor_comments && 
                                         !judge.producer_recommendations && !judge.additional_positive && (
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