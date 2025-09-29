import { supabase } from './supabase';

export interface SampleDocument {
  id: string;
  sample_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export class SampleDocumentsService {
  private static readonly BUCKET_NAME = 'sample-documents';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  /**
   * Upload a document for a sample
   */
  static async uploadDocument(
    sampleId: string,
    file: File
  ): Promise<SampleDocument> {
    try {
      // Validate file
      this.validateFile(file);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${sampleId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Save document record to database
      const { data: documentData, error: dbError } = await supabase
        .from('sample_documents')
        .insert({
          sample_id: sampleId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([uploadData.path]);
        
        console.error('Error saving document record:', dbError);
        throw new Error(`Failed to save document record: ${dbError.message}`);
      }

      return documentData;
    } catch (error) {
      console.error('Error in uploadDocument:', error);
      throw error;
    }
  }

  /**
   * Upload multiple documents for a sample
   */
  static async uploadDocuments(
    sampleId: string,
    files: File[]
  ): Promise<SampleDocument[]> {
    const uploadPromises = files.map(file => this.uploadDocument(sampleId, file));
    return Promise.all(uploadPromises);
  }

  /**
   * Get all documents for a sample
   */
  static async getSampleDocuments(sampleId: string): Promise<SampleDocument[]> {
    try {
      const { data, error } = await supabase
        .from('sample_documents')
        .select('*')
        .eq('sample_id', sampleId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching sample documents:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSampleDocuments:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('sample_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Error fetching document:', fetchError);
        throw new Error(`Failed to fetch document: ${fetchError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([document.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('sample_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('Error deleting document record:', dbError);
        throw new Error(`Failed to delete document record: ${dbError.message}`);
      }
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a document
   */
  static async getDocumentUrl(filePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        throw new Error(`Failed to create download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getDocumentUrl:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}