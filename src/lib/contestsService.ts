import { supabase } from './supabase';
import type { Database } from './supabase';
import { calculateContestStatus } from './dateUtils';

export type Contest = Database['public']['Tables']['contests']['Row'];
export type ContestInsert = Database['public']['Tables']['contests']['Insert'];
export type ContestUpdate = Database['public']['Tables']['contests']['Update'];

// Transform database contest to match the existing interface
export interface ContestDisplay {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  samplePrice: number;
  evaluationPrice: number;
  finalEvaluation: boolean;
  status: 'upcoming' | 'active' | 'completed';
}

// Note: calculateContestStatus is now imported from dateUtils

// Transform database contest to display format
const transformContestToDisplay = (contest: Contest): ContestDisplay => ({
  id: contest.id,
  name: contest.name,
  description: contest.description,
  location: contest.location,
  startDate: contest.start_date,
  endDate: contest.end_date,
  samplePrice: contest.sample_price,
  evaluationPrice: (contest as any).evaluation_price ?? 0,
  finalEvaluation: (contest as any).final_evaluation ?? false,
  status: calculateContestStatus(contest.start_date, contest.end_date)
});

// Transform display format to database format (excluding status since it's calculated)
const transformDisplayToContest = (contest: Omit<ContestDisplay, 'id' | 'status'>, createdBy: string): ContestInsert => ({
  name: contest.name,
  description: contest.description,
  location: contest.location,
  start_date: contest.startDate,
  end_date: contest.endDate,
  sample_price: contest.samplePrice,
  evaluation_price: contest.evaluationPrice,
  final_evaluation: contest.finalEvaluation ?? false,
  created_by: createdBy
});

export class ContestsService {
  // Get all contests
  static async getAllContests(): Promise<ContestDisplay[]> {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contests:', error);
        throw new Error(`Failed to fetch contests: ${error.message}`);
      }

      return data?.map(transformContestToDisplay) || [];
    } catch (error) {
      console.error('Error in getAllContests:', error);
      throw error;
    }
  }

  // Get contest by ID
  static async getContestById(id: string): Promise<ContestDisplay | null> {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Contest not found
        }
        console.error('Error fetching contest:', error);
        throw new Error(`Failed to fetch contest: ${error.message}`);
      }

      return data ? transformContestToDisplay(data) : null;
    } catch (error) {
      console.error('Error in getContestById:', error);
      throw error;
    }
  }

  // Create a new contest
  static async createContest(contest: Omit<ContestDisplay, 'id' | 'status'>): Promise<ContestDisplay> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if user is a director and already has an active contest
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'director') {
        const { data: hasActive, error: checkError } = await supabase
          .rpc('director_has_active_contest', { director_id: user.id });

        if (checkError) {
          console.error('Error checking active contests:', checkError);
          throw new Error('Failed to validate contest creation');
        }

        if (hasActive) {
          throw new Error('You already have an active contest. Only one active contest per director is allowed.');
        }
      }

      const contestData = transformDisplayToContest(contest, user.id);

      const { data, error } = await supabase
        .from('contests')
        .insert(contestData)
        .select()
        .single();

      if (error) {
        console.error('Error creating contest:', error);
        // Check if error is from the trigger
        if (error.message.includes('already has an active contest')) {
          throw new Error('You already have an active contest. Only one active contest per director is allowed.');
        }
        throw new Error(`Failed to create contest: ${error.message}`);
      }

      return transformContestToDisplay(data);
    } catch (error) {
      console.error('Error in createContest:', error);
      throw error;
    }
  }

  // Update an existing contest
  static async updateContest(id: string, updates: Partial<Omit<ContestDisplay, 'id' | 'status'>>): Promise<ContestDisplay> {
    try {
      const updateData: ContestUpdate = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.samplePrice !== undefined) updateData.sample_price = updates.samplePrice;
      if ((updates as any).evaluationPrice !== undefined) (updateData as any).evaluation_price = (updates as any).evaluationPrice;
      if ((updates as any).finalEvaluation !== undefined) (updateData as any).final_evaluation = (updates as any).finalEvaluation;

      const { data, error } = await supabase
        .from('contests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating contest:', error);
        throw new Error(`Failed to update contest: ${error.message}`);
      }

      return transformContestToDisplay(data);
    } catch (error) {
      console.error('Error in updateContest:', error);
      throw error;
    }
  }

  // Delete a contest
  static async deleteContest(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contest:', error);
        throw new Error(`Failed to delete contest: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteContest:', error);
      throw error;
    }
  }

  /** Mark a contest final_evaluation = true without changing status/dates. */
  static async startFinalEvaluation(id: string): Promise<ContestDisplay> {
    try {
      const { data, error } = await supabase
        .from('contests')
        .update({ final_evaluation: true })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return transformContestToDisplay(data);
    } catch (error) {
      console.error('Error in startFinalEvaluation:', error);
      throw error;
    }
  }

  // Get contests by status (calculated dynamically)
  static async getContestsByStatus(status: 'upcoming' | 'active' | 'completed'): Promise<ContestDisplay[]> {
    try {
      // Get all contests and filter by calculated status
      const allContests = await this.getAllContests();
      return allContests.filter(contest => contest.status === status);
    } catch (error) {
      console.error('Error in getContestsByStatus:', error);
      throw error;
    }
  }

  // Get contests available for sample submission (upcoming and active only)
  static async getAvailableContests(): Promise<ContestDisplay[]> {
    try {
      const allContests = await this.getAllContests();
      // Filter for contests that are upcoming or active (participants can submit samples)
      return allContests.filter(contest => 
        contest.status === 'upcoming' || contest.status === 'active'
      );
    } catch (error) {
      console.error('Error in getAvailableContests:', error);
      throw error;
    }
  }

  // Check if user has permission to manage contests
  static async canManageContests(): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return false;
      }

      return profile.role === 'admin' || profile.role === 'director';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  // Get contests created by the current director
  static async getDirectorContests(): Promise<ContestDisplay[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // If admin, return all contests
      if (profile?.role === 'admin') {
        return this.getAllContests();
      }

      // If director, return only their contests (RLS will handle this automatically)
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching director contests:', error);
        throw new Error(`Failed to fetch contests: ${error.message}`);
      }

      return data?.map(transformContestToDisplay) || [];
    } catch (error) {
      console.error('Error in getDirectorContests:', error);
      throw error;
    }
  }

  // Check if director has an active contest
  static async directorHasActiveContest(): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return false;
      }

      const { data, error } = await supabase
        .rpc('director_has_active_contest', { director_id: user.id });

      if (error) {
        console.error('Error checking active contest:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in directorHasActiveContest:', error);
      return false;
    }
  }

  // Cleanup expired contests (admin only)
  static async cleanupExpiredContests(): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Only admins can cleanup expired contests');
      }

      const { error } = await supabase.rpc('cleanup_expired_contests');

      if (error) {
        console.error('Error cleaning up expired contests:', error);
        throw new Error(`Failed to cleanup expired contests: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredContests:', error);
      throw error;
    }
  }
}