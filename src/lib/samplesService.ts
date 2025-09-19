import { supabase } from './supabase';
import QRCode from 'qrcode';

// Sample status type
export type SampleStatus = 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated';

// Sample interface matching the database schema
export interface Sample {
  id: string;
  contest_id: string;
  user_id: string;
  tracking_code: string;
  qr_code_data: string;
  qr_code_url?: string;
  
  // Sample Origin Data
  country: string;
  department?: string;
  municipality?: string;
  district?: string;
  farm_name: string;
  cocoa_area_hectares?: number;
  
  // Sample Owner Data
  owner_full_name: string;
  identification_document?: string;
  phone_number?: string;
  email?: string;
  home_address?: string;
  belongs_to_cooperative: boolean;
  cooperative_name?: string;
  
  // Sample Information
  quantity: number;
  genetic_material?: string;
  crop_age?: number;
  sample_source_hectares?: number;
  moisture_content?: number;
  fermentation_percentage?: number;
  
  // Processing Information
  fermenter_type?: string;
  fermentation_time?: number;
  drying_type?: string;
  drying_time?: number;
  
  // Additional Information
  variety?: string;
  
  // Payment Information
  payment_method?: 'credit_card' | 'bank_transfer' | 'paypal';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_reference?: string;
  
  // Sample Status
  status: SampleStatus;
  
  // Terms Agreement
  agreed_to_terms: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Sample submission data (what we receive from the form)
export interface SampleSubmissionData {
  contestId: string;
  
  // Sample Origin Data
  country: string;
  department?: string;
  municipality?: string;
  district?: string;
  farmName: string;
  cocoaAreaHectares?: number;
  
  // Sample Owner Data
  ownerFullName: string;
  identificationDocument?: string;
  phoneNumber?: string;
  email?: string;
  homeAddress?: string;
  belongsToCooperative: boolean;
  cooperativeName?: string;
  
  // Sample Information
  quantity: number;
  geneticMaterial?: string;
  cropAge?: number;
  sampleSourceHectares?: number;
  moistureContent?: number;
  fermentationPercentage?: number;
  
  // Processing Information
  fermenterType?: string;
  fermentationTime?: number;
  dryingType?: string;
  dryingTime?: number;
  
  // Additional Information
  variety?: string;
  
  // Payment Information
  paymentMethod: 'credit_card' | 'bank_transfer' | 'paypal';
  
  // Terms Agreement
  agreedToTerms: boolean;
}

// QR Code data structure
export interface QRCodeData {
  sampleId: string;
  trackingCode: string;
  contestId: string;
  contestName: string;
  submissionDate: string;
  participantName: string;
}

export class SamplesService {
  // Generate tracking code
  static async generateTrackingCode(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_tracking_code');
      
      if (error) {
        console.error('Error generating tracking code:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in generateTrackingCode:', error);
      throw error;
    }
  }

  // Generate QR code data
  static generateQRCodeData(sample: Partial<Sample>, contestName: string, participantName: string): QRCodeData {
    return {
      sampleId: sample.id!,
      trackingCode: sample.tracking_code!,
      contestId: sample.contest_id!,
      contestName,
      submissionDate: new Date().toISOString(),
      participantName
    };
  }



  // Generate and upload QR code
  static async generateAndUploadQRCode(qrData: QRCodeData): Promise<string> {
    try {
      // Create the data to encode in the QR code
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
      const qrCodeData = JSON.stringify({
        trackingCode: qrData.trackingCode,
        sampleId: qrData.sampleId,
        contestId: qrData.contestId,
        contestName: qrData.contestName,
        participantName: qrData.participantName,
        submissionDate: qrData.submissionDate,
        verificationUrl: `${baseUrl}/verify/${qrData.trackingCode}`
      });

      // Generate QR code as data URL (works in browser)
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',  // Black dots
          light: '#FFFFFF'  // White background
        },
        errorCorrectionLevel: 'M'
      });
      
      // Convert data URL to blob
      const response = await fetch(qrCodeDataURL);
      const blob = await response.blob();
      const fileName = `qr-${qrData.trackingCode}.png`;
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, blob, {
          upsert: true // Allow overwriting if exists
        });
      
      if (error) {
        console.error('Error uploading QR code:', error);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Submit a new sample
  static async submitSample(submissionData: SampleSubmissionData): Promise<Sample> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user profile for participant name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw new Error('Failed to get user profile');
      }

      // Get contest name
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .select('name')
        .eq('id', submissionData.contestId)
        .single();
      
      if (contestError) {
        throw new Error('Failed to get contest information');
      }

      // Generate tracking code
      const trackingCode = await this.generateTrackingCode();



      // Prepare sample data for database
      const sampleData = {
        contest_id: submissionData.contestId,
        user_id: user.id,
        tracking_code: trackingCode,
        qr_code_data: '', // Will be updated after QR code generation
        
        // Sample Origin Data
        country: submissionData.country,
        department: submissionData.department || null,
        municipality: submissionData.municipality || null,
        district: submissionData.district || null,
        farm_name: submissionData.farmName,
        cocoa_area_hectares: submissionData.cocoaAreaHectares || null,
        
        // Sample Owner Data
        owner_full_name: submissionData.ownerFullName,
        identification_document: submissionData.identificationDocument || null,
        phone_number: submissionData.phoneNumber || null,
        email: submissionData.email || null,
        home_address: submissionData.homeAddress || null,
        belongs_to_cooperative: submissionData.belongsToCooperative,
        cooperative_name: submissionData.cooperativeName || null,
        
        // Sample Information
        quantity: submissionData.quantity,
        genetic_material: submissionData.geneticMaterial || null,
        crop_age: submissionData.cropAge || null,
        sample_source_hectares: submissionData.sampleSourceHectares || null,
        moisture_content: submissionData.moistureContent || null,
        fermentation_percentage: submissionData.fermentationPercentage || null,
        
        // Processing Information
        fermenter_type: submissionData.fermenterType || null,
        fermentation_time: submissionData.fermentationTime || null,
        drying_type: submissionData.dryingType || null,
        drying_time: submissionData.dryingTime || null,
        
        // Additional Information
        variety: submissionData.variety || null,
        
        // Payment Information
        payment_method: submissionData.paymentMethod,
        payment_status: 'pending' as const,
        
        // Sample Status
        status: 'submitted' as const,
        
        // Terms Agreement
        agreed_to_terms: submissionData.agreedToTerms
      };

      // Insert sample into database
      const { data: sample, error: insertError } = await supabase
        .from('samples')
        .insert(sampleData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting sample:', insertError);
        throw insertError;
      }

      // Generate QR code data
      const qrData = this.generateQRCodeData(sample, contest.name, profile.name);
      
      // Generate and upload QR code
      const qrCodeUrl = await this.generateAndUploadQRCode(qrData);

      // Update sample with QR code information
      const { data: updatedSample, error: updateError } = await supabase
        .from('samples')
        .update({
          qr_code_data: JSON.stringify(qrData),
          qr_code_url: qrCodeUrl
        })
        .eq('id', sample.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating sample with QR code:', updateError);
        throw updateError;
      }

      // IMPORTANT: Real payment is performed client-side via PayPal buttons.
      // This service no longer auto-records a payment here.
      // The Edge Function `paypal-capture` will mark payment and update sample status after capture.

      return updatedSample;
    } catch (error) {
      console.error('Error in submitSample:', error);
      throw error;
    }
  }

  // Get samples for current user
  static async getUserSamples(): Promise<Sample[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: samples, error } = await supabase
        .from('samples')
        .select(`
          *,
          contests:contest_id (
            name,
            location,
            start_date,
            end_date
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user samples:', error);
        throw error;
      }

      return samples || [];
    } catch (error) {
      console.error('Error in getUserSamples:', error);
      throw error;
    }
  }

  // Get sample by ID
  static async getSampleById(sampleId: string): Promise<Sample | null> {
    try {
      const { data: sample, error } = await supabase
        .from('samples')
        .select(`
          *,
          contests:contest_id (
            name,
            location,
            start_date,
            end_date
          )
        `)
        .eq('id', sampleId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Sample not found
        }
        console.error('Error fetching sample:', error);
        throw error;
      }

      return sample;
    } catch (error) {
      console.error('Error in getSampleById:', error);
      throw error;
    }
  }

  // Update sample status (for admin/staff use)
  static async updateSampleStatus(sampleId: string, status: SampleStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('samples')
        .update({ status })
        .eq('id', sampleId);

      if (error) {
        console.error('Error updating sample status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateSampleStatus:', error);
      throw error;
    }
  }

  // Get QR code download URL
  static async getQRCodeDownloadUrl(sampleId: string): Promise<string | null> {
    try {
      const sample = await this.getSampleById(sampleId);
      return sample?.qr_code_url || null;
    } catch (error) {
      console.error('Error getting QR code download URL:', error);
      throw error;
    }
  }

  // Get sample by tracking code (for QR verification)
  static async getSampleByTrackingCode(trackingCode: string): Promise<Sample | null> {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .eq('tracking_code', trackingCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting sample by tracking code:', error);
      throw error;
    }
  }
}