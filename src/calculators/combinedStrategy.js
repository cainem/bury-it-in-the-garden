/**
 * Combined Strategy Calculator
 *
 * Calculates 50/50 split strategies where pension is divided equally
 * between two different base strategies.
 *
 * Key characteristics:
 * - Initial pension split 50/50 between two strategies
 * - Each half follows its own strategy rules independently
 * - Annual withdrawals come from each half proportionally
 * - Results are merged for a combined view
 *
 * @module combinedStrategy
 */

import { calculateGoldStrategy } from './goldStrategy.js';
import { calculateSippStrategy, INDEX_TYPES } from './sippStrategy.js';
import { COMBINATION_STRATEGIES, BASE_STRATEGIES } from './strategyRegistry.js';
import { isValidYear, isValidAmount } from '../utils/validators.js';

/**
 * Combined yearly result
 * @typedef {Object} CombinedYearResult
 * @property {number} year - The year
 * @property {Object} strategyA - Results from first strategy
 * @property {Object} strategyB - Results from second strategy
 * @property {number} combinedStartValue - Total start value (both strategies)
 * @property {number} combinedWithdrawal - Total net withdrawal (both strategies)
 * @property {number} combinedEndValue - Total end value (both strategies)
 * @property {string} status - 'active', 'partial' (one exhausted), or 'exhausted'
 */

/**
 * Combined strategy result
 * @typedef {Object} CombinedStrategyResult
 * @property {string} combinationId - The combination strategy ID
 * @property {string} combinationName - Human-readable name
 * @property {Object} strategyA - Full results from first strategy
 * @property {Object} strategyB - Full results from second strategy
 * @property {CombinedYearResult[]} yearlyResults - Merged year-by-year breakdown
 * @property {Object} summary - Combined summary statistics
 */

/**
 * Map strategy ID to index type for SIPP strategies
 */
const STRATEGY_TO_INDEX = {
  sp500: INDEX_TYPES.SP500,
  nasdaq100: INDEX_TYPES.NASDAQ100,
  ftse100: INDEX_TYPES.FTSE100,
  goldEtf: INDEX_TYPES.GOLD_ETF,
  usTreasury: INDEX_TYPES.US_TREASURY
};

/**
 * Calculate a base strategy
 *
 * @param {string} strategyId - The strategy ID (gold, sp500, nasdaq100, ftse100)
 * @param {number} pensionAmount - Amount allocated to this strategy
 * @param {number} startYear - Year to start
 * @param {number} withdrawalRate - Withdrawal rate percentage
 * @param {number} years - Number of years to simulate
 * @param {Object} [config={}] - Optional configuration overrides for fees
 * @returns {Object} Strategy result
 */
function calculateBaseStrategy(strategyId, pensionAmount, startYear, withdrawalRate, years, config = {}) {
  if (strategyId === 'gold') {
    return {
      type: 'gold',
      result: calculateGoldStrategy(pensionAmount, startYear, withdrawalRate, years, config)
    };
  }

  const indexType = STRATEGY_TO_INDEX[strategyId];
  if (!indexType) {
    throw new Error(`Unknown strategy ID: ${strategyId}`);
  }

  return {
    type: 'sipp',
    result: calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, indexType, config)
  };
}

/**
 * Extract yearly values from a strategy result for merging
 *
 * @param {Object} strategyWrapper - The strategy wrapper with type and result
 * @returns {Object[]} Normalized yearly data
 */
function extractYearlyData(strategyWrapper) {
  const { type, result } = strategyWrapper;

  return result.yearlyResults.map(year => {
    if (type === 'gold') {
      return {
        year: year.year,
        startValue: year.startValueGbp,
        withdrawal: year.netWithdrawal,
        grossWithdrawal: year.withdrawalGross,
        endValue: year.endValueGbp,
        status: year.status,
        raw: year
      };
    } else {
      // SIPP
      return {
        year: year.year,
        startValue: year.startValueGbp,
        withdrawal: year.netWithdrawal,
        grossWithdrawal: year.grossWithdrawal,
        endValue: year.endValueGbp,
        status: year.status,
        raw: year
      };
    }
  });
}

/**
 * Merge yearly results from two strategies
 *
 * @param {Object[]} yearlyA - Yearly data from strategy A
 * @param {Object[]} yearlyB - Yearly data from strategy B
 * @returns {CombinedYearResult[]} Merged yearly results
 */
function mergeYearlyResults(yearlyA, yearlyB) {
  const merged = [];

  for (let i = 0; i < yearlyA.length; i++) {
    const a = yearlyA[i];
    const b = yearlyB[i];

    // Determine combined status
    let status = 'active';
    if (a.status === 'exhausted' && b.status === 'exhausted') {
      status = 'exhausted';
    } else if (a.status === 'depleted' && b.status === 'depleted') {
      status = 'depleted';
    } else if (a.status === 'exhausted' || b.status === 'exhausted' ||
               a.status === 'depleted' || b.status === 'depleted') {
      status = 'partial';
    }

    merged.push({
      year: a.year,
      strategyA: a.raw,
      strategyB: b.raw,
      combinedStartValue: a.startValue + b.startValue,
      combinedGrossWithdrawal: (a.grossWithdrawal || 0) + (b.grossWithdrawal || 0),
      combinedWithdrawal: a.withdrawal + b.withdrawal,
      combinedEndValue: a.endValue + b.endValue,
      statusA: a.status,
      statusB: b.status,
      status
    });
  }

  return merged;
}

/**
 * Calculate combined summary from both strategies
 *
 * @param {Object} wrapperA - Strategy A wrapper
 * @param {Object} wrapperB - Strategy B wrapper
 * @param {CombinedYearResult[]} mergedYearly - Merged yearly results
 * @param {number} totalPension - Total initial pension amount
 * @returns {Object} Combined summary
 */
function calculateCombinedSummary(wrapperA, wrapperB, mergedYearly, totalPension) {
  const summaryA = wrapperA.result.summary;
  const summaryB = wrapperB.result.summary;

  // Total withdrawals
  const totalWithdrawn = mergedYearly.reduce((sum, y) => sum + y.combinedWithdrawal, 0);

  // Final values
  const lastYear = mergedYearly[mergedYearly.length - 1];
  const finalValue = lastYear.combinedEndValue;

  // Tax calculations (different for gold vs SIPP)
  let totalTaxPaid = 0;
  if (wrapperA.type === 'gold') {
    totalTaxPaid += summaryA.taxPaidOnWithdrawal;
  } else {
    totalTaxPaid += summaryA.totalTaxPaid;
  }
  if (wrapperB.type === 'gold') {
    totalTaxPaid += summaryB.taxPaidOnWithdrawal;
  } else {
    totalTaxPaid += summaryB.totalTaxPaid;
  }

  // Fees
  let totalFees = 0;
  if (wrapperA.type === 'gold') {
    totalFees += summaryA.totalTransactionCosts + summaryA.totalStorageFees;
  } else {
    totalFees += summaryA.totalManagementFees;
  }
  if (wrapperB.type === 'gold') {
    totalFees += summaryB.totalTransactionCosts + summaryB.totalStorageFees;
  } else {
    totalFees += summaryB.totalManagementFees;
  }

  // Active years (both still active)
  const activeYears = mergedYearly.filter(y => y.status === 'active').length;
  const partialYears = mergedYearly.filter(y => y.status === 'partial').length;

  // Depletion tracking
  const depletedYear = mergedYearly.find(y => y.status === 'depleted');
  const exhaustedYear = mergedYearly.find(y => y.status === 'exhausted');

  // Strategy success (last year both active or at least one still going)
  const strategySuccessful = lastYear.status === 'active' || lastYear.status === 'partial';

  return {
    initialInvestment: totalPension,
    allocationA: totalPension / 2,
    allocationB: totalPension / 2,
    totalWithdrawn,
    totalTaxPaid,
    totalFees,
    finalValue,
    finalValueA: wrapperA.type === 'gold' ? summaryA.finalGoldValue : summaryA.finalValue,
    finalValueB: wrapperB.type === 'gold' ? summaryB.finalGoldValue : summaryB.finalValue,
    totalValueRealized: totalWithdrawn + finalValue,
    activeYears,
    partialYears,
    yearDepleted: depletedYear ? depletedYear.year : null,
    yearExhausted: exhaustedYear ? exhaustedYear.year : null,
    strategySuccessful,
    summaryA,
    summaryB
  };
}

/**
 * Calculate a combined (50/50) strategy outcome
 *
 * @param {string} combinationId - The combination ID (e.g., 'gold-sp500')
 * @param {number} pensionAmount - Total starting pension pot in GBP
 * @param {number} startYear - Year to start the strategy
 * @param {number} withdrawalRate - Annual withdrawal rate as percentage
 * @param {number} years - Number of years to simulate
 * @param {Object} [config={}] - Optional configuration overrides for fees
 * @param {number} [config.goldTransactionPercent] - Gold transaction cost percentage
 * @param {number} [config.goldStorageFeePercent] - Gold storage fee percentage
 * @param {number} [config.sippManagementFeePercent] - SIPP management fee percentage
 * @returns {CombinedStrategyResult} Complete combined strategy results
 * @throws {Error} If inputs are invalid or combination doesn't exist
 *
 * @example
 * const result = calculateCombinedStrategy('gold-sp500', 500000, 2000, 4, 25);
 * console.log(result.summary.totalWithdrawn);
 *
 * // With custom fees
 * const customResult = calculateCombinedStrategy('gold-sp500', 500000, 2000, 4, 25, {
 *   goldTransactionPercent: 1.5,
 *   sippManagementFeePercent: 0.3
 * });
 */
export function calculateCombinedStrategy(combinationId, pensionAmount, startYear, withdrawalRate, years, config = {}) {
  // Validate combination exists
  const combination = COMBINATION_STRATEGIES[combinationId];
  if (!combination) {
    const validIds = Object.keys(COMBINATION_STRATEGIES).join(', ');
    throw new Error(`Unknown combination strategy: ${combinationId}. Valid combinations: ${validIds}`);
  }

  // Validate inputs
  validateInputs(pensionAmount, startYear, withdrawalRate, years, combination);

  // Split pension 50/50
  const halfPension = pensionAmount / 2;

  // Calculate each half
  const [strategyIdA, strategyIdB] = combination.components;
  const wrapperA = calculateBaseStrategy(strategyIdA, halfPension, startYear, withdrawalRate, years, config);
  const wrapperB = calculateBaseStrategy(strategyIdB, halfPension, startYear, withdrawalRate, years, config);

  // Extract and merge yearly data
  const yearlyA = extractYearlyData(wrapperA);
  const yearlyB = extractYearlyData(wrapperB);
  const mergedYearly = mergeYearlyResults(yearlyA, yearlyB);

  // Calculate combined summary
  const summary = calculateCombinedSummary(wrapperA, wrapperB, mergedYearly, pensionAmount);

  // Get strategy metadata
  const strategyMetaA = BASE_STRATEGIES[strategyIdA];
  const strategyMetaB = BASE_STRATEGIES[strategyIdB];

  return {
    combinationId,
    combinationName: combination.name,
    strategyA: {
      id: strategyIdA,
      name: strategyMetaA.name,
      shortName: strategyMetaA.shortName,
      type: wrapperA.type,
      result: wrapperA.result
    },
    strategyB: {
      id: strategyIdB,
      name: strategyMetaB.name,
      shortName: strategyMetaB.shortName,
      type: wrapperB.type,
      result: wrapperB.result
    },
    yearlyResults: mergedYearly,
    summary
  };
}

/**
 * Validate all inputs for combined strategy
 */
function validateInputs(pensionAmount, startYear, withdrawalRate, years, combination) {
  if (!isValidAmount(pensionAmount) || pensionAmount <= 0) {
    throw new Error('Pension amount must be a positive number');
  }

  if (!isValidYear(startYear)) {
    throw new Error(`Start year ${startYear} is outside supported range (1980-2026)`);
  }

  // Check earliest year for both component strategies
  const [idA, idB] = combination.components;
  const strategyA = BASE_STRATEGIES[idA];
  const strategyB = BASE_STRATEGIES[idB];

  const earliestYear = Math.max(strategyA.earliestYear, strategyB.earliestYear);
  if (startYear < earliestYear) {
    throw new Error(
      `Combined strategy ${combination.name} not available for year ${startYear}. ` +
      `Earliest available: ${earliestYear} (limited by ${startYear < strategyA.earliestYear ? strategyA.name : strategyB.name})`
    );
  }

  if (typeof withdrawalRate !== 'number' || withdrawalRate <= 0 || withdrawalRate > 100) {
    throw new Error('Withdrawal rate must be between 0 and 100');
  }

  if (typeof years !== 'number' || !Number.isInteger(years) || years < 1) {
    throw new Error('Years must be a positive integer');
  }

  // Check if we have enough data years
  const endYear = startYear + years - 1;
  if (endYear > 2026) {
    throw new Error(`Not enough data: strategy ends in ${endYear}, but data only available until 2026`);
  }
}

/**
 * Calculate combined strategy by providing component IDs directly
 *
 * @param {string} strategyIdA - First strategy ID
 * @param {string} strategyIdB - Second strategy ID
 * @param {number} pensionAmount - Total starting pension pot
 * @param {number} startYear - Year to start
 * @param {number} withdrawalRate - Withdrawal rate percentage
 * @param {number} years - Number of years
 * @param {Object} [config={}] - Optional configuration overrides for fees
 * @returns {CombinedStrategyResult} Combined results
 */
export function calculateCombinedStrategyByIds(strategyIdA, strategyIdB, pensionAmount, startYear, withdrawalRate, years, config = {}) {
  // Build combination ID (alphabetically ordered)
  const ids = [strategyIdA, strategyIdB].sort();
  const combinationId = ids.join('-');

  // Check if this is a valid combination
  if (!COMBINATION_STRATEGIES[combinationId]) {
    throw new Error(`No combination strategy defined for ${strategyIdA} + ${strategyIdB}`);
  }

  return calculateCombinedStrategy(combinationId, pensionAmount, startYear, withdrawalRate, years, config);
}

/**
 * Get the earliest year a combined strategy can start
 *
 * @param {string} combinationId - The combination ID
 * @returns {number} Earliest available year
 */
export function getCombinedStrategyEarliestYear(combinationId) {
  const combination = COMBINATION_STRATEGIES[combinationId];
  if (!combination) {
    throw new Error(`Unknown combination strategy: ${combinationId}`);
  }

  const [idA, idB] = combination.components;
  const strategyA = BASE_STRATEGIES[idA];
  const strategyB = BASE_STRATEGIES[idB];

  return Math.max(strategyA.earliestYear, strategyB.earliestYear);
}

/**
 * Check if a combined strategy is available for a given year
 *
 * @param {string} combinationId - The combination ID
 * @param {number} year - Year to check
 * @returns {boolean} True if available
 */
export function isCombinedStrategyAvailable(combinationId, year) {
  try {
    const earliestYear = getCombinedStrategyEarliestYear(combinationId);
    return year >= earliestYear && year <= 2026;
  } catch {
    return false;
  }
}

export default {
  calculateCombinedStrategy,
  calculateCombinedStrategyByIds,
  getCombinedStrategyEarliestYear,
  isCombinedStrategyAvailable
};
