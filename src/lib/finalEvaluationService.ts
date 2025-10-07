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
  // optional breakdowns (for cocoa bean/liquor)
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
        // Cocoa bean/liquor attributes
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