import { supabase } from './supabase';

export interface SampleResult {
  id: string;
  sampleName: string;
  contestId?: string; // used for final evaluations saving
  contestName: string;
  participantName: string;
  submissionDate: string;
  evaluationDate: string;
  status: 'evaluated' | 'pending_results' | 'published';
  physicalEvaluation?: {
    appearance: number;
    aroma: number;
    defects: number;
    moisture: number;
    overall: number;
    notes: string;
  };
  sensoryEvaluation: {
    aroma: number;
    flavor: number;
    texture: number;
    aftertaste: number;
    balance: number;
    overall: number;
    notes: string;
  };
  overallScore: number;
  ranking?: number;
  totalParticipants?: number;
  category: string;
  awards?: string[];
  judgeComments: string;
  recommendations: string[];
  trackingCode: string;
  internalCode: string;
}

export interface ResultsServiceResponse {
  success: boolean;
  data?: SampleResult[];
  error?: string;
}

export interface ResultsStats {
  totalSamples: number;
  evaluatedSamples: number;
  averageScore: number;
  bestScore: number;
  totalAwards: number;
}

export interface JudgeComment {
  judgeNumber: number;
  evaluationDate: string;
  sample_notes: string;
  texture_notes: string;
  flavor_comments: string;
  producer_recommendations: string;
  additional_positive: string;
  overall_quality: number;
}

export class ResultsService {
  
  /**
   * Get top 10 samples based on sensory evaluation scores
   * @param limit - Maximum number of results to return (default: 10)
   * @param contestId - Optional contest ID to filter results by specific contest
   */
  static async getTopSamplesByScore(limit: number = 10, contestId?: string): Promise<ResultsServiceResponse> {
    try {
      console.log(`Fetching top ${limit} samples by averaged scores (top_results)${contestId ? ` for contest ${contestId}` : ''}...`);
      
      // Fetch from materialized top_results, already averaged across judges per sample
      let query = supabase
        .from('top_results')
        .select(`
          sample_id,
          average_score,
          evaluations_count,
          latest_evaluation_date,
          rank,
          contest_id,
          sample:sample_id (
            id,
            tracking_code,
            status,
            category,
            created_at,
            contests (
              id,
              name,
              description
            ),
            profiles (
              name
            )
          )
        `)
        .order('rank', { ascending: true })
        .limit(limit);
      
      // Apply contest filter if provided
      if (contestId) {
        query = query.eq('contest_id', contestId);
      }
      
      const { data: top, error: terr } = await query;
      if (terr) throw terr;

      if (!top || top.length === 0) {
        return { success: true, data: [] };
      }

      // Build UI model from averaged rows
      const transformedResults: SampleResult[] = top.map((row: any) => {
        const sample = row.sample;
        const contest = sample?.contests;
        const participant = sample?.profiles;
        const contestId = contest?.id;
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);

        // overallScore uses averaged overall_quality (0-10)
        const overallScore = Number(row.average_score);

        // Keep simplified sensoryEvaluation breakdown using overallScore as balance/overall
        const sensoryEvaluation = {
          aroma: overallScore, // placeholder (we can extend later if needed)
          flavor: overallScore,
          texture: 7, // neutral placeholder
          aftertaste: overallScore,
          balance: overallScore,
          overall: overallScore,
          notes: 'Averaged from multiple judges'
        };

        return {
          id: row.sample_id,
          sampleName: `Sample ${internalCode}`,
          contestId: contestId,
          contestName: contest?.name || 'Unknown Contest',
          participantName: participant?.name || 'Unknown Participant',
          submissionDate: new Date(sample.created_at).toLocaleDateString(),
          evaluationDate: row.latest_evaluation_date ? new Date(row.latest_evaluation_date).toLocaleDateString() : new Date(sample.created_at).toLocaleDateString(),
          status: 'published' as const,
          sensoryEvaluation,
          overallScore,
          ranking: row.rank,
          totalParticipants: top.length,
          category: sample?.category || 'cocoa_bean',
          awards: row.rank <= 3 ? (row.rank === 1 ? ['Gold Medal', 'Best in Show'] : row.rank === 2 ? ['Silver Medal'] : ['Bronze Medal']) : undefined,
          judgeComments: 'Aggregated result based on multiple evaluations.',
          recommendations: [],
          trackingCode: sample.tracking_code,
          internalCode
        };
      });

      console.log(`Successfully fetched ${transformedResults.length} top samples`);
      return { success: true, data: transformedResults };
      
    } catch (error) {
      console.error('Error in getTopSamplesByScore:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch top samples' 
      };
    }
  }

  /**
   * Get all evaluated samples with their results
   * @param contestId - Optional contest ID to filter results by specific contest
   */
  static async getAllEvaluatedSamples(contestId?: string): Promise<ResultsServiceResponse> {
    try {
      console.log(`Fetching all evaluated samples${contestId ? ` for contest ${contestId}` : ''}...`);
      
      let query = supabase
        .from('sensory_evaluations')
        .select(`
          id,
          sample_id,
          overall_quality,
          evaluation_date,
          flavor_comments,
          producer_recommendations,
          additional_positive,
          verdict,
          cacao,
          bitterness,
          astringency,
          caramel_panela,
          acidity_total,
          fresh_fruit_total,
          brown_fruit_total,
          vegetal_total,
          floral_total,
          wood_total,
          spice_total,
          nut_total,
          roast_degree,
          defects_total,
          sample!inner (
            id,
            tracking_code,
            status,
            created_at,
            contest_id,
            contests (
              id,
              name,
              description
            ),
            profiles (
              name
            )
          )
        `)
        .eq('verdict', 'Approved')
        .not('overall_quality', 'is', null)
        .order('overall_quality', { ascending: false });
      
      // Apply contest filter if provided
      if (contestId) {
        query = query.eq('sample.contest_id', contestId);
      }

      const { data: results, error } = await query;

      if (error) {
        console.error('Error fetching all evaluated samples:', error);
        throw error;
      }

      if (!results || results.length === 0) {
        console.log('No evaluated samples found');
        return { success: true, data: [] };
      }

      // Use the same transformation logic as getTopSamplesByScore
      const transformedResults: SampleResult[] = results.map((result, index) => {
        const sample = result.sample as any;
        const contest = sample.contests as any;
        const participant = sample.profiles as any;
        
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);
        
        const sensoryEvaluation = {
          aroma: (result.acidity_total + result.fresh_fruit_total + result.floral_total) / 3,
          flavor: (result.cacao + result.caramel_panela + result.fresh_fruit_total + result.brown_fruit_total) / 4,
          texture: result.astringency ? (10 - result.astringency) : 7,
          aftertaste: (result.spice_total + result.nut_total + result.wood_total) / 3,
          balance: result.overall_quality,
          overall: result.overall_quality,
          notes: result.flavor_comments || 'No specific notes provided'
        };

        const recommendations: string[] = [];
        if (result.producer_recommendations) {
          recommendations.push(result.producer_recommendations);
        }
        if (result.additional_positive) {
          recommendations.push(`Positive aspect: ${result.additional_positive}`);
        }
        if (result.defects_total > 3) {
          recommendations.push('Focus on reducing defects in processing');
        }

        const awards: string[] = [];
        if (index < 3) {
          const medalTypes = ['Gold Medal', 'Silver Medal', 'Bronze Medal'];
          awards.push(medalTypes[index]);
          if (index === 0) awards.push('Best in Show');
        }
        
        if (sensoryEvaluation.aroma >= 9) awards.push('Best Aroma');
        if (sensoryEvaluation.flavor >= 9) awards.push('Best Flavor');

        return {
          id: result.id,
          sampleName: `Sample ${internalCode}`,
          contestName: contest?.name || 'Unknown Contest',
          participantName: participant?.name || 'Unknown Participant',
          submissionDate: new Date(sample.created_at).toLocaleDateString(),
          evaluationDate: new Date(result.evaluation_date).toLocaleDateString(),
          status: 'published' as const,
          sensoryEvaluation,
          overallScore: result.overall_quality,
          ranking: index + 1,
          totalParticipants: results.length,
          category: 'Fine Flavor', // Default category since contests table doesn't have category field
          awards: awards.length > 0 ? awards : undefined,
          judgeComments: result.flavor_comments || 'Evaluation completed with detailed sensory analysis.',
          recommendations,
          trackingCode: sample.tracking_code,
          internalCode
        };
      });

      console.log(`Successfully fetched ${transformedResults.length} evaluated samples`);
      return { success: true, data: transformedResults };
      
    } catch (error) {
      console.error('Error in getAllEvaluatedSamples:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch evaluated samples' 
      };
    }
  }

  /**
   * Get samples and results for a specific user
   * @param userId - User ID to fetch samples for
   * @param contestId - Optional contest ID to filter results by specific contest
   */
  static async getSamplesByUser(userId: string, contestId?: string): Promise<ResultsServiceResponse> {
    try {
      console.log(`Fetching samples for user: ${userId}${contestId ? ` in contest ${contestId}` : ''}`);
      
      // Get samples for the specific user with their evaluations
      let query = supabase
        .from('sensory_evaluations')
        .select(`
          id,
          sample_id,
          overall_quality,
          evaluation_date,
          flavor_comments,
          producer_recommendations,
          additional_positive,
          verdict,
          cacao,
          bitterness,
          astringency,
          caramel_panela,
          acidity_total,
          fresh_fruit_total,
          brown_fruit_total,
          vegetal_total,
          floral_total,
          wood_total,
          spice_total,
          nut_total,
          roast_degree,
          defects_total,
          sample!inner (
            id,
            tracking_code,
            status,
            created_at,
            user_id,
            contest_id,
            contests (
              id,
              name,
              description
            ),
            profiles (
              name
            )
          )
        `)
        .eq('sample.user_id', userId)
        .eq('verdict', 'Approved')
        .not('overall_quality', 'is', null)
        .order('overall_quality', { ascending: false });
      
      // Apply contest filter if provided
      if (contestId) {
        query = query.eq('sample.contest_id', contestId);
      }

      const { data: results, error } = await query;

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (!results || results.length === 0) {
        console.log(`No samples found for user: ${userId}`);
        return { success: true, data: [] };
      }

      // Transform the results using the same logic as other methods
      const transformedResults: SampleResult[] = results.map((result, index) => {
        const sample = result.sample as any;
        const contest = sample.contests as any;
        const participant = sample.profiles as any;
        
        // Generate internal code
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);
        
        // Calculate sensory scores based on the sensory evaluation data (same as other methods)
        const sensoryEvaluation = {
          aroma: (result.acidity_total + result.fresh_fruit_total + result.floral_total) / 3,
          flavor: (result.cacao + result.caramel_panela + result.fresh_fruit_total + result.brown_fruit_total) / 4,
          texture: result.astringency ? (10 - result.astringency) : 7,
          aftertaste: (result.spice_total + result.nut_total + result.wood_total) / 3,
          balance: result.overall_quality,
          overall: result.overall_quality,
          notes: result.flavor_comments || 'No specific notes provided'
        };

        // Generate recommendations from the evaluation data
        const recommendations: string[] = [];
        if (result.producer_recommendations) {
          recommendations.push(result.producer_recommendations);
        }
        if (result.additional_positive) {
          recommendations.push(`Positive aspect: ${result.additional_positive}`);
        }
        if (result.defects_total > 3) {
          recommendations.push('Focus on reducing defects in processing');
        }

        // Determine awards based on ranking and scores
        const awards: string[] = [];
        if (index === 0) {
          awards.push('Gold Medal', 'Best in Show');
        } else if (index === 1) {
          awards.push('Silver Medal');
        } else if (index === 2) {
          awards.push('Bronze Medal');
        }
        
        if (sensoryEvaluation.aroma >= 9) {
          awards.push('Best Aroma');
        }
        if (sensoryEvaluation.flavor >= 9) {
          awards.push('Best Flavor');
        }
        
        return {
          id: result.id,
          sampleName: `Sample ${internalCode}`,
          contestName: contest?.name || 'Unknown Contest',
          participantName: participant?.name || 'Unknown Participant',
          submissionDate: new Date(sample.created_at).toLocaleDateString(),
          evaluationDate: new Date(result.evaluation_date).toLocaleDateString(),
          status: 'published' as const,
          sensoryEvaluation,
          overallScore: result.overall_quality,
          ranking: index + 1,
          totalParticipants: results.length,
          category: 'Fine Flavor', // Default category since contests table doesn't have category field
          awards: awards.length > 0 ? awards : undefined,
          judgeComments: result.flavor_comments || 'Evaluation completed with detailed sensory analysis.',
          recommendations,
          trackingCode: sample.tracking_code,
          internalCode
        };
      });

      console.log(`Successfully fetched ${transformedResults.length} samples for user`);
      return { success: true, data: transformedResults };
      
    } catch (error) {
      console.error('Error in getSamplesByUser:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user samples' 
      };
    }
  }

  /**
   * Get detailed sensory evaluation data for a specific evaluation OR by sample
   * The input `id` can be an evaluation ID or a sample ID. We try evaluation first,
   * then fall back to the latest approved evaluation for the given sample.
   */
  static async getDetailedSensoryData(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`Fetching detailed sensory data for id: ${id}`);

      // 1) Try fetch by evaluation id without using .single() to avoid 406 on 0 rows
      const { data: byIdRows, error: byIdErr } = await supabase
        .from('sensory_evaluations')
        .select('*')
        .eq('id', id)
        .limit(1);

      let evaluation: any | null = null;
      if (byIdErr) {
        console.warn('Primary fetch by evaluation id failed:', byIdErr);
      }
      if (byIdRows && byIdRows.length > 0) {
        evaluation = byIdRows[0];
      }

      // 2) Fallback: treat id as sample_id and fetch the latest approved evaluation
      if (!evaluation) {
        const { data: bySampleRows, error: bySampleErr } = await supabase
          .from('sensory_evaluations')
          .select('*')
          .eq('sample_id', id)
          .eq('verdict', 'Approved')
          .not('overall_quality', 'is', null)
          .order('evaluation_date', { ascending: false })
          .limit(1);

        if (bySampleErr) {
          console.warn('Fallback fetch by sample_id failed:', bySampleErr);
        }
        if (bySampleRows && bySampleRows.length > 0) {
          evaluation = bySampleRows[0];
        }
      }

      if (!evaluation) {
        return { success: true, data: null };
      }

      // Transform the raw evaluation data into the format expected by the UI
      const detailedData = {
        evaluator: 'Professional Judge', // Could be fetched from profiles if needed
        sample_id: evaluation.sample_id,
        sample_info: `Sample ${evaluation.sample_id}`,
        date: evaluation.evaluation_date || evaluation.created_at,
        attributes: {
          cacao: { value: evaluation.cacao || 0 },
          acidity: {
            total: evaluation.acidity_total || 0,
            children: {
              frutal: (evaluation as any).acidity_frutal || 0,
              acetic: (evaluation as any).acidity_acetic || 0,
              lactic: (evaluation as any).acidity_lactic || 0,
              mineral_butyric: (evaluation as any).acidity_mineral_butyric || 0,
            }
          },
          fresh_fruit: {
            total: evaluation.fresh_fruit_total || 0,
            children: {
              berries: (evaluation as any).fresh_fruit_berries || 0,
              citrus: (evaluation as any).fresh_fruit_citrus || 0,
              yellow_pulp: (evaluation as any).fresh_fruit_yellow_pulp || 0,
              dark: (evaluation as any).fresh_fruit_dark || 0,
              tropical: (evaluation as any).fresh_fruit_tropical || 0,
            }
          },
          brown_fruit: {
            total: evaluation.brown_fruit_total || 0,
            children: {
              dry: (evaluation as any).brown_fruit_dry || 0,
              brown: (evaluation as any).brown_fruit_brown || 0,
              overripe: (evaluation as any).brown_fruit_overripe || 0,
            }
          },
          vegetal: {
            total: evaluation.vegetal_total || 0,
            children: {
              grass_herb: (evaluation as any).vegetal_grass_herb || 0,
              earthy: (evaluation as any).vegetal_earthy || 0,
            }
          },
          floral: {
            total: evaluation.floral_total || 0,
            children: {
              orange_blossom: (evaluation as any).floral_orange_blossom || 0,
              flowers: (evaluation as any).floral_flowers || 0,
            }
          },
          wood: {
            total: evaluation.wood_total || 0,
            children: {
              light: (evaluation as any).wood_light || 0,
              dark: (evaluation as any).wood_dark || 0,
              resin: (evaluation as any).wood_resin || 0,
            }
          },
          spice: {
            total: evaluation.spice_total || 0,
            children: {
              spices: (evaluation as any).spice_spices || 0,
              tobacco: (evaluation as any).spice_tobacco || 0,
              umami: (evaluation as any).spice_umami || 0,
            }
          },
          nut: {
            total: evaluation.nut_total || 0,
            children: {
              kernel: (evaluation as any).nut_kernel || 0,
              skin: (evaluation as any).nut_skin || 0,
            }
          },
          caramel_panela: { value: evaluation.caramel_panela || 0 },
          bitterness: { value: evaluation.bitterness || 0 },
          astringency: { value: evaluation.astringency || 0 },
          roast_degree: {
            total: evaluation.roast_degree || 0,
            children: {
              lactic: (evaluation as any).roast_lactic || 0,
              mineral_butyric: (evaluation as any).roast_mineral_butyric || 0,
            }
          },
          defects: {
            total: evaluation.defects_total || 0,
            children: {
              dirty: (evaluation as any).defects_dirty || 0,
              animal: (evaluation as any).defects_animal || 0,
              rotten: (evaluation as any).defects_rotten || 0,
              smoke: (evaluation as any).defects_smoke || 0,
              humid: (evaluation as any).defects_humid || 0,
              moldy: (evaluation as any).defects_moldy || 0,
              overfermented: (evaluation as any).defects_overfermented || 0,
              other: (evaluation as any).defects_other || 0,
            }
          },
        },
        global_quality: evaluation.overall_quality || 0,
        positive_qualities: evaluation.additional_positive ? [evaluation.additional_positive] : [],
        flavor_comments: evaluation.flavor_comments || '',
        recommendations: evaluation.producer_recommendations || '',
      };

      return { success: true, data: detailedData };

    } catch (error) {
      console.error('Error in getDetailedSensoryData:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch detailed sensory data'
      };
    }
  }

  /**
   * Get results statistics
   * @param contestId - Optional contest ID to filter statistics by specific contest
   */
  static async getResultsStats(contestId?: string): Promise<{ success: boolean; data?: ResultsStats; error?: string }> {
    try {
      console.log(`Fetching results statistics${contestId ? ` for contest ${contestId}` : ''}...`);
      
      // Get total samples count
      let samplesQuery = supabase
        .from('sample')
        .select('*', { count: 'exact', head: true });
      
      if (contestId) {
        samplesQuery = samplesQuery.eq('contest_id', contestId);
      }
      
      const { count: totalSamples, error: samplesError } = await samplesQuery;

      if (samplesError) {
        throw samplesError;
      }

      // Fetch approved evaluations with sample_id to aggregate per-sample
      let evalQuery = supabase
        .from('sensory_evaluations')
        .select('sample_id, overall_quality, sample!inner(contest_id)')
        .eq('verdict', 'Approved')
        .not('overall_quality', 'is', null);
      
      if (contestId) {
        evalQuery = evalQuery.eq('sample.contest_id', contestId);
      }

      const { data: evalRows, error: evaluatedError } = await evalQuery;

      if (evaluatedError) {
        throw evaluatedError;
      }

      // Group by sample_id and compute per-sample averages
      const bySample = new Map<string, { sum: number; count: number }>();
      for (const row of (evalRows as any[] ?? [])) {
        const id = row.sample_id as string;
        const val = Number(row.overall_quality);
        if (!bySample.has(id)) bySample.set(id, { sum: 0, count: 0 });
        const agg = bySample.get(id)!;
        agg.sum += val;
        agg.count += 1;
      }
      const perSampleAverages = Array.from(bySample.values()).map(v => v.sum / (v.count || 1));

      const evaluatedCount = perSampleAverages.length; // distinct samples with at least one approved evaluation
      const averageScore = perSampleAverages.length > 0 ? perSampleAverages.reduce((a, b) => a + b, 0) / perSampleAverages.length : 0;
      const bestScore = perSampleAverages.length > 0 ? Math.max(...perSampleAverages) : 0;

      // Estimate awards: medals for top 3 distinct samples + excellence awards (>=9 avg)
      const medals = Math.min(3, evaluatedCount);
      const excellence = perSampleAverages.filter(s => s >= 9).length;
      const totalAwards = medals + excellence; // aligns with UI that gives Gold/Silver/Bronze plus excellence

      const stats: ResultsStats = {
        totalSamples: totalSamples || 0,
        evaluatedSamples: evaluatedCount,
        averageScore: Math.round(averageScore * 10) / 10,
        bestScore: Math.round(bestScore * 10) / 10,
        totalAwards
      };

      console.log('Results statistics:', stats);
      return { success: true, data: stats };
      
    } catch (error) {
      console.error('Error in getResultsStats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch results statistics' 
      };
    }
  }

  /**
   * Get all judge comments for a specific sample
   * @param sampleId - Sample ID to fetch comments for
   */
  static async getAllJudgeComments(sampleId: string): Promise<{ 
    success: boolean; 
    data?: JudgeComment[]; 
    error?: string 
  }> {
    try {
      console.log(`Fetching all judge comments for sample: ${sampleId}`);

      const { data: evaluations, error } = await supabase
        .from('sensory_evaluations')
        .select(`
          id,
          evaluation_date,
          sample_notes,
          texture_notes,
          flavor_comments,
          producer_recommendations,
          additional_positive,
          overall_quality,
          created_at
        `)
        .eq('sample_id', sampleId)
        .eq('verdict', 'Approved')
        .order('evaluation_date', { ascending: true });

      if (error) {
        console.error('Error fetching judge comments:', error);
        throw error;
      }

      if (!evaluations || evaluations.length === 0) {
        console.log('No judge comments found for sample');
        return { success: true, data: [] };
      }

      // Transform to anonymized judge comments
      const comments = evaluations.map((evaluation, index) => ({
        judgeNumber: index + 1,
        evaluationDate: evaluation.evaluation_date || evaluation.created_at,
        sample_notes: evaluation.sample_notes || '',
        texture_notes: evaluation.texture_notes || '',
        flavor_comments: evaluation.flavor_comments || '',
        producer_recommendations: evaluation.producer_recommendations || '',
        additional_positive: evaluation.additional_positive || '',
        overall_quality: evaluation.overall_quality || 0,
      }));

      console.log(`Successfully fetched ${comments.length} judge comments`);
      return { success: true, data: comments };

    } catch (error) {
      console.error('Error in getAllJudgeComments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch judge comments'
      };
    }
  }

  /**
   * Generate internal code for sample
   */
  private static generateInternalCode(createdAt: string, sampleId: string): string {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = sampleId.substring(0, 8).toUpperCase();
    return `INT-${year}${month}-${shortId}`;
  }
}