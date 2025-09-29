import { supabase } from './supabase';

// Physical Evaluation Data Interface
export interface PhysicalEvaluationData {
  // 1. Undesirable Aromas (Critical)
  undesirableAromas: string[];
  hasUndesirableAromas: boolean;
  // Additional odor checklists (non-critical)
  typicalOdors?: string[];
  atypicalOdors?: string[];
  
  // 2. Humidity
  percentageHumidity: number;
  
  // 3. Broken grains
  brokenGrains: number;
  
  // 4. Violated grains
  violatedGrains: boolean;
  
  // 5. Flat grains
  flatGrains: number;
  
  // 6. Affected grains/insects
  affectedGrainsInsects: number;
  hasAffectedGrains: boolean;
  
  // 7. Well-fermented + Lightly fermented beans
  wellFermentedBeans: number;
  lightlyFermentedBeans: number;
  
  // 8. Purple beans (unfermented)
  purpleBeans: number;
  
  // 9. Slaty beans
  slatyBeans: number;
  
  // 10. Internal moldy beans
  internalMoldyBeans: number;
  
  // 11. Over-fermented beans
  overFermentedBeans: number;
  
  // Evaluation metadata
  notes: string;
  evaluatedBy: string;
  evaluatedAt: string;
  globalEvaluation: 'passed' | 'disqualified';
  disqualificationReasons: string[];
  warnings: string[];
}

// Sample interface for Physical Evaluation
export interface PhysicalEvaluationSample {
  id: string;
  internalCode: string;
  externalCode: string;
  participantName: string;
  contestName: string;
  status: 'received' | 'physical_evaluation' | 'approved' | 'disqualified';
  submissionDate: string;
  physicalEvaluation?: PhysicalEvaluationData;
  // Additional fields from database
  contestId: string;
  userId: string;
  farmName?: string;
  ownerFullName?: string;
  origin?: string;
}

export interface PhysicalEvaluationResult {
  success: boolean;
  error?: string;
  data?: PhysicalEvaluationSample[];
}

export interface PhysicalEvaluationUpdateResult {
  success: boolean;
  error?: string;
  data?: PhysicalEvaluationSample;
}

/**
 * Service for Physical Evaluation operations
 */
export class PhysicalEvaluationService {
  
  /**
   * Get samples ready for physical evaluation (received status)
   */
  static async getSamplesForEvaluation(): Promise<PhysicalEvaluationResult> {
    try {
      console.log('Fetching samples for physical evaluation...');
      
      const { data: samples, error: samplesError } = await supabase
        .from('sample')
        .select(`
          *,
          contests:contest_id (
            name,
            location
          ),
          profiles:user_id (
            name
          ),
          physical_evaluations (
            *
          )
        `)
        .in('status', ['received', 'physical_evaluation', 'approved', 'disqualified'])
        .order('created_at', { ascending: false });

      if (samplesError) {
        console.error('Error fetching samples:', samplesError);
        return { success: false, error: samplesError.message };
      }

      if (!samples) {
        return { success: true, data: [] };
      }

      // Transform database samples to PhysicalEvaluationSample interface
      const transformedSamples: PhysicalEvaluationSample[] = samples.map((sample: any) => {
        // Construct origin from location fields
        const originParts = [
          sample.country,
          sample.department,
          sample.municipality
        ].filter(Boolean);
        
        const origin = originParts.length > 0 ? originParts.join(', ') : 'Unknown';
        
        // Generate internal code if not exists
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);
        
        // Get physical evaluation data if exists (handle object or array from Supabase)
        let physicalEvaluation: PhysicalEvaluationData | undefined;
        const pe = (sample as any).physical_evaluations;
        const evalData = Array.isArray(pe) ? pe[0] : pe; // one-to-one may come as object
        if (evalData) {
          physicalEvaluation = {
            undesirableAromas: evalData.undesirable_aromas || [],
            hasUndesirableAromas: evalData.has_undesirable_aromas || false,
            typicalOdors: evalData.typical_odors || [],
            atypicalOdors: evalData.atypical_odors || [],
            percentageHumidity: evalData.percentage_humidity || 0,
            brokenGrains: evalData.broken_grains || 0,
            violatedGrains: evalData.violated_grains || false,
            flatGrains: evalData.flat_grains || 0,
            affectedGrainsInsects: evalData.affected_grains_insects || 0,
            hasAffectedGrains: evalData.has_affected_grains || false,
            wellFermentedBeans: evalData.well_fermented_beans || 0,
            lightlyFermentedBeans: evalData.lightly_fermented_beans || 0,
            purpleBeans: evalData.purple_beans || 0,
            slatyBeans: evalData.slaty_beans || 0,
            internalMoldyBeans: evalData.internal_moldy_beans || 0,
            overFermentedBeans: evalData.over_fermented_beans || 0,
            notes: evalData.notes || '',
            evaluatedBy: evalData.evaluated_by || '',
            evaluatedAt: evalData.evaluated_at || '',
            globalEvaluation: evalData.global_evaluation || 'passed',
            disqualificationReasons: evalData.disqualification_reasons || [],
            warnings: evalData.warnings || []
          };
        }
        
        return {
          id: sample.id,
          internalCode,
          externalCode: sample.tracking_code,
          participantName: sample.profiles?.name || sample.owner_full_name || 'Unknown',
          contestName: sample.contests?.name || 'Unknown Contest',
          status: sample.status,
          submissionDate: sample.created_at.split('T')[0], // Format as YYYY-MM-DD
          physicalEvaluation,
          contestId: sample.contest_id,
          userId: sample.user_id,
          farmName: sample.farm_name,
          ownerFullName: sample.owner_full_name,
          origin
        };
      });

      console.log(`Fetched ${transformedSamples.length} samples for evaluation`);
      return { success: true, data: transformedSamples };
      
    } catch (error) {
      console.error('Error in getSamplesForEvaluation:', error);
      return { success: false, error: 'Failed to fetch samples for evaluation' };
    }
  }

  /**
   * Save physical evaluation for a sample
   */
  static async savePhysicalEvaluation(
    sampleId: string,
    evaluationData: Partial<PhysicalEvaluationData>
  ): Promise<PhysicalEvaluationUpdateResult> {
    try {
      console.log(`Saving physical evaluation for sample ${sampleId}`);
      
      // Get current user for evaluatedBy field
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user profile for evaluator name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.warn('Could not get user profile, using user ID');
      }

      // Evaluate physical criteria to determine status
      const evaluation = this.evaluatePhysicalCriteria(evaluationData);
      
      // Prepare evaluation data for database
      const physicalEvaluationData = {
        sample_id: sampleId,
        undesirable_aromas: evaluationData.undesirableAromas || [],
        has_undesirable_aromas: evaluationData.hasUndesirableAromas || false,
        typical_odors: evaluationData.typicalOdors || [],
        atypical_odors: evaluationData.atypicalOdors || [],
        percentage_humidity: evaluationData.percentageHumidity || 0,
        broken_grains: evaluationData.brokenGrains || 0,
        violated_grains: evaluationData.violatedGrains || false,
        flat_grains: evaluationData.flatGrains || 0,
        affected_grains_insects: evaluationData.affectedGrainsInsects || 0,
        has_affected_grains: evaluationData.hasAffectedGrains || false,
        well_fermented_beans: evaluationData.wellFermentedBeans || 0,
        lightly_fermented_beans: evaluationData.lightlyFermentedBeans || 0,
        purple_beans: evaluationData.purpleBeans || 0,
        slaty_beans: evaluationData.slatyBeans || 0,
        internal_moldy_beans: evaluationData.internalMoldyBeans || 0,
        over_fermented_beans: evaluationData.overFermentedBeans || 0,
        notes: evaluationData.notes || '',
        evaluated_by: profile?.name || user.id,
        evaluated_at: new Date().toISOString(),
        global_evaluation: evaluation.globalEvaluation,
        disqualification_reasons: evaluation.disqualificationReasons,
        warnings: evaluation.warnings
      };

      // Insert or update physical evaluation
      const { data: evalResult, error: evalError } = await supabase
        .from('physical_evaluations')
        .upsert(physicalEvaluationData, {
          onConflict: 'sample_id'
        })
        .select()
        .single();

      if (evalError) {
        console.error('Error saving physical evaluation:', evalError);
        return { success: false, error: evalError.message };
      }

      // Update sample status based on evaluation result
      const newStatus = evaluation.globalEvaluation === 'disqualified' ? 'disqualified' : 'physical_evaluation';
      
      const { error: statusError } = await supabase
        .from('sample')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', sampleId);

      if (statusError) {
        console.error('Error updating sample status:', statusError);
        return { success: false, error: statusError.message };
      }

      // Fetch updated sample data
      const updatedSampleResult = await this.getSampleById(sampleId);
      if (!updatedSampleResult.success) {
        return { success: false, error: 'Failed to fetch updated sample data' };
      }

      console.log(`Successfully saved physical evaluation for sample ${sampleId}`);
      return { success: true, data: updatedSampleResult.data };
      
    } catch (error) {
      console.error('Error in savePhysicalEvaluation:', error);
      return { success: false, error: 'Failed to save physical evaluation' };
    }
  }

  /**
   * Approve a sample after physical evaluation
   */
  static async approveSample(sampleId: string): Promise<PhysicalEvaluationUpdateResult> {
    try {
      console.log(`Approving sample ${sampleId}`);
      
      const { error } = await supabase
        .from('sample')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', sampleId);

      if (error) {
        console.error('Error approving sample:', error);
        return { success: false, error: error.message };
      }

      // Fetch updated sample data
      const updatedSampleResult = await this.getSampleById(sampleId);
      if (!updatedSampleResult.success) {
        return { success: false, error: 'Failed to fetch updated sample data' };
      }

      console.log(`Successfully approved sample ${sampleId}`);
      return { success: true, data: updatedSampleResult.data };
      
    } catch (error) {
      console.error('Error in approveSample:', error);
      return { success: false, error: 'Failed to approve sample' };
    }
  }

  /**
   * Get a single sample by ID with physical evaluation data
   */
  private static async getSampleById(sampleId: string): Promise<PhysicalEvaluationUpdateResult> {
    try {
      const { data: sample, error } = await supabase
        .from('sample')
        .select(`
          *,
          contests:contest_id (
            name,
            location
          ),
          profiles:user_id (
            name
          ),
          physical_evaluations (
            *
          )
        `)
        .eq('id', sampleId)
        .single();

      if (error) {
        console.error('Error fetching sample:', error);
        return { success: false, error: error.message };
      }

      if (!sample) {
        return { success: false, error: 'Sample not found' };
      }

      // Transform to PhysicalEvaluationSample
      const originParts = [
        sample.country,
        sample.department,
        sample.municipality
      ].filter(Boolean);
      
      const origin = originParts.length > 0 ? originParts.join(', ') : 'Unknown';
      const internalCode = this.generateInternalCode(sample.created_at, sample.id);
      
      let physicalEvaluation: PhysicalEvaluationData | undefined;
      const pe2 = (sample as any).physical_evaluations;
      const evalData2 = Array.isArray(pe2) ? pe2[0] : pe2;
      if (evalData2) {
        physicalEvaluation = {
          undesirableAromas: evalData2.undesirable_aromas || [],
          hasUndesirableAromas: evalData2.has_undesirable_aromas || false,
          typicalOdors: evalData2.typical_odors || [],
          atypicalOdors: evalData2.atypical_odors || [],
          percentageHumidity: evalData2.percentage_humidity || 0,
          brokenGrains: evalData2.broken_grains || 0,
          violatedGrains: evalData2.violated_grains || false,
          flatGrains: evalData2.flat_grains || 0,
          affectedGrainsInsects: evalData2.affected_grains_insects || 0,
          hasAffectedGrains: evalData2.has_affected_grains || false,
          wellFermentedBeans: evalData2.well_fermented_beans || 0,
          lightlyFermentedBeans: evalData2.lightly_fermented_beans || 0,
          purpleBeans: evalData2.purple_beans || 0,
          slatyBeans: evalData2.slaty_beans || 0,
          internalMoldyBeans: evalData2.internal_moldy_beans || 0,
          overFermentedBeans: evalData2.over_fermented_beans || 0,
          notes: evalData2.notes || '',
          evaluatedBy: evalData2.evaluated_by || '',
          evaluatedAt: evalData2.evaluated_at || '',
          globalEvaluation: evalData2.global_evaluation || 'passed',
          disqualificationReasons: evalData2.disqualification_reasons || [],
          warnings: evalData2.warnings || []
        };
      }
      
      const transformedSample: PhysicalEvaluationSample = {
        id: sample.id,
        internalCode,
        externalCode: sample.tracking_code,
        participantName: sample.profiles?.name || sample.owner_full_name || 'Unknown',
        contestName: sample.contests?.name || 'Unknown Contest',
        status: sample.status,
        submissionDate: sample.created_at.split('T')[0],
        physicalEvaluation,
        contestId: sample.contest_id,
        userId: sample.user_id,
        farmName: sample.farm_name,
        ownerFullName: sample.owner_full_name,
        origin
      };

      return { success: true, data: transformedSample };
      
    } catch (error) {
      console.error('Error in getSampleById:', error);
      return { success: false, error: 'Failed to fetch sample' };
    }
  }

  /**
   * Evaluate physical criteria and determine pass/fail status
   */
  static evaluatePhysicalCriteria(data: Partial<PhysicalEvaluationData>) {
    const disqualificationReasons: string[] = [];
    const warnings: string[] = [];

    // 1. Undesirable Aromas
    if (data.hasUndesirableAromas && data.undesirableAromas && data.undesirableAromas.length > 0) {
      disqualificationReasons.push(`Undesirable aromas detected: ${data.undesirableAromas.join(', ')}`);
    }

    // 2. Humidity
    if (data.percentageHumidity !== undefined) {
      if (data.percentageHumidity < 3.5 || data.percentageHumidity > 8.0) {
        disqualificationReasons.push(`Humidity (${data.percentageHumidity}%) outside acceptable range (3.5%-8.0%)`);
      }
    }

    // 3. Broken grains
    if (data.brokenGrains !== undefined && data.brokenGrains > 10) {
      disqualificationReasons.push(`Broken grains (${data.brokenGrains}%) exceeds maximum (10%)`);
    }

    // 4. Violated grains
    if (data.violatedGrains) {
      disqualificationReasons.push('Violated grains detected');
    }

    // 5. Flat grains (warning only)
    if (data.flatGrains !== undefined && data.flatGrains > 15) {
      warnings.push(`Flat grains (${data.flatGrains}%) exceeds warning threshold (15%)`);
    }

    // 6. Affected grains/insects
    if (data.affectedGrainsInsects !== undefined && data.affectedGrainsInsects >= 1) {
      disqualificationReasons.push(`Affected grains/insects (${data.affectedGrainsInsects}) detected`);
    }

    // 7. Well-fermented + Lightly fermented beans
    if (data.wellFermentedBeans !== undefined && data.lightlyFermentedBeans !== undefined) {
      const totalFermented = data.wellFermentedBeans + data.lightlyFermentedBeans;
      if (totalFermented < 60) {
        disqualificationReasons.push(`Well-fermented + Lightly fermented (${totalFermented}%) below minimum (60%)`);
      }
    }

    // 8. Purple beans
    if (data.purpleBeans !== undefined && data.purpleBeans > 15) {
      disqualificationReasons.push(`Purple beans (${data.purpleBeans}%) exceeds maximum (15%)`);
    }

    // 9. Slaty beans
    if (data.slatyBeans !== undefined && data.slatyBeans > 0) {
      disqualificationReasons.push(`Slaty beans (${data.slatyBeans}%) exceeds maximum (0%)`);
    }

    // 10. Internal moldy beans
    if (data.internalMoldyBeans !== undefined && data.internalMoldyBeans > 0) {
      disqualificationReasons.push(`Internal moldy beans (${data.internalMoldyBeans}%) exceeds maximum (0%)`);
    }

    // 11. Over-fermented beans
    if (data.overFermentedBeans !== undefined && data.overFermentedBeans > 0) {
      disqualificationReasons.push(`Over-fermented beans (${data.overFermentedBeans}%) exceeds maximum (0%)`);
    }

    // 12. Global evaluation
    const globalEvaluation = disqualificationReasons.length > 0 ? 'disqualified' : 'passed';

    return {
      globalEvaluation,
      disqualificationReasons,
      warnings
    };
  }

  /**
   * Generate internal code for director use
   */
  private static generateInternalCode(createdAt: string, sampleId: string): string {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Use last 3 characters of sample ID for uniqueness
    const uniqueId = sampleId.slice(-3).toUpperCase();
    
    return `INT-${year}${month}-${uniqueId}`;
  }

  /**
   * Get evaluation statistics
   */
  static async getEvaluationStatistics(): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      total: number;
      received: number;
      physical_evaluation: number;
      approved: number;
      disqualified: number;
    };
  }> {
    try {
      const result = await this.getSamplesForEvaluation();
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }
      
      const samples = result.data;
      
      const stats = {
        total: samples.length,
        received: samples.filter(s => s.status === 'received').length,
        physical_evaluation: samples.filter(s => s.status === 'physical_evaluation').length,
        approved: samples.filter(s => s.status === 'approved').length,
        disqualified: samples.filter(s => s.status === 'disqualified').length
      };
      
      return { success: true, stats };
      
    } catch (error) {
      console.error('Error in getEvaluationStatistics:', error);
      return { success: false, error: 'Failed to get evaluation statistics' };
    }
  }
}