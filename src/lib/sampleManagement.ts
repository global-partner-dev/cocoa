import { supabase } from './supabase';

// Sample interface for Director's Sample Management
export interface SampleManagement {
  id: string;
  externalCode: string; // tracking_code from database
  internalCode: string; // generated internal code for director use
  participantName: string; // from profiles table
  contest: string; // from contests table
  category: 'cocoa' | 'chocolate' | 'powder';
  origin: string; // constructed from country/department/municipality
  submissionDate: string; // created_at
  receivedDate?: string; // when status changed to 'received'
  status: 'submitted' | 'received' | 'physical_evaluation' | 'approved' | 'disqualified';
  weight?: number; // quantity from database
  notes?: string; // additional notes field
  // Additional fields from database
  farmName?: string;
  ownerFullName?: string;
  contestId: string;
  userId: string;
  // Cocoa liquor specific fields
  liquorName?: string; // name from cocoa_liquor table
  lotNumber?: string; // lot_number from cocoa_liquor table
}

export interface SampleManagementResult {
  success: boolean;
  error?: string;
  data?: SampleManagement[];
}

export interface SampleUpdateResult {
  success: boolean;
  error?: string;
}

/**
 * Service for Director's Sample Management operations
 */
export class SampleManagementService {
  
  /**
   * Fetch all samples for director management
   */
  static async getAllSamples(): Promise<SampleManagementResult> {
    try {
      console.log('Fetching all samples for director management...');
      
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
          cocoa_liquor (
            name,
            lot_number
          )
        `)
        .order('created_at', { ascending: false });

      if (samplesError) {
        console.error('Error fetching samples:', samplesError);
        return { success: false, error: samplesError.message };
      }

      if (!samples) {
        return { success: true, data: [] };
      }

      // Transform database samples to SampleManagement interface
      const transformedSamples: SampleManagement[] = samples.map((sample: any) => {
        // Construct origin from location fields, fallback to contest name
        const originParts = [
          sample.country,
          sample.department,
          sample.municipality
        ].filter(Boolean);

        const origin = originParts.length > 0 ? originParts.join(', ') : sample.contests?.name || 'Unknown';
        
        // Generate internal code if not exists
        const internalCode = this.generateInternalCode(sample.created_at, sample.id);
        
        // Determine category based on sample data (default to cocoa for now)
        const category: 'cocoa' | 'chocolate' | 'powder' = 'cocoa';
        
        return {
          id: sample.id,
          externalCode: sample.tracking_code,
          internalCode,
          participantName: sample.profiles?.name || sample.owner_full_name || 'Unknown',
          contest: sample.contests?.name || 'Unknown Contest',
          category,
          origin,
          submissionDate: sample.created_at.split('T')[0], // Format as YYYY-MM-DD
          receivedDate: sample.status !== 'submitted' ? sample.updated_at?.split('T')[0] : undefined,
          status: sample.status,
          weight: sample.quantity,
          notes: sample.notes || undefined,
          farmName: sample.farm_name,
          ownerFullName: sample.owner_full_name,
          contestId: sample.contest_id,
          userId: sample.user_id,
          liquorName: sample.cocoa_liquor?.[0]?.name || undefined,
          lotNumber: sample.cocoa_liquor?.[0]?.lot_number || undefined
        };
      });

      console.log(`Fetched ${transformedSamples.length} samples`);
      return { success: true, data: transformedSamples };
      
    } catch (error) {
      console.error('Error in getAllSamples:', error);
      return { success: false, error: 'Failed to fetch samples' };
    }
  }

  /**
   * Update sample status (receive, approve, disqualify)
   */
  static async updateSampleStatus(
    sampleId: string, 
    status: SampleManagement['status'],
    notes?: string
  ): Promise<SampleUpdateResult> {
    try {
      console.log(`Updating sample ${sampleId} status to:`, status);
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from('sample')
        .update(updateData)
        .eq('id', sampleId);

      if (error) {
        console.error('Error updating sample status:', error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully updated sample ${sampleId} status`);
      return { success: true };
      
    } catch (error) {
      console.error('Error in updateSampleStatus:', error);
      return { success: false, error: 'Failed to update sample status' };
    }
  }

  /**
   * Delete a sample (admin operation)
   */
  static async deleteSample(sampleId: string): Promise<SampleUpdateResult> {
    try {
      console.log(`Deleting sample ${sampleId}...`);
      
      // First, try to delete QR code from storage if it exists
      const { data: sample } = await supabase
        .from('sample')
        .select('tracking_code, qr_code_url')
        .eq('id', sampleId)
        .single();

      if (sample?.qr_code_url) {
        // Extract file path from URL and delete from storage
        const fileName = `qr-${sample.tracking_code}.png`;
        const { error: storageError } = await supabase.storage
          .from('qr-codes')
          .remove([fileName]);
        
        if (storageError) {
          console.warn('Error deleting QR code from storage:', storageError);
          // Continue with sample deletion even if QR code deletion fails
        }
      }

      // Delete sample from database
      const { error: deleteError } = await supabase
        .from('sample')
        .delete()
        .eq('id', sampleId);

      if (deleteError) {
        console.error('Error deleting sample:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`Successfully deleted sample ${sampleId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error in deleteSample:', error);
      return { success: false, error: 'Failed to delete sample' };
    }
  }

  /**
   * Get samples by status
   */
  static async getSamplesByStatus(status: SampleManagement['status']): Promise<SampleManagementResult> {
    try {
      const result = await this.getAllSamples();
      
      if (!result.success || !result.data) {
        return result;
      }
      
      const filteredSamples = result.data.filter(sample => sample.status === status);
      
      return {
        success: true,
        data: filteredSamples
      };
      
    } catch (error) {
      console.error('Error in getSamplesByStatus:', error);
      return { success: false, error: 'Failed to fetch samples by status' };
    }
  }

  /**
   * Search samples by various criteria
   */
  static async searchSamples(
    searchTerm: string,
    statusFilter?: string,
    trackingCode?: string
  ): Promise<SampleManagementResult> {
    try {
      const result = await this.getAllSamples();
      
      if (!result.success || !result.data) {
        return result;
      }
      
      let filteredSamples = result.data;
      
      // Apply search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredSamples = filteredSamples.filter(sample =>
          sample.externalCode.toLowerCase().includes(term) ||
          sample.participantName.toLowerCase().includes(term) ||
          sample.origin.toLowerCase().includes(term) ||
          sample.contest.toLowerCase().includes(term)
        );
      }
      
      // Apply tracking code filter
      if (trackingCode) {
        const code = trackingCode.toLowerCase();
        filteredSamples = filteredSamples.filter(sample =>
          sample.internalCode.toLowerCase().includes(code) ||
          sample.externalCode.toLowerCase().includes(code)
        );
      }
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        filteredSamples = filteredSamples.filter(sample => 
          sample.status === statusFilter
        );
      }
      
      return {
        success: true,
        data: filteredSamples
      };
      
    } catch (error) {
      console.error('Error in searchSamples:', error);
      return { success: false, error: 'Failed to search samples' };
    }
  }

  /**
   * Get sample statistics
   */
  static async getSampleStatistics(): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      total: number;
      submitted: number;
      received: number;
      physical_evaluation: number;
      approved: number;
      disqualified: number;
    };
  }> {
    try {
      const result = await this.getAllSamples();
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }
      
      const samples = result.data;
      
      const stats = {
        total: samples.length,
        submitted: samples.filter(s => s.status === 'submitted').length,
        received: samples.filter(s => s.status === 'received').length,
        physical_evaluation: samples.filter(s => s.status === 'physical_evaluation').length,
        approved: samples.filter(s => s.status === 'approved').length,
        disqualified: samples.filter(s => s.status === 'disqualified').length
      };
      
      return { success: true, stats };
      
    } catch (error) {
      console.error('Error in getSampleStatistics:', error);
      return { success: false, error: 'Failed to get sample statistics' };
    }
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
   * Update sample notes
   */
  static async updateSampleNotes(sampleId: string, notes: string): Promise<SampleUpdateResult> {
    try {
      console.log(`Updating notes for sample ${sampleId}`);
      
      const { error } = await supabase
        .from('sample')
        .update({ 
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sampleId);

      if (error) {
        console.error('Error updating sample notes:', error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully updated notes for sample ${sampleId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error in updateSampleNotes:', error);
      return { success: false, error: 'Failed to update sample notes' };
    }
  }

  /**
   * Bulk update sample statuses
   */
  static async bulkUpdateStatus(
    sampleIds: string[], 
    status: SampleManagement['status']
  ): Promise<SampleUpdateResult> {
    try {
      console.log(`Bulk updating ${sampleIds.length} samples to status:`, status);
      
      const { error } = await supabase
        .from('sample')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', sampleIds);

      if (error) {
        console.error('Error bulk updating sample statuses:', error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully bulk updated ${sampleIds.length} samples`);
      return { success: true };
      
    } catch (error) {
      console.error('Error in bulkUpdateStatus:', error);
      return { success: false, error: 'Failed to bulk update sample statuses' };
    }
  }
}