import { supabase } from './supabase';
import { UserRole } from '@/hooks/useAuth';

export interface UserWithDocuments {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  documents?: EvaluatorDocument[];
}

export interface EvaluatorDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface UserManagementResult {
  success: boolean;
  error?: string;
}

/**
 * Fetch all users with their documents (for evaluators)
 */
export const fetchAllUsers = async (): Promise<{ success: boolean; users?: UserWithDocuments[]; error?: string }> => {
  try {
    console.log('Fetching all users...');
    
    // Fetch users from profiles table
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return { success: false, error: usersError.message };
    }

    if (!users) {
      return { success: true, users: [] };
    }

    // Fetch documents for evaluators
    const evaluatorIds = users.filter(user => user.role === 'evaluator').map(user => user.id);
    
    let documentsMap: Record<string, EvaluatorDocument[]> = {};
    
    if (evaluatorIds.length > 0) {
      const { data: documents, error: documentsError } = await supabase
        .from('evaluator_documents')
        .select('*')
        .in('user_id', evaluatorIds)
        .order('uploaded_at', { ascending: false });

      if (documentsError) {
        console.warn('Error fetching evaluator documents:', documentsError);
        // Continue without documents rather than failing completely
      } else if (documents) {
        // Group documents by user_id
        documentsMap = documents.reduce((acc, doc) => {
          if (!acc[doc.user_id]) {
            acc[doc.user_id] = [];
          }
          acc[doc.user_id].push(doc);
          return acc;
        }, {} as Record<string, EvaluatorDocument[]>);
      }
    }

    // Combine users with their documents
    const usersWithDocuments: UserWithDocuments[] = users.map(user => ({
      ...user,
      documents: user.role === 'evaluator' ? (documentsMap[user.id] || []) : undefined
    }));

    console.log(`Fetched ${usersWithDocuments.length} users`);
    return { success: true, users: usersWithDocuments };
    
  } catch (error) {
    console.error('Error in fetchAllUsers:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
};

/**
 * Update user verification status (activate/deactivate)
 */
export const updateUserStatus = async (userId: string, isVerified: boolean): Promise<UserManagementResult> => {
  try {
    console.log(`Updating user ${userId} verification status to:`, isVerified);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully updated user ${userId} status`);
    return { success: true };
    
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    return { success: false, error: 'Failed to update user status' };
  }
};

/**
 * Delete a user and all associated data
 */
export const deleteUser = async (userId: string): Promise<UserManagementResult> => {
  try {
    console.log(`Deleting user ${userId}...`);
    
    // First, delete any evaluator documents from storage
    const { data: documents } = await supabase
      .from('evaluator_documents')
      .select('file_path')
      .eq('user_id', userId);

    if (documents && documents.length > 0) {
      console.log(`Deleting ${documents.length} documents from storage...`);
      const filePaths = documents.map(doc => doc.file_path);
      
      const { error: storageError } = await supabase.storage
        .from('certification')
        .remove(filePaths);
      
      if (storageError) {
        console.warn('Error deleting files from storage:', storageError);
        // Continue with user deletion even if file deletion fails
      }
    }

    // Delete evaluator documents from database (will cascade due to foreign key)
    const { error: documentsError } = await supabase
      .from('evaluator_documents')
      .delete()
      .eq('user_id', userId);

    if (documentsError) {
      console.error('Error deleting evaluator documents:', documentsError);
      return { success: false, error: documentsError.message };
    }

    // Delete user profile (this will also delete the auth user due to CASCADE)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return { success: false, error: profileError.message };
    }

    // Delete from auth.users table
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.warn('Error deleting auth user (may require service role key):', authError);
      // This might fail if we don't have admin privileges, but profile deletion should cascade
    }

    console.log(`Successfully deleted user ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return { success: false, error: 'Failed to delete user' };
  }
};

/**
 * Get signed URL for downloading evaluator document
 */
export const getDocumentDownloadUrl = async (filePath: string): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('Getting download URL for:', filePath);
    
    const { data, error } = await supabase.storage
      .from('certification')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return { success: false, error: error.message };
    }

    if (!data?.signedUrl) {
      return { success: false, error: 'No signed URL returned' };
    }

    console.log('Successfully created download URL');
    return { success: true, url: data.signedUrl };
    
  } catch (error) {
    console.error('Error in getDocumentDownloadUrl:', error);
    return { success: false, error: 'Failed to get download URL' };
  }
};

