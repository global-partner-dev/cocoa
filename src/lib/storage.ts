import { supabase } from './supabase'

export interface UploadResult {
  success: boolean
  filePath?: string
  error?: string
}

export const uploadEvaluatorDocument = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  try {
    console.log('Starting document upload for user:', userId, 'file:', file.name);
    
    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `evaluator-documents/${fileName}`

    console.log('Generated file path:', filePath);

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated for upload');
      return { success: false, error: 'User not authenticated' };
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('certification')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { success: false, error: `Storage upload failed: ${error.message}` }
    }

    console.log('File uploaded successfully to storage:', data.path);

    // Save document metadata to database
    console.log('Saving document metadata to database...');
    const documentData = {
      user_id: userId,
      file_name: file.name,
      file_path: data.path,
      file_size: file.size,
      file_type: file.type
    };
    console.log('Document data to insert:', documentData);

    const { error: dbError } = await supabase
      .from('evaluator_documents')
      .insert(documentData)

    if (dbError) {
      console.error('Database insert error:', dbError)
      console.error('Database error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      // Clean up uploaded file if database insert fails
      console.log('Cleaning up uploaded file due to database error...');
      await supabase.storage.from('certification').remove([data.path])
      return { success: false, error: `Database error: ${dbError.message}` }
    }

    console.log('Document metadata saved to database successfully');
    return { success: true, filePath: data.path }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload document' }
  }
}

export const deleteEvaluatorDocument = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('certification')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    // Also remove from database
    await supabase
      .from('evaluator_documents')
      .delete()
      .eq('file_path', filePath)

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

export const getDocumentUrl = async (filePath: string): Promise<string | null> => {
  try {
    const { data } = await supabase.storage
      .from('certification')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    return data?.signedUrl || null
  } catch (error) {
    console.error('Get URL error:', error)
    return null
  }
}