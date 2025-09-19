// Date utility functions for contest management

/**
 * Calculate contest status based on start and end dates
 */
export const calculateContestStatus = (startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set time to start of day for accurate comparison
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999); // End of day for end date
  
  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end) {
    return 'active';
  } else {
    return 'completed';
  }
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date range for display
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (startDate === endDate) {
    return start;
  }
  
  return `${start} - ${end}`;
};

/**
 * Validate that end date is after start date
 */
export const validateDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end >= start;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Check if a date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  
  date.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);
  
  return date < today;
};

/**
 * Get status color class for UI
 */
export const getStatusColorClass = (status: 'upcoming' | 'active' | 'completed'): string => {
  switch (status) {
    case 'upcoming':
      return 'text-blue-600 bg-blue-100';
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'completed':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

/**
 * Get days until contest starts (negative if already started/ended)
 */
export const getDaysUntilStart = (startDate: string): number => {
  const now = new Date();
  const start = new Date(startDate);
  
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = start.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get contest duration in days
 */
export const getContestDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
};