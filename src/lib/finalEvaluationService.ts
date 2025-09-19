import { supabase, type Database } from '@/lib/supabase';

type FinalEvalRow = Database['public']['Tables']['final_evaluations']['Row']
type FinalEvalInsert = Database['public']['Tables']['final_evaluations']['Insert']

type SaveFinalEvaluationPayload = {
  contestId: string
  sampleId: string
  overallQuality: number
  flavorComments?: string | null
  producerRecommendations?: string | null
  additionalPositive?: string | null
  // optional breakdowns
  cacao?: number | null
  bitterness?: number | null
  astringency?: number | null
  caramelPanela?: number | null
  acidityTotal?: number | null
  freshFruitTotal?: number | null
  brownFruitTotal?: number | null
  vegetalTotal?: number | null
  floralTotal?: number | null
  woodTotal?: number | null
  spiceTotal?: number | null
  nutTotal?: number | null
  roastDegree?: number | null
  defectsTotal?: number | null
}

export class FinalEvaluationService {
  static async save(e: SaveFinalEvaluationPayload) {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Not authenticated')

      const insert: FinalEvalInsert = {
        contest_id: e.contestId,
        sample_id: e.sampleId,
        evaluator_id: user.id,
        overall_quality: e.overallQuality,
        flavor_comments: e.flavorComments ?? null,
        producer_recommendations: e.producerRecommendations ?? null,
        additional_positive: e.additionalPositive ?? null,
        cacao: e.cacao ?? null,
        bitterness: e.bitterness ?? null,
        astringency: e.astringency ?? null,
        caramel_panela: e.caramelPanela ?? null,
        acidity_total: e.acidityTotal ?? null,
        fresh_fruit_total: e.freshFruitTotal ?? null,
        brown_fruit_total: e.brownFruitTotal ?? null,
        vegetal_total: e.vegetalTotal ?? null,
        floral_total: e.floralTotal ?? null,
        wood_total: e.woodTotal ?? null,
        spice_total: e.spiceTotal ?? null,
        nut_total: e.nutTotal ?? null,
        roast_degree: e.roastDegree ?? null,
        defects_total: e.defectsTotal ?? null,
      }

      const { error } = await supabase.from('final_evaluations').insert(insert)
      if (error) throw error
      return { success: true } as const
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save final evaluation' } as const
    }
  }

  static async getForSample(sampleId: string) {
    try {
      const { data, error } = await supabase
        .from('final_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
      if (error) throw error
      return { success: true, data } as const
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch final evaluations' } as const
    }
  }
}