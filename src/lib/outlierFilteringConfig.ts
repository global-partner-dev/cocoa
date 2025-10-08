/**
 * Outlier Filtering Configuration
 * Central configuration for outlier detection across the application
 */

import { OutlierConfig } from './outlierDetection';

/**
 * Global configuration for outlier filtering
 * Modify these values to adjust outlier detection behavior across the application
 */
export const OUTLIER_FILTERING_CONFIG = {
  /**
   * Enable or disable outlier filtering globally
   * Set to false to use original averaging without outlier detection
   */
  enabled: true,

  /**
   * Configuration for Initial Results (Sensory Evaluations)
   */
  initialResults: {
    enabled: true,
    config: {
      sigmaThreshold: 2.0,           // ±2 standard deviations (excludes ~5% of outliers)
      minEvaluations: 3,             // Need at least 3 evaluations before filtering
      strategy: 'reduce_weight',     // 'exclude' or 'reduce_weight'
      weightReductionFactor: 0.5,    // 50% weight for outliers when using 'reduce_weight'
    } as OutlierConfig,
  },

  /**
   * Configuration for Final Results (Final Evaluations)
   */
  finalResults: {
    enabled: true,
    config: {
      sigmaThreshold: 2.0,           // ±2 standard deviations
      minEvaluations: 3,             // Need at least 3 evaluations before filtering
      strategy: 'reduce_weight',     // 'exclude' or 'reduce_weight'
      weightReductionFactor: 0.5,    // 50% weight for outliers
    } as OutlierConfig,
  },
};

/**
 * Helper function to check if outlier filtering is enabled for initial results
 */
export function isOutlierFilteringEnabledForInitialResults(): boolean {
  return OUTLIER_FILTERING_CONFIG.enabled && OUTLIER_FILTERING_CONFIG.initialResults.enabled;
}

/**
 * Helper function to check if outlier filtering is enabled for final results
 */
export function isOutlierFilteringEnabledForFinalResults(): boolean {
  return OUTLIER_FILTERING_CONFIG.enabled && OUTLIER_FILTERING_CONFIG.finalResults.enabled;
}

/**
 * Get outlier config for initial results
 */
export function getInitialResultsOutlierConfig(): OutlierConfig {
  return OUTLIER_FILTERING_CONFIG.initialResults.config;
}

/**
 * Get outlier config for final results
 */
export function getFinalResultsOutlierConfig(): OutlierConfig {
  return OUTLIER_FILTERING_CONFIG.finalResults.config;
}