import { ContestsService, type ContestDisplay } from './contestsService';
import { formatDate } from './dateUtils';

// Interface for contests in the sample submission context
export interface SampleSubmissionContest {
  id: string;
  name: string;
  description: string;
  registrationDeadline: string;
  submissionDeadline: string;
  entryFee: number;
  sampleFee: number;
  status: 'open' | 'closed' | 'completed';
  categories: string[];
  requirements: string[];
}

// Transform database contest to sample submission format
const transformToSampleSubmissionContest = (contest: ContestDisplay): SampleSubmissionContest => {
  // Map database status to sample submission status
  const mapStatus = (dbStatus: ContestDisplay['status']): 'open' | 'closed' | 'completed' => {
    switch (dbStatus) {
      case 'active':
        return 'open'; // Only active contests are open for sample submission
      case 'completed':
        return 'completed';
      case 'upcoming':
      default:
        return 'closed';
    }
  };

  // Generate default categories based on contest type
  const generateCategories = (contestName: string): string[] => {
    const name = contestName.toLowerCase();
    const categories: string[] = [];
    
    if (name.includes('quality') || name.includes('international')) {
      categories.push('Fine Flavor', 'Bulk Cocoa', 'Organic', 'Fair Trade');
    } else if (name.includes('regional') || name.includes('traditional')) {
      categories.push('Traditional Processing', 'Heritage Varieties', 'Sustainable Production');
    } else if (name.includes('innovation') || name.includes('specialty')) {
      categories.push('Innovation', 'Unique Processing', 'Flavor Development');
    } else {
      // Default categories
      categories.push('Fine Flavor', 'Bulk Cocoa', 'Organic');
    }
    
    return categories;
  };

  // Generate default requirements
  const generateRequirements = (): string[] => [
    'Minimum 3kg sample required',
    'Traceability documentation mandatory',
    'Origin certification required',
    'Processing method documentation',
    'Harvest date within last 12 months'
  ];

  return {
    id: contest.id,
    name: contest.name,
    description: contest.description,
    registrationDeadline: contest.startDate, // Use start date as registration deadline
    submissionDeadline: contest.endDate, // Use end date as submission deadline
    entryFee: 0, // No entry fee required
    sampleFee: 0, // No sample fee required
    status: mapStatus(contest.status),
    categories: generateCategories(contest.name),
    requirements: generateRequirements()
  };
};

export class SampleSubmissionService {
  // Get contests available for sample submission (only active contests)
  static async getAvailableContests(): Promise<SampleSubmissionContest[]> {
    try {
      // Only get active contests (current time between start_date and end_date)
      const activeContests = await ContestsService.getContestsByStatus('active');
      return activeContests.map(transformToSampleSubmissionContest);
    } catch (error) {
      console.error('Error getting available contests for sample submission:', error);
      throw error;
    }
  }

  // Get a specific contest for sample submission
  static async getContestById(id: string): Promise<SampleSubmissionContest | null> {
    try {
      const contest = await ContestsService.getContestById(id);
      if (!contest) return null;
      
      return transformToSampleSubmissionContest(contest);
    } catch (error) {
      console.error('Error getting contest for sample submission:', error);
      throw error;
    }
  }

  // Check if a contest is available for sample submission (only active contests)
  static async isContestAvailable(contestId: string): Promise<boolean> {
    try {
      const contest = await ContestsService.getContestById(contestId);
      if (!contest) return false;
      
      // Only active contests are available for sample submission
      return contest.status === 'active';
    } catch (error) {
      console.error('Error checking contest availability:', error);
      return false;
    }
  }
}