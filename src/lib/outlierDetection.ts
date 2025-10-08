/**
 * Outlier Detection Utilities
 * Provides statistical functions for detecting and filtering outlier scores
 * using standard deviation-based methods
 */

export interface OutlierConfig {
  /** Standard deviation threshold multiplier (e.g., 2 for ±2σ) */
  sigmaThreshold: number;
  /** Minimum number of evaluations required before applying filter */
  minEvaluations: number;
  /** Strategy for handling outliers: 'exclude' or 'reduce_weight' */
  strategy: 'exclude' | 'reduce_weight';
  /** Weight reduction factor when strategy is 'reduce_weight' (0-1) */
  weightReductionFactor: number;
}

export interface EvaluationScore {
  /** The score value */
  score: number;
  /** Optional identifier for the evaluation */
  id?: string;
  /** Optional metadata */
  [key: string]: any;
}

export interface FilteredResult {
  /** Filtered average score */
  filteredAverage: number;
  /** Original average (without filtering) */
  originalAverage: number;
  /** Total number of evaluations */
  totalCount: number;
  /** Number of evaluations excluded or weighted */
  outlierCount: number;
  /** Standard deviation of the scores */
  standardDeviation: number;
  /** Mean value used for outlier detection */
  mean: number;
  /** Details about which evaluations were flagged as outliers */
  outlierDetails: Array<{
    score: number;
    id?: string;
    deviationFromMean: number;
    wasFiltered: boolean;
    appliedWeight: number;
  }>;
}

/**
 * Default configuration for outlier detection
 */
export const DEFAULT_OUTLIER_CONFIG: OutlierConfig = {
  sigmaThreshold: 2.0,           // ±2 standard deviations
  minEvaluations: 3,             // Need at least 3 evaluations
  strategy: 'reduce_weight',     // Reduce weight instead of complete exclusion
  weightReductionFactor: 0.5,    // 50% weight for outliers
};

/**
 * Calculate mean (average) of an array of numbers
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate sample standard deviation
 * Uses n-1 denominator (Bessel's correction) for unbiased estimation
 */
function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  
  const avg = mean !== undefined ? mean : calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Detect and filter outlier scores using standard deviation method
 * 
 * @param evaluations - Array of evaluation scores
 * @param config - Configuration for outlier detection (optional, uses defaults if not provided)
 * @returns FilteredResult with filtered average and metadata
 * 
 * @example
 * const scores = [
 *   { score: 8.5, id: 'eval1' },
 *   { score: 8.7, id: 'eval2' },
 *   { score: 8.6, id: 'eval3' },
 *   { score: 3.2, id: 'eval4' }, // outlier
 * ];
 * const result = filterOutliers(scores);
 * console.log(result.filteredAverage); // ~8.6 (outlier reduced/excluded)
 */
export function filterOutliers(
  evaluations: EvaluationScore[],
  config: Partial<OutlierConfig> = {}
): FilteredResult {
  // Merge with default config
  const cfg: OutlierConfig = { ...DEFAULT_OUTLIER_CONFIG, ...config };
  
  // Extract scores
  const scores = evaluations.map(e => e.score);
  
  // Calculate original statistics
  const originalAverage = calculateMean(scores);
  const mean = originalAverage;
  const standardDeviation = calculateStandardDeviation(scores, mean);
  
  // If not enough evaluations, return original average without filtering
  if (evaluations.length < cfg.minEvaluations) {
    return {
      filteredAverage: originalAverage,
      originalAverage,
      totalCount: evaluations.length,
      outlierCount: 0,
      standardDeviation,
      mean,
      outlierDetails: evaluations.map(e => ({
        score: e.score,
        id: e.id,
        deviationFromMean: e.score - mean,
        wasFiltered: false,
        appliedWeight: 1.0,
      })),
    };
  }
  
  // Calculate outlier threshold
  const threshold = cfg.sigmaThreshold * standardDeviation;
  
  // Identify outliers and calculate filtered average
  let weightedSum = 0;
  let totalWeight = 0;
  let outlierCount = 0;
  
  const outlierDetails = evaluations.map(evaluation => {
    const score = evaluation.score;
    const deviation = Math.abs(score - mean);
    const isOutlier = deviation > threshold;
    
    let weight = 1.0;
    if (isOutlier) {
      outlierCount++;
      weight = cfg.strategy === 'exclude' ? 0 : cfg.weightReductionFactor;
    }
    
    weightedSum += score * weight;
    totalWeight += weight;
    
    return {
      score,
      id: evaluation.id,
      deviationFromMean: score - mean,
      wasFiltered: isOutlier,
      appliedWeight: weight,
    };
  });
  
  // Calculate filtered average
  const filteredAverage = totalWeight > 0 ? weightedSum / totalWeight : originalAverage;
  
  return {
    filteredAverage,
    originalAverage,
    totalCount: evaluations.length,
    outlierCount,
    standardDeviation,
    mean,
    outlierDetails,
  };
}

/**
 * Simple wrapper for filtering an array of numeric scores
 * Returns just the filtered average
 * 
 * @param scores - Array of numeric scores
 * @param config - Configuration for outlier detection (optional)
 * @returns Filtered average score
 */
export function getFilteredAverage(
  scores: number[],
  config: Partial<OutlierConfig> = {}
): number {
  const evaluations = scores.map((score, index) => ({ score, id: `eval_${index}` }));
  const result = filterOutliers(evaluations, config);
  return result.filteredAverage;
}

/**
 * Check if a specific score is an outlier given a set of scores
 * 
 * @param score - The score to check
 * @param allScores - All scores in the dataset
 * @param config - Configuration for outlier detection (optional)
 * @returns true if the score is an outlier
 */
export function isOutlier(
  score: number,
  allScores: number[],
  config: Partial<OutlierConfig> = {}
): boolean {
  const cfg: OutlierConfig = { ...DEFAULT_OUTLIER_CONFIG, ...config };
  
  if (allScores.length < cfg.minEvaluations) return false;
  
  const mean = calculateMean(allScores);
  const stdDev = calculateStandardDeviation(allScores, mean);
  const threshold = cfg.sigmaThreshold * stdDev;
  
  return Math.abs(score - mean) > threshold;
}