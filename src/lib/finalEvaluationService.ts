import { supabase, type Database } from '@/lib/supabase';

type FinalEvalRow = Database['public']['Tables']['final_evaluations']['Row']
type FinalEvalInsert = Database['public']['Tables']['final_evaluations']['Insert']

// Import the SensoryEvaluationResult type from the form
import type { SensoryEvaluationResult } from '@/components/dashboard/SensoryEvaluationForm';

type SaveFinalEvaluationPayload = {
  contestId: string
  sampleId: string
  overallQuality: number
  flavorComments?: string | null
  producerRecommendations?: string | null
  additionalPositive?: string | null
  // defects are relevant for chocolate evaluation too
  defectsTotal?: number | null
  // chocolate-specific attributes
  chocolate?: {
    appearance?: {
      color?: number | null
      gloss?: number | null
      surfaceHomogeneity?: number | null
    }
    aroma?: {
      aromaIntensity?: number | null
      aromaQuality?: number | null
      specificNotes?: {
        floral?: number | null
        fruity?: number | null
        toasted?: number | null
        hazelnut?: number | null
        earthy?: number | null
        spicy?: number | null
        milky?: number | null
        woody?: number | null
      }
    }
    texture?: {
      smoothness?: number | null
      melting?: number | null
      body?: number | null
    }
    flavor?: {
      sweetness?: number | null
      bitterness?: number | null
      acidity?: number | null
      flavorIntensity?: number | null
      flavorNotes?: {
        citrus?: number | null
        redFruits?: number | null
        nuts?: number | null
        caramel?: number | null
        malt?: number | null
        wood?: number | null
        spices?: number | null
      }
    }
    aftertaste?: {
      persistence?: number | null
      aftertasteQuality?: number | null
      finalBalance?: number | null
    }
  }
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
        defects_total: e.defectsTotal ?? null,
        // Chocolate-specific attributes
        chocolate_appearance_color: e.chocolate?.appearance?.color ?? null,
        chocolate_appearance_gloss: e.chocolate?.appearance?.gloss ?? null,
        chocolate_appearance_surface_homogeneity: e.chocolate?.appearance?.surfaceHomogeneity ?? null,
        chocolate_aroma_intensity: e.chocolate?.aroma?.aromaIntensity ?? null,
        chocolate_aroma_quality: e.chocolate?.aroma?.aromaQuality ?? null,
        chocolate_aroma_floral: e.chocolate?.aroma?.specificNotes?.floral ?? null,
        chocolate_aroma_fruity: e.chocolate?.aroma?.specificNotes?.fruity ?? null,
        chocolate_aroma_toasted: e.chocolate?.aroma?.specificNotes?.toasted ?? null,
        chocolate_aroma_hazelnut: e.chocolate?.aroma?.specificNotes?.hazelnut ?? null,
        chocolate_aroma_earthy: e.chocolate?.aroma?.specificNotes?.earthy ?? null,
        chocolate_aroma_spicy: e.chocolate?.aroma?.specificNotes?.spicy ?? null,
        chocolate_aroma_milky: e.chocolate?.aroma?.specificNotes?.milky ?? null,
        chocolate_aroma_woody: e.chocolate?.aroma?.specificNotes?.woody ?? null,
        chocolate_texture_smoothness: e.chocolate?.texture?.smoothness ?? null,
        chocolate_texture_melting: e.chocolate?.texture?.melting ?? null,
        chocolate_texture_body: e.chocolate?.texture?.body ?? null,
        chocolate_flavor_sweetness: e.chocolate?.flavor?.sweetness ?? null,
        chocolate_flavor_bitterness: e.chocolate?.flavor?.bitterness ?? null,
        chocolate_flavor_acidity: e.chocolate?.flavor?.acidity ?? null,
        chocolate_flavor_intensity: e.chocolate?.flavor?.flavorIntensity ?? null,
        chocolate_flavor_citrus: e.chocolate?.flavor?.flavorNotes?.citrus ?? null,
        chocolate_flavor_red_fruits: e.chocolate?.flavor?.flavorNotes?.redFruits ?? null,
        chocolate_flavor_nuts: e.chocolate?.flavor?.flavorNotes?.nuts ?? null,
        chocolate_flavor_caramel: e.chocolate?.flavor?.flavorNotes?.caramel ?? null,
        chocolate_flavor_malt: e.chocolate?.flavor?.flavorNotes?.malt ?? null,
        chocolate_flavor_wood: e.chocolate?.flavor?.flavorNotes?.wood ?? null,
        chocolate_flavor_spices: e.chocolate?.flavor?.flavorNotes?.spices ?? null,
        chocolate_aftertaste_persistence: e.chocolate?.aftertaste?.persistence ?? null,
        chocolate_aftertaste_quality: e.chocolate?.aftertaste?.aftertasteQuality ?? null,
        chocolate_aftertaste_final_balance: e.chocolate?.aftertaste?.finalBalance ?? null,
      }

      const { error } = await supabase
        .from('final_evaluations')
        .upsert(insert, {
          onConflict: 'sample_id,evaluator_id'
        })
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

  static async getForSampleAndEvaluator(sampleId: string, evaluatorId: string) {
    try {
      const { data, error } = await supabase
        .from('final_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
        .eq('evaluator_id', evaluatorId)
        .single()
      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
      return { success: true, data: data || null } as const
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch final evaluation' } as const
    }
  }
}