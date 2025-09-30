/**
 * Chocolate Sensory Evaluation - Grading System
 * 
 * This module implements the weighted scoring system for chocolate sensory evaluation.
 * The scoring is based on five main categories with different percentage weights.
 */

export interface ChocolateScores {
  appearance: {
    color: number;
    gloss: number;
    surfaceHomogeneity: number;
  };
  aroma: {
    aromaIntensity: number;
    aromaQuality: number;
    specificNotes?: {
      floral: number;
      fruity: number;
      toasted: number;
      hazelnut: number;
      earthy: number;
      spicy: number;
      milky: number;
      woody: number;
    };
  };
  texture: {
    smoothness: number;
    melting: number;
    body: number;
  };
  flavor: {
    sweetness: number;
    bitterness: number;
    acidity: number;
    flavorIntensity: number;
    flavorNotes?: {
      citrus: number;
      redFruits: number;
      nuts: number;
      caramel: number;
      malt: number;
      wood: number;
      spices: number;
    };
  };
  aftertaste: {
    persistence: number;
    aftertasteQuality: number;
    finalBalance: number;
  };
}

/**
 * Category weights for chocolate evaluation
 * Total: 100%
 */
export const CHOCOLATE_CATEGORY_WEIGHTS = {
  FLAVOR: 0.40,      // 40% - Most critical aspect
  AROMA: 0.25,       // 25% - Second most important
  TEXTURE: 0.20,     // 20% - Key element in oral sensory experience
  AFTERTASTE: 0.10,  // 10% - Reflects persistence and balance
  APPEARANCE: 0.05,  // 5% - Less critical but necessary visual aspect
} as const;

/**
 * Calculate the appearance score
 * Formula: (Color + Gloss + Surface Homogeneity) ÷ 3
 * 
 * @param appearance - Appearance attributes (0-10 scale each)
 * @returns Average appearance score (0-10)
 */
export function calculateAppearanceScore(appearance: ChocolateScores['appearance']): number {
  return (appearance.color + appearance.gloss + appearance.surfaceHomogeneity) / 3;
}

/**
 * Calculate the aroma score
 * Formula: (Aromatic Intensity + Aromatic Quality) ÷ 2
 * 
 * Note: Specific aroma notes (floral, fruity, woody, etc.) are descriptive only
 * and do not affect the numerical score.
 * 
 * @param aroma - Aroma attributes (0-10 scale each)
 * @returns Average aroma score (0-10)
 */
export function calculateAromaScore(aroma: ChocolateScores['aroma']): number {
  return (aroma.aromaIntensity + aroma.aromaQuality) / 2;
}

/**
 * Calculate the texture score
 * Formula: (Smoothness + Melting + Body) ÷ 3
 * 
 * @param texture - Texture attributes (0-10 scale each)
 * @returns Average texture score (0-10)
 */
export function calculateTextureScore(texture: ChocolateScores['texture']): number {
  return (texture.smoothness + texture.melting + texture.body) / 3;
}

/**
 * Calculate the flavor score
 * Formula: (Sweetness + Bitterness + Acidity + Flavor Intensity) ÷ 4
 * 
 * Note: Flavor notes (citrus, red fruits, nuts, etc.) are descriptive only
 * and do not affect the numerical score.
 * 
 * @param flavor - Flavor attributes (0-10 scale each)
 * @returns Average flavor score (0-10)
 */
export function calculateFlavorScore(flavor: ChocolateScores['flavor']): number {
  return (
    flavor.sweetness +
    flavor.bitterness +
    flavor.acidity +
    flavor.flavorIntensity
  ) / 4;
}

/**
 * Calculate the aftertaste score
 * Formula: (Persistence + Aftertaste Quality + Final Balance) ÷ 3
 * 
 * @param aftertaste - Aftertaste attributes (0-10 scale each)
 * @returns Average aftertaste score (0-10)
 */
export function calculateAftertasteScore(aftertaste: ChocolateScores['aftertaste']): number {
  return (
    aftertaste.persistence +
    aftertaste.aftertasteQuality +
    aftertaste.finalBalance
  ) / 3;
}

/**
 * Calculate the overall chocolate score for a single judge
 * 
 * Formula:
 * Overall Score = (Flavor × 0.40) + (Aroma × 0.25) + (Texture × 0.20) + 
 *                 (Aftertaste × 0.10) + (Appearance × 0.05)
 * 
 * Where each category score is the average of its attributes:
 * - Appearance = (Color + Gloss + Surface Homogeneity) ÷ 3
 * - Aroma = (Aromatic Intensity + Aromatic Quality) ÷ 2
 * - Texture = (Smoothness + Melting + Body) ÷ 3
 * - Flavor = (Sweetness + Bitterness + Acidity + Flavor Intensity) ÷ 4
 * - Aftertaste = (Persistence + Aftertaste Quality + Final Balance) ÷ 3
 * 
 * @param scores - Complete chocolate evaluation scores
 * @returns Overall score (0-10)
 */
export function calculateChocolateOverallScore(scores: ChocolateScores): number {
  const appearanceScore = calculateAppearanceScore(scores.appearance);
  const aromaScore = calculateAromaScore(scores.aroma);
  const textureScore = calculateTextureScore(scores.texture);
  const flavorScore = calculateFlavorScore(scores.flavor);
  const aftertasteScore = calculateAftertasteScore(scores.aftertaste);

  const overallScore = (
    flavorScore * CHOCOLATE_CATEGORY_WEIGHTS.FLAVOR +
    aromaScore * CHOCOLATE_CATEGORY_WEIGHTS.AROMA +
    textureScore * CHOCOLATE_CATEGORY_WEIGHTS.TEXTURE +
    aftertasteScore * CHOCOLATE_CATEGORY_WEIGHTS.AFTERTASTE +
    appearanceScore * CHOCOLATE_CATEGORY_WEIGHTS.APPEARANCE
  );

  // Clamp to 0-10 range
  return Math.max(0, Math.min(10, overallScore));
}

/**
 * Calculate the final rating from multiple judges
 * 
 * Formula:
 * Final Rating = (Overall Rating Judge 1 + Overall Rating Judge 2 + …) ÷ Number of Judges
 * 
 * Note: This calculation is typically performed in the database using AVG() function
 * on the overall_quality column in the sensory_evaluations table.
 * 
 * @param judgeScores - Array of overall scores from different judges
 * @returns Average final rating (0-10)
 */
export function calculateFinalRating(judgeScores: number[]): number {
  if (judgeScores.length === 0) return 0;
  
  const sum = judgeScores.reduce((acc, score) => acc + score, 0);
  const average = sum / judgeScores.length;
  
  // Clamp to 0-10 range
  return Math.max(0, Math.min(10, average));
}

/**
 * Get a breakdown of category scores with their weights
 * Useful for displaying detailed scoring information
 * 
 * @param scores - Complete chocolate evaluation scores
 * @returns Object with category scores and their weighted contributions
 */
export function getChocolateScoringBreakdown(scores: ChocolateScores) {
  const appearanceScore = calculateAppearanceScore(scores.appearance);
  const aromaScore = calculateAromaScore(scores.aroma);
  const textureScore = calculateTextureScore(scores.texture);
  const flavorScore = calculateFlavorScore(scores.flavor);
  const aftertasteScore = calculateAftertasteScore(scores.aftertaste);

  return {
    appearance: {
      score: appearanceScore,
      weight: CHOCOLATE_CATEGORY_WEIGHTS.APPEARANCE,
      weightedScore: appearanceScore * CHOCOLATE_CATEGORY_WEIGHTS.APPEARANCE,
      percentage: CHOCOLATE_CATEGORY_WEIGHTS.APPEARANCE * 100,
    },
    aroma: {
      score: aromaScore,
      weight: CHOCOLATE_CATEGORY_WEIGHTS.AROMA,
      weightedScore: aromaScore * CHOCOLATE_CATEGORY_WEIGHTS.AROMA,
      percentage: CHOCOLATE_CATEGORY_WEIGHTS.AROMA * 100,
    },
    texture: {
      score: textureScore,
      weight: CHOCOLATE_CATEGORY_WEIGHTS.TEXTURE,
      weightedScore: textureScore * CHOCOLATE_CATEGORY_WEIGHTS.TEXTURE,
      percentage: CHOCOLATE_CATEGORY_WEIGHTS.TEXTURE * 100,
    },
    flavor: {
      score: flavorScore,
      weight: CHOCOLATE_CATEGORY_WEIGHTS.FLAVOR,
      weightedScore: flavorScore * CHOCOLATE_CATEGORY_WEIGHTS.FLAVOR,
      percentage: CHOCOLATE_CATEGORY_WEIGHTS.FLAVOR * 100,
    },
    aftertaste: {
      score: aftertasteScore,
      weight: CHOCOLATE_CATEGORY_WEIGHTS.AFTERTASTE,
      weightedScore: aftertasteScore * CHOCOLATE_CATEGORY_WEIGHTS.AFTERTASTE,
      percentage: CHOCOLATE_CATEGORY_WEIGHTS.AFTERTASTE * 100,
    },
    overall: calculateChocolateOverallScore(scores),
  };
}