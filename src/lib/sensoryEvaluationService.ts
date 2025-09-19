import { supabase } from './supabase';
import { SensoryEvaluationResult, SensoryScores, SensoryMeta, SensoryVerdict } from '@/components/dashboard/SensoryEvaluationForm';

export interface SensoryEvaluationData {
  id: string;
  sampleId: string;
  judgeId: string;
  evaluationDate: string;
  evaluationTime: string;
  evaluatorName: string;
  sampleCode: string;
  sampleNotes?: string;
  evaluationType: 'cocoa_mass' | 'chocolate';
  
  // Main scores
  cacao: number;
  bitterness: number;
  astringency: number;
  caramelPanela: number;
  
  // Calculated totals
  acidityTotal: number;
  freshFruitTotal: number;
  brownFruitTotal: number;
  vegetalTotal: number;
  floralTotal: number;
  woodTotal: number;
  spiceTotal: number;
  nutTotal: number;
  roastDegree: number;
  defectsTotal: number;
  
  // Sub-attributes
  acidity: {
    frutal: number;
    acetic: number;
    lactic: number;
    mineralButyric: number;
  };
  freshFruit: {
    berries: number;
    citrus: number;
    yellowPulp: number;
    dark: number;
    tropical: number;
  };
  brownFruit: {
    dry: number;
    brown: number;
    overripe: number;
  };
  vegetal: {
    grassHerb: number;
    earthy: number;
  };
  floral: {
    orangeBlossom: number;
    flowers: number;
  };
  wood: {
    light: number;
    dark: number;
    resin: number;
  };
  spice: {
    spices: number;
    tobacco: number;
    umami: number;
  };
  nut: {
    kernel: number;
    skin: number;
  };
  defects: {
    dirty: number;
    animal: number;
    rotten: number;
    smoke: number;
    humid: number;
    moldy: number;
    overfermented: number;
    other: number;
  };
  
  // Chocolate-specific
  sweetness?: number;
  textureNotes?: string;
  
  // Overall
  overallQuality: number;
  
  // Comments
  flavorComments?: string;
  producerRecommendations?: string;
  additionalPositive?: string;
  
  // Verdict
  verdict: 'Approved' | 'Disqualified';
  disqualificationReasons?: string[];
  otherDisqualificationReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface SensoryEvaluationSample {
  id: string;
  internalCode: string;
  trackingCode: string;
  contestName: string;
  participantName: string;
  status: string;
  submissionDate: string;
  hasEvaluation: boolean;
  evaluation?: SensoryEvaluationData;
}

export interface SensoryEvaluationResult {
  success: boolean;
  data?: SensoryEvaluationData[] | SensoryEvaluationSample[];
  error?: string;
}

export interface SensoryEvaluationSaveResult {
  success: boolean;
  data?: SensoryEvaluationData;
  error?: string;
}

export class SensoryEvaluationService {
  
  /**
   * Get samples assigned to the current judge for sensory evaluation
   */
  static async getSamplesForJudge(): Promise<SensoryEvaluationResult> {
    try {
      console.log('Fetching samples for sensory evaluation...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get samples assigned to this judge that are approved (ready for sensory evaluation)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('judge_assignments')
        .select(`
          sample_id,
          samples (
            id,
            tracking_code,
            status,
            created_at,
            contests (
              name
            ),
            profiles (
              name
            )
          )
        `)
        .eq('judge_id', user.id)
        .in('samples.status', ['approved', 'evaluated']);

      if (assignmentsError) {
        console.error('Error fetching judge assignments:', assignmentsError);
        throw assignmentsError;
      }

      if (!assignments || assignments.length === 0) {
        console.log('No samples assigned to this judge');
        return { success: true, data: [] };
      }

      // Get existing sensory evaluations for these samples
      const sampleIds = assignments.map(a => a.sample_id);
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('sensory_evaluations')
        .select('*')
        .in('sample_id', sampleIds)
        .eq('judge_id', user.id);

      if (evaluationsError) {
        console.error('Error fetching sensory evaluations:', evaluationsError);
        throw evaluationsError;
      }

      // Transform data
      const transformedSamples: SensoryEvaluationSample[] = assignments.map(assignment => {
        const sample = assignment.samples as any;
        const contest = sample.contests as any;
        const participant = sample.profiles as any;
        
        // Generate internal code
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);
        
        // Find existing evaluation
        const evaluation = evaluations?.find(e => e.sample_id === sample.id);
        
        return {
          id: sample.id,
          internalCode,
          trackingCode: sample.tracking_code,
          contestName: contest?.name || 'Unknown Contest',
          participantName: participant?.name || 'Unknown Participant',
          status: sample.status,
          submissionDate: new Date(sample.created_at).toLocaleDateString(),
          hasEvaluation: !!evaluation,
          evaluation: evaluation ? this.transformDatabaseToEvaluation(evaluation) : undefined,
        };
      });

      console.log(`Fetched ${transformedSamples.length} samples for sensory evaluation`);
      return { success: true, data: transformedSamples };
      
    } catch (error) {
      console.error('Error in getSamplesForJudge:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch samples for sensory evaluation' 
      };
    }
  }

  /**
   * Save sensory evaluation for a sample
   */
  static async saveSensoryEvaluation(
    sampleId: string,
    evaluationResult: SensoryEvaluationResult
  ): Promise<SensoryEvaluationSaveResult> {
    try {
      console.log(`Saving sensory evaluation for sample ${sampleId}`);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for evaluator name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      // Prepare evaluation data for database
      const evaluationData = {
        sample_id: sampleId,
        judge_id: user.id,
        evaluation_date: evaluationResult.meta.evaluationDate || new Date().toISOString().split('T')[0],
        evaluation_time: evaluationResult.meta.evaluationTime || new Date().toISOString().split('T')[1].substring(0, 5),
        evaluator_name: profile?.name || user.id,
        sample_code: evaluationResult.meta.sampleCode || '',
        sample_notes: evaluationResult.meta.sampleNotes || null,
        evaluation_type: evaluationResult.meta.evaluationType || 'cocoa_mass',
        
        // Main scores
        cacao: evaluationResult.scores.cacao,
        bitterness: evaluationResult.scores.bitterness,
        astringency: evaluationResult.scores.astringency,
        caramel_panela: evaluationResult.scores.caramelPanela,
        
        // Calculated totals
        acidity_total: evaluationResult.scores.acidityTotal,
        fresh_fruit_total: evaluationResult.scores.freshFruitTotal,
        brown_fruit_total: evaluationResult.scores.brownFruitTotal,
        vegetal_total: evaluationResult.scores.vegetalTotal,
        floral_total: evaluationResult.scores.floralTotal,
        wood_total: evaluationResult.scores.woodTotal,
        spice_total: evaluationResult.scores.spiceTotal,
        nut_total: evaluationResult.scores.nutTotal,
        roast_degree: evaluationResult.scores.roastDegree,
        defects_total: evaluationResult.scores.defectsTotal,
        
        // Sub-attributes
        acidity_frutal: evaluationResult.scores.acidity.frutal,
        acidity_acetic: evaluationResult.scores.acidity.acetic,
        acidity_lactic: evaluationResult.scores.acidity.lactic,
        acidity_mineral_butyric: evaluationResult.scores.acidity.mineralButyric,
        
        fresh_fruit_berries: evaluationResult.scores.freshFruit.berries,
        fresh_fruit_citrus: evaluationResult.scores.freshFruit.citrus,
        fresh_fruit_yellow_pulp: evaluationResult.scores.freshFruit.yellowPulp,
        fresh_fruit_dark: evaluationResult.scores.freshFruit.dark,
        fresh_fruit_tropical: evaluationResult.scores.freshFruit.tropical,
        
        brown_fruit_dry: evaluationResult.scores.brownFruit.dry,
        brown_fruit_brown: evaluationResult.scores.brownFruit.brown,
        brown_fruit_overripe: evaluationResult.scores.brownFruit.overripe,
        
        vegetal_grass_herb: evaluationResult.scores.vegetal.grassHerb,
        vegetal_earthy: evaluationResult.scores.vegetal.earthy,
        
        floral_orange_blossom: evaluationResult.scores.floral.orangeBlossom,
        floral_flowers: evaluationResult.scores.floral.flowers,
        
        wood_light: evaluationResult.scores.wood.light,
        wood_dark: evaluationResult.scores.wood.dark,
        wood_resin: evaluationResult.scores.wood.resin,
        
        spice_spices: evaluationResult.scores.spice.spices,
        spice_tobacco: evaluationResult.scores.spice.tobacco,
        spice_umami: evaluationResult.scores.spice.umami,
        
        nut_kernel: evaluationResult.scores.nut.kernel,
        nut_skin: evaluationResult.scores.nut.skin,
        
        // Defects
        defects_dirty: evaluationResult.scores.defects.dirty,
        defects_animal: evaluationResult.scores.defects.animal,
        defects_rotten: evaluationResult.scores.defects.rotten,
        defects_smoke: evaluationResult.scores.defects.smoke,
        defects_humid: evaluationResult.scores.defects.humid,
        defects_moldy: evaluationResult.scores.defects.moldy,
        defects_overfermented: evaluationResult.scores.defects.overfermented,
        defects_other: evaluationResult.scores.defects.other,
        
        // Chocolate-specific
        sweetness: evaluationResult.scores.sweetness || null,
        texture_notes: evaluationResult.scores.textureNotes || null,
        
        // Overall
        overall_quality: evaluationResult.scores.overallQuality || 0,
        
        // Comments
        flavor_comments: evaluationResult.comments.flavorComments || null,
        producer_recommendations: evaluationResult.comments.producerRecommendations || null,
        additional_positive: evaluationResult.comments.additionalPositive || null,
        
        // Verdict
        verdict: evaluationResult.verdict.result,
        disqualification_reasons: evaluationResult.verdict.reasons || null,
        other_disqualification_reason: evaluationResult.verdict.otherReason || null,
      };

      // Insert or update sensory evaluation
      const { data: savedEvaluation, error: saveError } = await supabase
        .from('sensory_evaluations')
        .upsert(evaluationData, {
          onConflict: 'sample_id,judge_id'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving sensory evaluation:', saveError);
        throw saveError;
      }

      console.log('Sensory evaluation saved successfully');
      
      const transformedEvaluation = this.transformDatabaseToEvaluation(savedEvaluation);
      return { success: true, data: transformedEvaluation };
      
    } catch (error) {
      console.error('Error in saveSensoryEvaluation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save sensory evaluation' 
      };
    }
  }

  /**
   * Get sensory evaluation by sample ID and judge ID
   */
  static async getSensoryEvaluation(sampleId: string, judgeId?: string): Promise<SensoryEvaluationSaveResult> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const targetJudgeId = judgeId || user.id;

      const { data: evaluation, error } = await supabase
        .from('sensory_evaluations')
        .select('*')
        .eq('sample_id', sampleId)
        .eq('judge_id', targetJudgeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No evaluation found
          return { success: true, data: undefined };
        }
        throw error;
      }

      const transformedEvaluation = this.transformDatabaseToEvaluation(evaluation);
      return { success: true, data: transformedEvaluation };
      
    } catch (error) {
      console.error('Error in getSensoryEvaluation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get sensory evaluation' 
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

  /**
   * Transform database record to SensoryEvaluationData
   */
  private static transformDatabaseToEvaluation(dbRecord: any): SensoryEvaluationData {
    return {
      id: dbRecord.id,
      sampleId: dbRecord.sample_id,
      judgeId: dbRecord.judge_id,
      evaluationDate: dbRecord.evaluation_date,
      evaluationTime: dbRecord.evaluation_time,
      evaluatorName: dbRecord.evaluator_name,
      sampleCode: dbRecord.sample_code,
      sampleNotes: dbRecord.sample_notes,
      evaluationType: dbRecord.evaluation_type,
      
      // Main scores
      cacao: parseFloat(dbRecord.cacao) || 0,
      bitterness: parseFloat(dbRecord.bitterness) || 0,
      astringency: parseFloat(dbRecord.astringency) || 0,
      caramelPanela: parseFloat(dbRecord.caramel_panela) || 0,
      
      // Calculated totals
      acidityTotal: parseFloat(dbRecord.acidity_total) || 0,
      freshFruitTotal: parseFloat(dbRecord.fresh_fruit_total) || 0,
      brownFruitTotal: parseFloat(dbRecord.brown_fruit_total) || 0,
      vegetalTotal: parseFloat(dbRecord.vegetal_total) || 0,
      floralTotal: parseFloat(dbRecord.floral_total) || 0,
      woodTotal: parseFloat(dbRecord.wood_total) || 0,
      spiceTotal: parseFloat(dbRecord.spice_total) || 0,
      nutTotal: parseFloat(dbRecord.nut_total) || 0,
      roastDegree: parseFloat(dbRecord.roast_degree) || 0,
      defectsTotal: parseFloat(dbRecord.defects_total) || 0,
      
      // Sub-attributes
      acidity: {
        frutal: parseFloat(dbRecord.acidity_frutal) || 0,
        acetic: parseFloat(dbRecord.acidity_acetic) || 0,
        lactic: parseFloat(dbRecord.acidity_lactic) || 0,
        mineralButyric: parseFloat(dbRecord.acidity_mineral_butyric) || 0,
      },
      freshFruit: {
        berries: parseFloat(dbRecord.fresh_fruit_berries) || 0,
        citrus: parseFloat(dbRecord.fresh_fruit_citrus) || 0,
        yellowPulp: parseFloat(dbRecord.fresh_fruit_yellow_pulp) || 0,
        dark: parseFloat(dbRecord.fresh_fruit_dark) || 0,
        tropical: parseFloat(dbRecord.fresh_fruit_tropical) || 0,
      },
      brownFruit: {
        dry: parseFloat(dbRecord.brown_fruit_dry) || 0,
        brown: parseFloat(dbRecord.brown_fruit_brown) || 0,
        overripe: parseFloat(dbRecord.brown_fruit_overripe) || 0,
      },
      vegetal: {
        grassHerb: parseFloat(dbRecord.vegetal_grass_herb) || 0,
        earthy: parseFloat(dbRecord.vegetal_earthy) || 0,
      },
      floral: {
        orangeBlossom: parseFloat(dbRecord.floral_orange_blossom) || 0,
        flowers: parseFloat(dbRecord.floral_flowers) || 0,
      },
      wood: {
        light: parseFloat(dbRecord.wood_light) || 0,
        dark: parseFloat(dbRecord.wood_dark) || 0,
        resin: parseFloat(dbRecord.wood_resin) || 0,
      },
      spice: {
        spices: parseFloat(dbRecord.spice_spices) || 0,
        tobacco: parseFloat(dbRecord.spice_tobacco) || 0,
        umami: parseFloat(dbRecord.spice_umami) || 0,
      },
      nut: {
        kernel: parseFloat(dbRecord.nut_kernel) || 0,
        skin: parseFloat(dbRecord.nut_skin) || 0,
      },
      defects: {
        dirty: parseFloat(dbRecord.defects_dirty) || 0,
        animal: parseFloat(dbRecord.defects_animal) || 0,
        rotten: parseFloat(dbRecord.defects_rotten) || 0,
        smoke: parseFloat(dbRecord.defects_smoke) || 0,
        humid: parseFloat(dbRecord.defects_humid) || 0,
        moldy: parseFloat(dbRecord.defects_moldy) || 0,
        overfermented: parseFloat(dbRecord.defects_overfermented) || 0,
        other: parseFloat(dbRecord.defects_other) || 0,
      },
      
      // Chocolate-specific
      sweetness: dbRecord.sweetness ? parseFloat(dbRecord.sweetness) : undefined,
      textureNotes: dbRecord.texture_notes,
      
      // Overall
      overallQuality: parseFloat(dbRecord.overall_quality) || 0,
      
      // Comments
      flavorComments: dbRecord.flavor_comments,
      producerRecommendations: dbRecord.producer_recommendations,
      additionalPositive: dbRecord.additional_positive,
      
      // Verdict
      verdict: dbRecord.verdict,
      disqualificationReasons: dbRecord.disqualification_reasons,
      otherDisqualificationReason: dbRecord.other_disqualification_reason,
      
      // Timestamps
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}