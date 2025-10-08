import { supabase } from './supabase';
import { filterOutliers, FilteredResult, OutlierConfig, DEFAULT_OUTLIER_CONFIG } from './outlierDetection';

/**
 * Final Results Service
 * Handles data fetching and processing for the FinalResults dashboard component
 * Uses data from final_evaluations table
 */

export interface FinalEvaluationData {
  id: string;
  sample_id: string;
  evaluator_id: string;
  contest_id: string;
  evaluation_date: string;
  overall_quality: number;
  flavor_comments: string | null;
  producer_recommendations: string | null;
  additional_positive: string | null;
  defects_total: number | null;
  // Chocolate-specific fields
  chocolate_appearance_color: number | null;
  chocolate_appearance_gloss: number | null;
  chocolate_appearance_surface_homogeneity: number | null;
  chocolate_aroma_intensity: number | null;
  chocolate_aroma_quality: number | null;
  chocolate_aroma_floral: number | null;
  chocolate_aroma_fruity: number | null;
  chocolate_aroma_toasted: number | null;
  chocolate_aroma_hazelnut: number | null;
  chocolate_aroma_earthy: number | null;
  chocolate_aroma_spicy: number | null;
  chocolate_aroma_milky: number | null;
  chocolate_aroma_woody: number | null;
  chocolate_texture_smoothness: number | null;
  chocolate_texture_melting: number | null;
  chocolate_texture_body: number | null;
  chocolate_flavor_sweetness: number | null;
  chocolate_flavor_bitterness: number | null;
  chocolate_flavor_acidity: number | null;
  chocolate_flavor_intensity: number | null;
  chocolate_flavor_citrus: number | null;
  chocolate_flavor_red_fruits: number | null;
  chocolate_flavor_nuts: number | null;
  chocolate_flavor_caramel: number | null;
  chocolate_flavor_malt: number | null;
  chocolate_flavor_wood: number | null;
  chocolate_flavor_spices: number | null;
  chocolate_aftertaste_persistence: number | null;
  chocolate_aftertaste_quality: number | null;
  chocolate_aftertaste_final_balance: number | null;
  created_at: string;
  updated_at: string;
}

export interface SampleInfo {
  id: string;
  tracking_code: string;
  created_at: string;
  category: string | null;
  contest_id: string;
  contests: {
    id: string;
    name: string;
  } | null;
  profiles: {
    name: string | null;
  } | null;
  cocoa_bean: Array<{ farm_name: string }> | null;
  cocoa_liquor: Array<{ name: string }> | null;
  chocolate: Array<{ name: string }> | null;
}

export interface AggregatedFinalResult {
  sample_id: string;
  avg_score: number;
  count: number;
  latest: string;
  samples: SampleInfo;
  // Outlier filtering metadata
  outlierFilteringApplied?: boolean;
  outlierMetadata?: {
    originalScore: number;
    filteredScore: number;
    totalEvaluations: number;
    outliersDetected: number;
    standardDeviation: number;
  };
}

export interface FinalResultsServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FinalResultsService {
  /**
   * Get aggregated final evaluation results
   * Groups by sample_id and calculates average scores
   * @param contestId - Optional contest ID to filter results
   */
  static async getAggregatedResults(contestId?: string): Promise<FinalResultsServiceResponse<AggregatedFinalResult[]>> {
    try {
      console.log(`Fetching aggregated final results${contestId ? ` for contest ${contestId}` : ''}...`);
      
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
            category,
            contests (
              id,
              name
            ),
            profiles (
              name
            ),
            cocoa_bean (
              farm_name
            ),
            cocoa_liquor (
              name
            ),
            chocolate (
              name
            )
          )
        `);
      
      if (contestId) {
        query = query.eq('sample.contest_id', contestId);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by sample_id
      const map = new Map<string, { sum: number; count: number; latest: string; row: any }>();
      for (const r of (data || [])) {
        const key = (r as any).sample_id as string;
        const prev = map.get(key);
        const score = Number((r as any).overall_quality || 0);
        const date = (r as any).evaluation_date || (r as any).created_at;
        
        if (!prev) {
          map.set(key, { sum: score, count: 1, latest: date, row: r });
        } else {
          const latest = new Date(date) > new Date(prev.latest) ? date : prev.latest;
          map.set(key, { sum: prev.sum + score, count: prev.count + 1, latest, row: r });
        }
      }

      // Convert to array and calculate averages
      const results: AggregatedFinalResult[] = Array.from(map.entries()).map(([sample_id, v]) => ({
        sample_id,
        avg_score: v.count ? v.sum / v.count : 0,
        count: v.count,
        latest: v.latest,
        samples: (v.row as any).sample,
      }));

      // Sort by average score descending
      results.sort((a, b) => b.avg_score - a.avg_score);

      console.log(`Successfully fetched ${results.length} aggregated final results`);
      return { success: true, data: results };
      
    } catch (error) {
      console.error('Error in getAggregatedResults:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch aggregated results' 
      };
    }
  }

  /**
   * Get aggregated final evaluation results with outlier filtering
   * Groups by sample_id and calculates average scores with outlier detection
   * @param contestId - Optional contest ID to filter results
   * @param outlierConfig - Configuration for outlier detection (optional, uses defaults if not provided)
   */
  static async getAggregatedResultsWithOutlierFiltering(
    contestId?: string,
    outlierConfig: Partial<OutlierConfig> = {}
  ): Promise<FinalResultsServiceResponse<AggregatedFinalResult[]>> {
    try {
      console.log(`Fetching aggregated final results with outlier filtering${contestId ? ` for contest ${contestId}` : ''}...`);
      
      let query = supabase
        .from('final_evaluations')
        .select(`
          id,
          sample_id,
          overall_quality,
          evaluation_date,
          sample:sample_id!inner (
            id,
            tracking_code,
            created_at,
            contest_id,
            category,
            contests (
              id,
              name
            ),
            profiles (
              name
            ),
            cocoa_bean (
              farm_name
            ),
            cocoa_liquor (
              name
            ),
            chocolate (
              name
            )
          )
        `);
      
      if (contestId) {
        query = query.eq('sample.contest_id', contestId);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Group evaluations by sample_id
      const sampleEvaluationsMap = new Map<string, Array<{ id: string; score: number; date: string; sample: any }>>();
      
      for (const r of (data || [])) {
        const sampleId = (r as any).sample_id as string;
        const score = Number((r as any).overall_quality || 0);
        const date = (r as any).evaluation_date || (r as any).created_at;
        const sample = (r as any).sample;
        
        if (!sampleEvaluationsMap.has(sampleId)) {
          sampleEvaluationsMap.set(sampleId, []);
        }
        
        sampleEvaluationsMap.get(sampleId)!.push({
          id: (r as any).id,
          score,
          date,
          sample
        });
      }

      // Apply outlier filtering to each sample
      const results: AggregatedFinalResult[] = [];

      for (const [sampleId, evals] of sampleEvaluationsMap.entries()) {
        // Apply outlier filtering
        const evaluationScores = evals.map(e => ({ score: e.score, id: e.id }));
        const filterResult = filterOutliers(evaluationScores, outlierConfig);
        
        // Get latest evaluation date
        const latestDate = evals.reduce((latest, curr) => {
          return new Date(curr.date) > new Date(latest) ? curr.date : latest;
        }, evals[0].date);
        
        results.push({
          sample_id: sampleId,
          avg_score: filterResult.filteredAverage,
          count: filterResult.totalCount,
          latest: latestDate,
          samples: evals[0].sample,
          outlierFilteringApplied: true,
          outlierMetadata: {
            originalScore: filterResult.originalAverage,
            filteredScore: filterResult.filteredAverage,
            totalEvaluations: filterResult.totalCount,
            outliersDetected: filterResult.outlierCount,
            standardDeviation: filterResult.standardDeviation
          }
        });
      }

      // Sort by filtered average score descending
      results.sort((a, b) => b.avg_score - a.avg_score);

      console.log(`Successfully fetched ${results.length} aggregated final results with outlier filtering`);
      return { success: true, data: results };
      
    } catch (error) {
      console.error('Error in getAggregatedResultsWithOutlierFiltering:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch aggregated results with outlier filtering' 
      };
    }
  }

  /**
   * Get detailed final evaluation data for a specific sample
   * Returns the latest evaluation
   * @param sampleId - Sample ID
   */
  static async getLatestEvaluationForSample(sampleId: string): Promise<FinalResultsServiceResponse<FinalEvaluationData | null>> {
    try {
      console.log(`Fetching latest final evaluation for sample: ${sampleId}`);
      
      const { data, error } = await supabase
        .from('final_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
        .order('evaluation_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      
      console.log(`Successfully fetched final evaluation for sample ${sampleId}`);
      return { success: true, data: data || null };
      
    } catch (error) {
      console.error('Error in getLatestEvaluationForSample:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch final evaluation' 
      };
    }
  }

  /**
   * Get all final evaluations for a specific sample
   * @param sampleId - Sample ID
   */
  static async getAllEvaluationsForSample(sampleId: string): Promise<FinalResultsServiceResponse<FinalEvaluationData[]>> {
    try {
      console.log(`Fetching all final evaluations for sample: ${sampleId}`);
      
      const { data, error } = await supabase
        .from('final_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
        .order('evaluation_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Successfully fetched ${data?.length || 0} final evaluations for sample ${sampleId}`);
      return { success: true, data: data || [] };
      
    } catch (error) {
      console.error('Error in getAllEvaluationsForSample:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch final evaluations' 
      };
    }
  }

  /**
   * Get physical evaluation for a sample
   * @param sampleId - Sample ID
   */
  static async getPhysicalEvaluation(sampleId: string): Promise<FinalResultsServiceResponse<any>> {
    try {
      console.log(`Fetching physical evaluation for sample: ${sampleId}`);
      
      const { data, error } = await supabase
        .from('physical_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
        .order('evaluated_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      const result = data && data.length > 0 ? data[0] : null;
      console.log(`Successfully fetched physical evaluation for sample ${sampleId}`);
      return { success: true, data: result };
      
    } catch (error) {
      console.error('Error in getPhysicalEvaluation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch physical evaluation' 
      };
    }
  }

  /**
   * Helper function to extract product name from sample data
   */
  static getProductName(sample: SampleInfo): string {
    const category = sample.category;
    
    if (category === 'cocoa_bean' && sample.cocoa_bean && sample.cocoa_bean.length > 0) {
      return sample.cocoa_bean[0].farm_name || 'Unknown Bean';
    } else if (category === 'cocoa_liquor' && sample.cocoa_liquor && sample.cocoa_liquor.length > 0) {
      return sample.cocoa_liquor[0].name || 'Unknown Liquor';
    } else if (category === 'chocolate' && sample.chocolate && sample.chocolate.length > 0) {
      return sample.chocolate[0].name || 'Unknown Chocolate';
    }
    
    // Fallback to internal code if no product name found
    const internalCode = this.generateInternalCode(sample.created_at, sample.id);
    return `Sample ${internalCode}`;
  }

  /**
   * Generate internal code from date and ID
   */
  static generateInternalCode(createdAt: string, id: string): string {
    const date = new Date(createdAt);
    const y = date.getFullYear().toString().slice(-2);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const shortId = id.replace(/[^a-f0-9]/gi, '').slice(0, 6).toUpperCase();
    return `${y}${m}${d}-${shortId}`;
  }

  /**
   * Compute physical evaluation scores from raw data
   */
  static computePhysicalScores(raw: any) {
    const appearance = Math.max(0, Math.min(10, (Number(raw.well_fermented_beans || 0) / 10) - 0.1 * (Number(raw.slaty_beans || 0) + Number(raw.purple_beans || 0))));
    const aroma = Math.max(0, Math.min(10, 7.5 - Math.max(0, Number(raw.percentage_humidity || 0) - 7) * 0.5 - (raw.has_undesirable_aromas ? 2 : 0)));
    const defectsRaw = Number(raw.broken_grains || 0) + Number(raw.affected_grains_insects || 0) + Number(raw.internal_moldy_beans || 0) + Number(raw.over_fermented_beans || 0) + Number(raw.slaty_beans || 0) + Number(raw.purple_beans || 0);
    const defects = Math.min(10, Math.round(defectsRaw * 10) / 10);
    const moisture = Math.max(0, Math.min(10, 10 - Math.abs(7 - Number(raw.percentage_humidity || 0)) * 2));
    const overall = Math.max(0, Math.min(10, (appearance * 0.45 + aroma * 0.25 + moisture * 0.3) - defects * 0.1));
    
    return { 
      appearance, 
      aroma, 
      defects, 
      moisture, 
      overall, 
      notes: String(raw.notes || ''), 
      raw 
    };
  }

  /**
   * Transform final evaluation data to sensory detail format
   * This creates a structured object for display in the UI
   */
  static transformToSensoryDetail(evaluation: FinalEvaluationData) {
    return {
      // Chocolate Appearance
      appearance: {
        color: evaluation.chocolate_appearance_color || 0,
        gloss: evaluation.chocolate_appearance_gloss || 0,
        surfaceHomogeneity: evaluation.chocolate_appearance_surface_homogeneity || 0,
      },
      // Chocolate Aroma
      aroma: {
        intensity: evaluation.chocolate_aroma_intensity || 0,
        quality: evaluation.chocolate_aroma_quality || 0,
        specificNotes: {
          floral: evaluation.chocolate_aroma_floral || 0,
          fruity: evaluation.chocolate_aroma_fruity || 0,
          toasted: evaluation.chocolate_aroma_toasted || 0,
          hazelnut: evaluation.chocolate_aroma_hazelnut || 0,
          earthy: evaluation.chocolate_aroma_earthy || 0,
          spicy: evaluation.chocolate_aroma_spicy || 0,
          milky: evaluation.chocolate_aroma_milky || 0,
          woody: evaluation.chocolate_aroma_woody || 0,
        },
      },
      // Chocolate Texture
      texture: {
        smoothness: evaluation.chocolate_texture_smoothness || 0,
        melting: evaluation.chocolate_texture_melting || 0,
        body: evaluation.chocolate_texture_body || 0,
      },
      // Chocolate Flavor
      flavor: {
        sweetness: evaluation.chocolate_flavor_sweetness || 0,
        bitterness: evaluation.chocolate_flavor_bitterness || 0,
        acidity: evaluation.chocolate_flavor_acidity || 0,
        intensity: evaluation.chocolate_flavor_intensity || 0,
        flavorNotes: {
          citrus: evaluation.chocolate_flavor_citrus || 0,
          redFruits: evaluation.chocolate_flavor_red_fruits || 0,
          nuts: evaluation.chocolate_flavor_nuts || 0,
          caramel: evaluation.chocolate_flavor_caramel || 0,
          malt: evaluation.chocolate_flavor_malt || 0,
          wood: evaluation.chocolate_flavor_wood || 0,
          spices: evaluation.chocolate_flavor_spices || 0,
        },
      },
      // Chocolate Aftertaste
      aftertaste: {
        persistence: evaluation.chocolate_aftertaste_persistence || 0,
        quality: evaluation.chocolate_aftertaste_quality || 0,
        finalBalance: evaluation.chocolate_aftertaste_final_balance || 0,
      },
      // Defects
      defects: {
        total: evaluation.defects_total || 0,
      },
    };
  }

  /**
   * Get all judge comments from final evaluations for a specific sample
   * @param sampleId - Sample ID to fetch comments for
   */
  static async getAllJudgeComments(sampleId: string): Promise<FinalResultsServiceResponse<any[]>> {
    try {
      console.log(`Fetching all judge comments from final_evaluations for sample: ${sampleId}`);

      const { data: evaluations, error } = await supabase
        .from('final_evaluations')
        .select(`
          id,
          evaluation_date,
          flavor_comments,
          producer_recommendations,
          additional_positive,
          overall_quality,
          created_at,
          evaluator_id
        `)
        .eq('sample_id', sampleId)
        .order('evaluation_date', { ascending: true });

      if (error) {
        console.error('Error fetching judge comments from final_evaluations:', error);
        throw error;
      }

      if (!evaluations || evaluations.length === 0) {
        console.log('No judge comments found in final_evaluations for sample');
        return { success: true, data: [] };
      }

      // Transform to anonymized judge comments
      const comments = evaluations.map((evaluation, index) => ({
        judgeNumber: index + 1,
        evaluationDate: evaluation.evaluation_date || evaluation.created_at,
        flavor_comments: evaluation.flavor_comments || '',
        producer_recommendations: evaluation.producer_recommendations || '',
        additional_positive: evaluation.additional_positive || '',
        overall_quality: evaluation.overall_quality || 0,
      }));

      console.log(`Successfully fetched ${comments.length} judge comments from final_evaluations`);
      return { success: true, data: comments };

    } catch (error) {
      console.error('Error in getAllJudgeComments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch judge comments'
      };
    }
  }
}