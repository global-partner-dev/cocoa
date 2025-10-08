/**
 * Comparison Script - Filtered vs Unfiltered Results
 * 
 * This script demonstrates the difference between results with and without outlier filtering.
 * Use this to verify that outlier filtering is working correctly and to see its impact.
 * 
 * Usage:
 * 1. Update the contestId below with a real contest ID from your database
 * 2. Run: npx ts-node src/lib/compareFilteringResults.ts
 */

import { ResultsService } from './resultsService';
import { FinalResultsService } from './finalResultsService';

// ============================================
// CONFIGURATION - Update these values
// ============================================

// Set to a real contest ID from your database, or leave undefined for all contests
const CONTEST_ID: string | undefined = undefined;

// Number of top samples to compare
const LIMIT = 10;

// ============================================
// Comparison Functions
// ============================================

async function compareInitialResults() {
  console.log('\n' + '='.repeat(80));
  console.log('INITIAL RESULTS COMPARISON (Sensory Evaluations)');
  console.log('='.repeat(80) + '\n');

  try {
    // Fetch both versions
    console.log('Fetching results without outlier filtering...');
    const unfilteredResponse = await ResultsService.getTopSamplesByScore(LIMIT, CONTEST_ID);
    
    console.log('Fetching results with outlier filtering...');
    const filteredResponse = await ResultsService.getTopSamplesByScoreWithOutlierFiltering(LIMIT, CONTEST_ID);

    if (!unfilteredResponse.success || !filteredResponse.success) {
      console.error('❌ Error fetching results');
      console.error('Unfiltered error:', unfilteredResponse.error);
      console.error('Filtered error:', filteredResponse.error);
      return;
    }

    const unfilteredData = unfilteredResponse.data || [];
    const filteredData = filteredResponse.data || [];

    if (unfilteredData.length === 0) {
      console.log('⚠️  No results found. Make sure you have evaluated samples in the database.');
      return;
    }

    console.log(`✅ Found ${unfilteredData.length} samples\n`);

    // Create a map for easy comparison
    const unfilteredMap = new Map(unfilteredData.map(s => [s.id, s]));

    // Compare results
    console.log('COMPARISON TABLE:');
    console.log('-'.repeat(120));
    console.log(
      'Rank'.padEnd(6) +
      'Sample Name'.padEnd(30) +
      'Unfiltered'.padEnd(12) +
      'Filtered'.padEnd(12) +
      'Difference'.padEnd(12) +
      'Outliers'.padEnd(10) +
      'Evals'.padEnd(8) +
      'StdDev'
    );
    console.log('-'.repeat(120));

    let totalDifference = 0;
    let samplesWithOutliers = 0;
    let totalOutliers = 0;

    filteredData.forEach((filteredSample, index) => {
      const unfilteredSample = unfilteredMap.get(filteredSample.id);
      
      if (!unfilteredSample) {
        console.log(`⚠️  Sample ${filteredSample.sampleName} not found in unfiltered results`);
        return;
      }

      const difference = filteredSample.overallScore - unfilteredSample.overallScore;
      totalDifference += Math.abs(difference);

      const outlierCount = filteredSample.outlierMetadata?.outliersDetected || 0;
      const totalEvals = filteredSample.outlierMetadata?.totalEvaluations || 0;
      const stdDev = filteredSample.outlierMetadata?.standardDeviation || 0;

      if (outlierCount > 0) {
        samplesWithOutliers++;
        totalOutliers += outlierCount;
      }

      const diffStr = difference >= 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
      const diffColor = Math.abs(difference) > 0.1 ? '📊' : '  ';

      console.log(
        `${diffColor} ${(index + 1).toString().padEnd(4)}` +
        filteredSample.sampleName.substring(0, 28).padEnd(30) +
        unfilteredSample.overallScore.toFixed(2).padEnd(12) +
        filteredSample.overallScore.toFixed(2).padEnd(12) +
        diffStr.padEnd(12) +
        `${outlierCount}/${totalEvals}`.padEnd(10) +
        totalEvals.toString().padEnd(8) +
        stdDev.toFixed(2)
      );
    });

    console.log('-'.repeat(120));

    // Summary statistics
    console.log('\nSUMMARY:');
    console.log(`  Total Samples: ${filteredData.length}`);
    console.log(`  Samples with Outliers: ${samplesWithOutliers} (${((samplesWithOutliers / filteredData.length) * 100).toFixed(1)}%)`);
    console.log(`  Total Outliers Detected: ${totalOutliers}`);
    console.log(`  Average Score Difference: ${(totalDifference / filteredData.length).toFixed(3)}`);
    console.log(`  Max Score Change: ${Math.max(...filteredData.map((s, i) => {
      const unfiltered = unfilteredMap.get(s.id);
      return unfiltered ? Math.abs(s.overallScore - unfiltered.overallScore) : 0;
    })).toFixed(3)}`);

    // Ranking changes
    console.log('\nRANKING CHANGES:');
    let rankingChanges = 0;
    filteredData.forEach((filteredSample, filteredIndex) => {
      const unfilteredIndex = unfilteredData.findIndex(s => s.id === filteredSample.id);
      if (unfilteredIndex !== filteredIndex && unfilteredIndex !== -1) {
        rankingChanges++;
        const change = unfilteredIndex - filteredIndex;
        const arrow = change > 0 ? '⬆️' : '⬇️';
        console.log(
          `  ${arrow} ${filteredSample.sampleName}: ` +
          `Rank ${unfilteredIndex + 1} → ${filteredIndex + 1} ` +
          `(${change > 0 ? '+' : ''}${change} positions)`
        );
      }
    });

    if (rankingChanges === 0) {
      console.log('  No ranking changes');
    } else {
      console.log(`  Total ranking changes: ${rankingChanges}`);
    }

  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }
}

async function compareFinalResults() {
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS COMPARISON (Final Evaluations)');
  console.log('='.repeat(80) + '\n');

  try {
    // Fetch both versions
    console.log('Fetching results without outlier filtering...');
    const unfilteredResponse = await FinalResultsService.getAggregatedResults(CONTEST_ID);
    
    console.log('Fetching results with outlier filtering...');
    const filteredResponse = await FinalResultsService.getAggregatedResultsWithOutlierFiltering(CONTEST_ID);

    if (!unfilteredResponse.success || !filteredResponse.success) {
      console.error('❌ Error fetching results');
      console.error('Unfiltered error:', unfilteredResponse.error);
      console.error('Filtered error:', filteredResponse.error);
      return;
    }

    const unfilteredData = unfilteredResponse.data || [];
    const filteredData = filteredResponse.data || [];

    if (unfilteredData.length === 0) {
      console.log('⚠️  No final evaluation results found.');
      return;
    }

    console.log(`✅ Found ${unfilteredData.length} samples\n`);

    // Create a map for easy comparison
    const unfilteredMap = new Map(unfilteredData.map(r => [r.sample_id, r]));

    // Compare results
    console.log('COMPARISON TABLE:');
    console.log('-'.repeat(120));
    console.log(
      'Rank'.padEnd(6) +
      'Sample ID'.padEnd(40) +
      'Unfiltered'.padEnd(12) +
      'Filtered'.padEnd(12) +
      'Difference'.padEnd(12) +
      'Outliers'.padEnd(10) +
      'Evals'
    );
    console.log('-'.repeat(120));

    let totalDifference = 0;
    let samplesWithOutliers = 0;
    let totalOutliers = 0;

    filteredData.forEach((filteredResult, index) => {
      const unfilteredResult = unfilteredMap.get(filteredResult.sample_id);
      
      if (!unfilteredResult) {
        console.log(`⚠️  Sample ${filteredResult.sample_id} not found in unfiltered results`);
        return;
      }

      const difference = filteredResult.avg_score - unfilteredResult.avg_score;
      totalDifference += Math.abs(difference);

      const outlierCount = filteredResult.outlierMetadata?.outliersDetected || 0;
      const totalEvals = filteredResult.outlierMetadata?.totalEvaluations || 0;

      if (outlierCount > 0) {
        samplesWithOutliers++;
        totalOutliers += outlierCount;
      }

      const diffStr = difference >= 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
      const diffColor = Math.abs(difference) > 0.1 ? '📊' : '  ';

      console.log(
        `${diffColor} ${(index + 1).toString().padEnd(4)}` +
        filteredResult.sample_id.substring(0, 38).padEnd(40) +
        unfilteredResult.avg_score.toFixed(2).padEnd(12) +
        filteredResult.avg_score.toFixed(2).padEnd(12) +
        diffStr.padEnd(12) +
        `${outlierCount}/${totalEvals}`.padEnd(10) +
        totalEvals.toString()
      );
    });

    console.log('-'.repeat(120));

    // Summary statistics
    console.log('\nSUMMARY:');
    console.log(`  Total Samples: ${filteredData.length}`);
    console.log(`  Samples with Outliers: ${samplesWithOutliers} (${((samplesWithOutliers / filteredData.length) * 100).toFixed(1)}%)`);
    console.log(`  Total Outliers Detected: ${totalOutliers}`);
    console.log(`  Average Score Difference: ${(totalDifference / filteredData.length).toFixed(3)}`);

  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + '  OUTLIER FILTERING COMPARISON TOOL'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  if (CONTEST_ID) {
    console.log(`\n📋 Contest ID: ${CONTEST_ID}`);
  } else {
    console.log('\n📋 Contest ID: All contests');
  }
  console.log(`📊 Limit: Top ${LIMIT} samples`);

  // Compare initial results
  await compareInitialResults();

  // Compare final results
  await compareFinalResults();

  console.log('\n' + '='.repeat(80));
  console.log('LEGEND:');
  console.log('  📊 = Significant score change (>0.1 points)');
  console.log('  ⬆️  = Ranking improved');
  console.log('  ⬇️  = Ranking decreased');
  console.log('  Outliers = Number of outlier evaluations / Total evaluations');
  console.log('  StdDev = Standard deviation of scores');
  console.log('='.repeat(80) + '\n');

  console.log('✅ Comparison complete!\n');
  console.log('💡 Tips:');
  console.log('  - If no outliers are detected, your judges are very consistent!');
  console.log('  - High standard deviation (>1.5) indicates significant judge disagreement');
  console.log('  - Score differences show the impact of outlier filtering');
  console.log('  - Ranking changes show how outliers affected final standings\n');
}

// Run the comparison
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});