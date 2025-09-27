import { supabase } from './supabase';
import QRCode from 'qrcode';

// Sample status type
export type SampleStatus = 'draft' | 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated';

// Sample interface matching the new database schema
export interface Sample {
  id: string;
  contest_id: string;
  user_id: string;
  tracking_code: string;
  qr_code_data: string;
  qr_code_url?: string;

  // Product type
  product_type: 'bean' | 'liquor' | 'chocolate';

  // Sample Origin Data (bean)
  country?: string;
  department?: string;
  municipality?: string;
  district?: string;
  farm_name?: string;
  cocoa_area_hectares?: number;

  // Sample Owner Data (bean)
  owner_full_name?: string;
  identification_document?: string;
  phone_number?: string;
  email?: string;
  home_address?: string;
  belongs_to_cooperative?: boolean;
  cooperative_name?: string;

  // Sample Information (bean)
  quantity?: number;
  genetic_material?: string;
  crop_age?: number;
  sample_source_hectares?: number;
  moisture_content?: number;
  fermentation_percentage?: number;

  // Processing Information (bean)
  fermenter_type?: string;
  fermentation_time?: number;
  drying_type?: string;
  drying_time?: number;

  // Additional Information (bean)
  variety?: string;
  lot_number?: string;
  harvest_date?: string; // ISO
  growing_altitude_masl?: number;
  additional_sample_description?: string | null;
  bean_certifications?: {
    organic?: boolean;
    fairtrade?: boolean;
    direct_trade?: boolean;
    none?: boolean;
    other?: boolean;
    other_text?: string;
  } | null;

  // Chocolate & Liquor details stored as JSON
  chocolate_details?: any | null;
  liquor_details?: any | null;

  // Sample Status
  status: SampleStatus;

  // Payment Information
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;

  // Terms Agreement
  agreed_to_terms: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Sample submission data (what we receive from the form)
export interface SampleSubmissionData {
  contestId: string;
  productType: 'bean' | 'liquor' | 'chocolate';

  // Bean Origin Data
  country?: string;
  department?: string;
  municipality?: string;
  district?: string;
  farmName?: string;
  cocoaAreaHectares?: number;
  
  // Bean Owner Data
  ownerFullName?: string;
  identificationDocument?: string;
  phoneNumber?: string;
  email?: string;
  homeAddress?: string;
  belongsToCooperative?: boolean;
  cooperativeName?: string;
  
  // Bean Sample Information
  quantity?: number;
  geneticMaterial?: string;
  cropAge?: number;
  sampleSourceHectares?: number;
  moistureContent?: number;
  fermentationPercentage?: number;
  
  // Bean Processing Information
  fermenterType?: string;
  fermentationTime?: number;
  dryingType?: string;
  dryingTime?: number;
  
  // Additional Information (bean)
  variety?: string;
  lotNumber?: string;
  harvestDate?: string; // YYYY-MM-DD
  growingAltitudeMasl?: number;
  additionalSampleDescription?: string;
  beanCertifications?: {
    organic?: boolean;
    fairtrade?: boolean;
    directTrade?: boolean;
    none?: boolean;
    other?: boolean;
    otherText?: string;
  };

  // Chocolate details
  chocolate?: {
    name: string;
    brand: string;
    batch: string;
    productionDate?: string;
    manufacturerCountry: string;
    cocoaOriginCountry: string;
    region?: string;
    municipality?: string;
    farmName?: string;
    cocoaVariety: string;
    fermentationMethod: string;
    dryingMethod: string;
    type: string;
    cocoaPercentage: number;
    cocoaButterPercentage?: number;
    sweeteners: string[];
    sweetenerOther?: string;
    lecithin: string[];
    naturalFlavors: string[];
    naturalFlavorsOther?: string;
    allergens: string[];
    certifications: string[];
    certificationsOther?: string;
    conchingTimeHours?: number;
    conchingTemperatureCelsius?: number;
    temperingMethod: string;
    finalGranulationMicrons?: number;
    competitionCategory: string;
  };

  // Liquor details
  liquor?: {
    name: string;
    brand: string;
    batch: string;
    processingDate?: string;
    countryProcessing: string;
    lecithinPercentage: number;
    cocoaButterPercentage?: number;
    grindingTemperatureCelsius?: number;
    grindingTimeHours?: number;
    processingMethod: string; // Artisanal, Industrial, Mixed
    cocoaOriginCountry: string;
    cocoaVariety?: string;
  };
  
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

      // Insert into main sample table
      const sampleData = {
        contest_id: submissionData.contestId,
        user_id: user.id,
        tracking_code: trackingCode,
        qr_code_data: '', // Will be updated after QR code generation
        status: 'submitted' as const,
        agreed_to_terms: submissionData.agreedToTerms,
        additional_sample_description: submissionData.additionalSampleDescription || null
      };

      const { data: sample, error: sampleInsertError } = await supabase
        .from('sample')
        .insert(sampleData)
        .select()
        .single();

      if (sampleInsertError) {
        console.error('Error inserting sample:', sampleInsertError);
        throw sampleInsertError;
      }

      // Insert into product-specific table
      let productSpecificData: any = { sample_id: sample.id };
      let productTable: string;

      if (submissionData.productType === 'bean') {
        productTable = 'cocoa_bean';
        Object.assign(productSpecificData, {
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
          belongs_to_cooperative: submissionData.belongsToCooperative ?? false,
          cooperative_name: submissionData.cooperativeName || null,
          // Sample Information
          quantity: submissionData.quantity ?? 3,
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
          lot_number: submissionData.lotNumber || null,
          harvest_date: submissionData.harvestDate || null,
          growing_altitude_masl: submissionData.growingAltitudeMasl || null,
          bean_certifications: submissionData.beanCertifications ? {
            organic: !!submissionData.beanCertifications.organic,
            fairtrade: !!submissionData.beanCertifications.fairtrade,
            direct_trade: !!submissionData.beanCertifications.directTrade,
            none: !!submissionData.beanCertifications.none,
            other: !!submissionData.beanCertifications.other,
            other_text: submissionData.beanCertifications.otherText || null,
          } : null,
        });
      } else if (submissionData.productType === 'chocolate') {
        productTable = 'chocolate';
        if (submissionData.chocolate) {
          Object.assign(productSpecificData, {
            name: submissionData.chocolate.name,
            brand: submissionData.chocolate.brand,
            batch: submissionData.chocolate.batch,
            production_date: submissionData.chocolate.productionDate || null,
            manufacturer_country: submissionData.chocolate.manufacturerCountry,
            cocoa_origin_country: submissionData.chocolate.cocoaOriginCountry,
            region: submissionData.chocolate.region || null,
            municipality: submissionData.chocolate.municipality || null,
            farm_name: submissionData.chocolate.farmName || null,
            cocoa_variety: submissionData.chocolate.cocoaVariety,
            fermentation_method: submissionData.chocolate.fermentationMethod,
            drying_method: submissionData.chocolate.dryingMethod,
            type: submissionData.chocolate.type,
            cocoa_percentage: submissionData.chocolate.cocoaPercentage,
            cocoa_butter_percentage: submissionData.chocolate.cocoaButterPercentage || null,
            sweeteners: submissionData.chocolate.sweeteners || null,
            sweetener_other: submissionData.chocolate.sweetenerOther || null,
            lecithin: submissionData.chocolate.lecithin || null,
            natural_flavors: submissionData.chocolate.naturalFlavors || null,
            natural_flavors_other: submissionData.chocolate.naturalFlavorsOther || null,
            allergens: submissionData.chocolate.allergens || null,
            certifications: submissionData.chocolate.certifications || null,
            certifications_other: submissionData.chocolate.certificationsOther || null,
            conching_time_hours: submissionData.chocolate.conchingTimeHours || null,
            conching_temperature_celsius: submissionData.chocolate.conchingTemperatureCelsius || null,
            tempering_method: submissionData.chocolate.temperingMethod,
            final_granulation_microns: submissionData.chocolate.finalGranulationMicrons || null,
            competition_category: submissionData.chocolate.competitionCategory || null,
            lot_number: submissionData.lotNumber || null,
          });
        }
      } else if (submissionData.productType === 'liquor') {
        productTable = 'cocoa_liquor';
        if (submissionData.liquor) {
          Object.assign(productSpecificData, {
            name: submissionData.liquor.name,
            brand: submissionData.liquor.brand,
            batch: submissionData.liquor.batch,
            processing_date: submissionData.liquor.processingDate || null,
            country_processing: submissionData.liquor.countryProcessing,
            lecithin_percentage: submissionData.liquor.lecithinPercentage,
            cocoa_butter_percentage: submissionData.liquor.cocoaButterPercentage || null,
            grinding_temperature_celsius: submissionData.liquor.grindingTemperatureCelsius || null,
            grinding_time_hours: submissionData.liquor.grindingTimeHours || null,
            processing_method: submissionData.liquor.processingMethod,
            cocoa_origin_country: submissionData.liquor.cocoaOriginCountry,
            cocoa_variety: submissionData.liquor.cocoaVariety || null,
            lot_number: submissionData.lotNumber || null,
            harvest_date: submissionData.harvestDate || null,
          });
        }
      } else {
        throw new Error('Invalid product type');
      }

      const { error: productInsertError } = await supabase
        .from(productTable)
        .insert(productSpecificData);

      if (productInsertError) {
        console.error('Error inserting product-specific data:', productInsertError);
        // Rollback sample insert if product insert fails
        await supabase.from('sample').delete().eq('id', sample.id);
        throw productInsertError;
      }

      // Generate QR code data
      const qrData = this.generateQRCodeData(sample, contest.name, profile.name);

      // Generate and upload QR code
      const qrCodeUrl = await this.generateAndUploadQRCode(qrData);

      // Update sample with QR code information
      const { data: updatedSample, error: updateError } = await supabase
        .from('sample')
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

      // Fetch the complete sample data with product type
      const completeSample = await this.getSampleById(updatedSample.id);
      if (!completeSample) {
        throw new Error('Failed to retrieve complete sample data');
      }

      return completeSample;
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

  // Draft-related methods

  // Save sample as draft
  static async saveDraft(submissionData: SampleSubmissionData): Promise<Sample> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Insert into main sample table for draft
      const sampleData = {
        contest_id: submissionData.contestId,
        user_id: user.id,
        status: 'draft',
        agreed_to_terms: submissionData.agreedToTerms || false,
        tracking_code: null, // Will be generated when submitted
        qr_code_data: null, // Will be generated when submitted
        additional_sample_description: submissionData.additionalSampleDescription || null,
      };

      const { data: sample, error: sampleInsertError } = await supabase
        .from('sample')
        .insert(sampleData)
        .select()
        .single();

      if (sampleInsertError) {
        console.error('Error inserting draft sample:', sampleInsertError);
        throw sampleInsertError;
      }

      // Insert into product-specific table
      let productSpecificData: any = { sample_id: sample.id };
      let productTable: string;

      if (submissionData.productType === 'bean') {
        productTable = 'cocoa_bean';
        Object.assign(productSpecificData, {
          country: submissionData.country,
          department: submissionData.department,
          municipality: submissionData.municipality,
          district: submissionData.district,
          farm_name: submissionData.farmName,
          cocoa_area_hectares: submissionData.cocoaAreaHectares,
          owner_full_name: submissionData.ownerFullName,
          identification_document: submissionData.identificationDocument,
          phone_number: submissionData.phoneNumber,
          email: submissionData.email,
          home_address: submissionData.homeAddress,
          belongs_to_cooperative: submissionData.belongsToCooperative,
          cooperative_name: submissionData.cooperativeName,
          quantity: submissionData.quantity,
          genetic_material: submissionData.geneticMaterial,
          crop_age: submissionData.cropAge,
          sample_source_hectares: submissionData.sampleSourceHectares,
          moisture_content: submissionData.moistureContent,
          fermentation_percentage: submissionData.fermentationPercentage,
          fermenter_type: submissionData.fermenterType,
          fermentation_time: submissionData.fermentationTime,
          drying_type: submissionData.dryingType,
          drying_time: submissionData.dryingTime,
          variety: submissionData.variety,
          lot_number: submissionData.lotNumber,
          harvest_date: submissionData.harvestDate,
          growing_altitude_masl: submissionData.growingAltitudeMasl,
          bean_certifications: submissionData.beanCertifications ? {
            organic: !!submissionData.beanCertifications.organic,
            fairtrade: !!submissionData.beanCertifications.fairtrade,
            direct_trade: !!submissionData.beanCertifications.directTrade,
            none: !!submissionData.beanCertifications.none,
            other: !!submissionData.beanCertifications.other,
            other_text: submissionData.beanCertifications.otherText || null,
          } : null,
        });
      } else if (submissionData.productType === 'chocolate') {
        productTable = 'chocolate';
        if (submissionData.chocolate) {
          Object.assign(productSpecificData, {
            name: submissionData.chocolate.name,
            brand: submissionData.chocolate.brand,
            batch: submissionData.chocolate.batch,
            production_date: submissionData.chocolate.productionDate || null,
            manufacturer_country: submissionData.chocolate.manufacturerCountry,
            cocoa_origin_country: submissionData.chocolate.cocoaOriginCountry,
            region: submissionData.chocolate.region || null,
            municipality: submissionData.chocolate.municipality || null,
            farm_name: submissionData.chocolate.farmName || null,
            cocoa_variety: submissionData.chocolate.cocoaVariety,
            fermentation_method: submissionData.chocolate.fermentationMethod,
            drying_method: submissionData.chocolate.dryingMethod,
            type: submissionData.chocolate.type,
            cocoa_percentage: submissionData.chocolate.cocoaPercentage,
            cocoa_butter_percentage: submissionData.chocolate.cocoaButterPercentage || null,
            sweeteners: submissionData.chocolate.sweeteners || null,
            sweetener_other: submissionData.chocolate.sweetenerOther || null,
            lecithin: submissionData.chocolate.lecithin || null,
            natural_flavors: submissionData.chocolate.naturalFlavors || null,
            natural_flavors_other: submissionData.chocolate.naturalFlavorsOther || null,
            allergens: submissionData.chocolate.allergens || null,
            certifications: submissionData.chocolate.certifications || null,
            certifications_other: submissionData.chocolate.certificationsOther || null,
            conching_time_hours: submissionData.chocolate.conchingTimeHours || null,
            conching_temperature_celsius: submissionData.chocolate.conchingTemperatureCelsius || null,
            tempering_method: submissionData.chocolate.temperingMethod,
            final_granulation_microns: submissionData.chocolate.finalGranulationMicrons || null,
            competition_category: submissionData.chocolate.competitionCategory || null,
            lot_number: submissionData.lotNumber || null,
          });
        }
      } else if (submissionData.productType === 'liquor') {
        productTable = 'cocoa_liquor';
        if (submissionData.liquor) {
          Object.assign(productSpecificData, {
            name: submissionData.liquor.name,
            brand: submissionData.liquor.brand,
            batch: submissionData.liquor.batch,
            processing_date: submissionData.liquor.processingDate || null,
            country_processing: submissionData.liquor.countryProcessing,
            lecithin_percentage: submissionData.liquor.lecithinPercentage,
            cocoa_butter_percentage: submissionData.liquor.cocoaButterPercentage || null,
            grinding_temperature_celsius: submissionData.liquor.grindingTemperatureCelsius || null,
            grinding_time_hours: submissionData.liquor.grindingTimeHours || null,
            processing_method: submissionData.liquor.processingMethod,
            cocoa_origin_country: submissionData.liquor.cocoaOriginCountry,
            cocoa_variety: submissionData.liquor.cocoaVariety || null,
            lot_number: submissionData.lotNumber || null,
            harvest_date: submissionData.harvestDate || null,
          });
        }
      } else {
        throw new Error('Invalid product type');
      }

      const { error: productInsertError } = await supabase
        .from(productTable)
        .insert(productSpecificData);

      if (productInsertError) {
        console.error('Error inserting product-specific draft data:', productInsertError);
        // Rollback sample insert if product insert fails
        await supabase.from('sample').delete().eq('id', sample.id);
        throw productInsertError;
      }

      // Fetch the complete draft data
      const completeDraft = await this.getSampleById(sample.id);
      if (!completeDraft) {
        throw new Error('Failed to retrieve complete draft data');
      }

      return completeDraft;
    } catch (error) {
      console.error('Error in saveDraft:', error);
      throw error;
    }
  }

  // Update existing draft
  static async updateDraft(sampleId: string, submissionData: SampleSubmissionData): Promise<Sample> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Update the main sample table
      const sampleUpdateData = {
        contest_id: submissionData.contestId,
        agreed_to_terms: submissionData.agreedToTerms || false,
        additional_sample_description: submissionData.additionalSampleDescription || null,
      };

      const { error: sampleUpdateError } = await supabase
        .from('sample')
        .update(sampleUpdateData)
        .eq('id', sampleId)
        .eq('user_id', user.id)
        .eq('status', 'draft');

      if (sampleUpdateError) {
        console.error('Error updating draft sample:', sampleUpdateError);
        throw sampleUpdateError;
      }

      // Update product-specific table
      let productUpdateData: any = {};
      let productTable: string;

      if (submissionData.productType === 'bean') {
        productTable = 'cocoa_bean';
        Object.assign(productUpdateData, {
          country: submissionData.country,
          department: submissionData.department,
          municipality: submissionData.municipality,
          district: submissionData.district,
          farm_name: submissionData.farmName,
          cocoa_area_hectares: submissionData.cocoaAreaHectares,
          owner_full_name: submissionData.ownerFullName,
          identification_document: submissionData.identificationDocument,
          phone_number: submissionData.phoneNumber,
          email: submissionData.email,
          home_address: submissionData.homeAddress,
          belongs_to_cooperative: submissionData.belongsToCooperative,
          cooperative_name: submissionData.cooperativeName,
          quantity: submissionData.quantity,
          genetic_material: submissionData.geneticMaterial,
          crop_age: submissionData.cropAge,
          sample_source_hectares: submissionData.sampleSourceHectares,
          moisture_content: submissionData.moistureContent,
          fermentation_percentage: submissionData.fermentationPercentage,
          fermenter_type: submissionData.fermenterType,
          fermentation_time: submissionData.fermentationTime,
          drying_type: submissionData.dryingType,
          drying_time: submissionData.dryingTime,
          variety: submissionData.variety,
          lot_number: submissionData.lotNumber,
          harvest_date: submissionData.harvestDate,
          growing_altitude_masl: submissionData.growingAltitudeMasl,
          bean_certifications: submissionData.beanCertifications ? {
            organic: !!submissionData.beanCertifications.organic,
            fairtrade: !!submissionData.beanCertifications.fairtrade,
            direct_trade: !!submissionData.beanCertifications.directTrade,
            none: !!submissionData.beanCertifications.none,
            other: !!submissionData.beanCertifications.other,
            other_text: submissionData.beanCertifications.otherText || null,
          } : null,
        });
      } else if (submissionData.productType === 'chocolate') {
        productTable = 'chocolate';
        if (submissionData.chocolate) {
          Object.assign(productUpdateData, {
            name: submissionData.chocolate.name,
            brand: submissionData.chocolate.brand,
            batch: submissionData.chocolate.batch,
            production_date: submissionData.chocolate.productionDate || null,
            manufacturer_country: submissionData.chocolate.manufacturerCountry,
            cocoa_origin_country: submissionData.chocolate.cocoaOriginCountry,
            region: submissionData.chocolate.region || null,
            municipality: submissionData.chocolate.municipality || null,
            farm_name: submissionData.chocolate.farmName || null,
            cocoa_variety: submissionData.chocolate.cocoaVariety,
            fermentation_method: submissionData.chocolate.fermentationMethod,
            drying_method: submissionData.chocolate.dryingMethod,
            type: submissionData.chocolate.type,
            cocoa_percentage: submissionData.chocolate.cocoaPercentage,
            cocoa_butter_percentage: submissionData.chocolate.cocoaButterPercentage || null,
            sweeteners: submissionData.chocolate.sweeteners || null,
            sweetener_other: submissionData.chocolate.sweetenerOther || null,
            lecithin: submissionData.chocolate.lecithin || null,
            natural_flavors: submissionData.chocolate.naturalFlavors || null,
            natural_flavors_other: submissionData.chocolate.naturalFlavorsOther || null,
            allergens: submissionData.chocolate.allergens || null,
            certifications: submissionData.chocolate.certifications || null,
            certifications_other: submissionData.chocolate.certificationsOther || null,
            conching_time_hours: submissionData.chocolate.conchingTimeHours || null,
            conching_temperature_celsius: submissionData.chocolate.conchingTemperatureCelsius || null,
            tempering_method: submissionData.chocolate.temperingMethod,
            final_granulation_microns: submissionData.chocolate.finalGranulationMicrons || null,
            competition_category: submissionData.chocolate.competitionCategory || null,
            lot_number: submissionData.lotNumber || null,
          });
        }
      } else if (submissionData.productType === 'liquor') {
        productTable = 'cocoa_liquor';
        if (submissionData.liquor) {
          Object.assign(productUpdateData, {
            name: submissionData.liquor.name,
            brand: submissionData.liquor.brand,
            batch: submissionData.liquor.batch,
            processing_date: submissionData.liquor.processingDate || null,
            country_processing: submissionData.liquor.countryProcessing,
            lecithin_percentage: submissionData.liquor.lecithinPercentage,
            cocoa_butter_percentage: submissionData.liquor.cocoaButterPercentage || null,
            grinding_temperature_celsius: submissionData.liquor.grindingTemperatureCelsius || null,
            grinding_time_hours: submissionData.liquor.grindingTimeHours || null,
            processing_method: submissionData.liquor.processingMethod,
            cocoa_origin_country: submissionData.liquor.cocoaOriginCountry,
            cocoa_variety: submissionData.liquor.cocoaVariety || null,
            lot_number: submissionData.lotNumber || null,
            harvest_date: submissionData.harvestDate || null,
          });
        }
      } else {
        throw new Error('Invalid product type');
      }

      const { error: productUpdateError } = await supabase
        .from(productTable)
        .update(productUpdateData)
        .eq('sample_id', sampleId);

      if (productUpdateError) {
        console.error('Error updating product-specific draft data:', productUpdateError);
        throw productUpdateError;
      }

      // Fetch the updated draft data
      const updatedDraft = await this.getSampleById(sampleId);
      if (!updatedDraft) {
        throw new Error('Failed to retrieve updated draft data');
      }

      return updatedDraft;
    } catch (error) {
      console.error('Error in updateDraft:', error);
      throw error;
    }
  }

  // Get user's draft samples
  static async getUserDrafts(): Promise<Sample[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: drafts, error } = await supabase
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
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user drafts:', error);
        throw error;
      }

      return drafts || [];
    } catch (error) {
      console.error('Error in getUserDrafts:', error);
      throw error;
    }
  }

  // Submit a draft (convert to submitted status)
  static async submitDraft(sampleId: string): Promise<Sample> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get the draft first to validate it
      const draft = await this.getSampleById(sampleId);
      if (!draft || draft.status !== 'draft' || draft.user_id !== user.id) {
        throw new Error('Draft not found or not accessible');
      }

      // Generate tracking code and QR code
      const trackingCode = await this.generateTrackingCode();
      const qrCodeData = JSON.stringify({
        trackingCode,
        sampleId: draft.id,
        contestId: draft.contest_id,
        submissionDate: new Date().toISOString()
      });

      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData);
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      
      // Upload QR code to storage
      const qrCodeFileName = `${trackingCode}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(qrCodeFileName, qrCodeBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading QR code:', uploadError);
        throw uploadError;
      }

      // Get public URL for the QR code
      const { data: { publicUrl } } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(qrCodeFileName);

      // Update the draft to submitted status
      const { data: submittedSample, error } = await supabase
        .from('sample')
        .update({
          status: 'submitted',
          tracking_code: trackingCode,
          qr_code_data: qrCodeData,
          qr_code_url: publicUrl,
          agreed_to_terms: true // Must be true for submission
        })
        .eq('id', sampleId)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {
        console.error('Error submitting draft:', error);
        throw error;
      }

      // Fetch the complete submitted sample data
      const completeSample = await this.getSampleById(sampleId);
      if (!completeSample) {
        throw new Error('Failed to retrieve complete sample data');
      }

      return completeSample;
    } catch (error) {
      console.error('Error in submitDraft:', error);
      throw error;
    }
  }

  // Delete a draft
  static async deleteDraft(sampleId: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('samples')
        .delete()
        .eq('id', sampleId)
        .eq('user_id', user.id)
        .eq('status', 'draft');

      if (error) {
        console.error('Error deleting draft:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteDraft:', error);
      throw error;
    }
  }

  // Helper method to generate tracking code
  private static async generateTrackingCode(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_tracking_code');
    if (error) {
      console.error('Error generating tracking code:', error);
      throw error;
    }
    return data;
  }
}