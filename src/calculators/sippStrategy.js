/**
 * SIPP Strategy Calculator
 *
 * Simulates keeping pension funds invested in an equity tracker ETF
 * within a SIPP wrapper.
 *
 * Supports multiple indices:
 * - S&P 500 (VUAG equivalent)
 * - Nasdaq 100 (EQQQ/CNDX equivalent)
 * - FTSE 100 (VUKE equivalent)
 *
 * Key characteristics:
 * - No initial tax (stays in SIPP)
 * - 0.5% annual management fee on total balance
 * - Annual withdrawals are taxed (25% tax-free PCLS, 75% taxable)
 * - Uses synthetic ETF price for historical consistency
 *
 * @module sippStrategy
 */

import { getSyntheticPrice, INDEX_TYPES, INDEX_CONFIG } from './syntheticEtf.js';
import { getInflationMultiplier } from '../data/ukCpi.js';
import { calculateIncomeTax } from './taxCalculator.js';
import { isValidYear, isValidAmount } from '../utils/validators.js';
import { COSTS, YEAR_RANGE } from '../config/defaults.js';

/**
 * Yearly result for SIPP strategy
 * @typedef {Object} SippYearResult
 * @property {number} year - The year
 * @property {number} startUnits - ETF units at start of year
 * @property {number} etfPricePerUnit - ETF price at start of year
 * @property {number} startValueGbp - Portfolio value at start of year (before fees)
 * @property {number} managementFee - Annual management fee deducted
 * @property {number} valueAfterFee - Portfolio value after management fee
 * @property {number} grossWithdrawal - Gross withdrawal amount (before tax)
 * @property {number} unitsSold - ETF units sold for withdrawal
 * @property {number} taxOnWithdrawal - Tax paid on the withdrawal
 * @property {number} netWithdrawal - Net cash received after tax
 * @property {number} endUnits - ETF units at end of year
 * @property {number} endValueGbp - Portfolio value at end of year
 * @property {string} status - 'active', 'exhausted', or 'depleted'
 */

/**
 * SIPP strategy result
 * @typedef {Object} SippStrategyResult
 * @property {Object} initialInvestment - Details of initial SIPP investment
 * @property {SippYearResult[]} yearlyResults - Year-by-year breakdown
 * @property {Object} summary - Summary statistics
 * @property {string} indexType - The index type used for this strategy
 */

/**
 * Calculate the SIPP strategy outcome for any supported index
 *
 * @param {number} pensionAmount - Starting pension pot in GBP
 * @param {number} startYear - Year to start the strategy
 * @param {number} withdrawalRate - Annual withdrawal rate as percentage (e.g., 4 for 4%)
 * @param {number} years - Number of years to simulate
 * @param {string} [indexType='sp500'] - Index type (sp500, nasdaq100, ftse100)
 * @param {Object} [config={}] - Optional configuration overrides
 * @param {number} [config.sippManagementFeePercent] - SIPP management fee percentage (default: 0.5)
 * @returns {SippStrategyResult} Complete strategy results
 * @throws {Error} If inputs are invalid
 *
 * @example
 * // S&P 500 SIPP (default)
 * const sp500Result = calculateSippStrategy(500000, 2000, 4, 25);
 *
 * // Nasdaq 100 SIPP
 * const nasdaqResult = calculateSippStrategy(500000, 2000, 4, 25, 'nasdaq100');
 *
 * // FTSE 100 SIPP
 * const ftseResult = calculateSippStrategy(500000, 2000, 4, 25, 'ftse100');
 *
 * // Custom management fee
 * const customResult = calculateSippStrategy(500000, 2000, 4, 25, 'sp500', { sippManagementFeePercent: 0.3 });
 */
export function calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, indexType = INDEX_TYPES.SP500, config = {}) {
  // Merge config with defaults
  const costs = {
    sippManagementFeePercent: config.sippManagementFeePercent ?? COSTS.sippManagementFeePercent,
    adjustForInflation: config.adjustForInflation ?? COSTS.adjustForInflation
  };
  // Validate inputs
  validateInputs(pensionAmount, startYear, withdrawalRate, years, indexType);

  // Step 1: Initial investment (no tax - stays in SIPP)
  const initialInvestment = calculateInitialInvestment(pensionAmount, startYear, indexType);

  // Step 2: Calculate annual withdrawals
  const annualWithdrawalGross = pensionAmount * (withdrawalRate / 100);
  const yearlyResults = calculateYearlyWithdrawals(
    initialInvestment.units,
    startYear,
    annualWithdrawalGross,
    years,
    indexType,
    costs
  );

  // Step 3: Calculate summary
  const summary = calculateSummary(
    pensionAmount,
    initialInvestment,
    yearlyResults,
    annualWithdrawalGross
  );

  const indexConfig = INDEX_CONFIG[indexType];

  return {
    initialInvestment: {
      pensionAmount,
      etfPriceAtStart: initialInvestment.pricePerUnit,
      unitsAcquired: initialInvestment.units,
      initialValue: initialInvestment.value
    },
    yearlyResults,
    summary,
    indexType,
    indexName: indexConfig.name
  };
}

/**
 * Validate all inputs
 */
function validateInputs(pensionAmount, startYear, withdrawalRate, years, indexType) {
  if (!isValidAmount(pensionAmount) || pensionAmount <= 0) {
    throw new Error('Pension amount must be a positive number');
  }

  if (!isValidYear(startYear)) {
    throw new Error(`Start year ${startYear} is outside supported range (${YEAR_RANGE.min}-${YEAR_RANGE.max})`);
  }

  // Validate index type
  const config = INDEX_CONFIG[indexType];
  if (!config) {
    const validTypes = Object.keys(INDEX_CONFIG).join(', ');
    throw new Error(`Unknown index type: ${indexType}. Valid types: ${validTypes}`);
  }

  // Check if index data is available for start year
  if (startYear < config.earliestYear) {
    throw new Error(`${config.name} data not available for year ${startYear}. Earliest available: ${config.earliestYear}`);
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
 * Calculate the initial SIPP investment (no tax)
 */
function calculateInitialInvestment(pensionAmount, year, indexType) {
  const pricePerUnit = getSyntheticPrice(year, indexType);
  const units = pensionAmount / pricePerUnit;

  return {
    pricePerUnit,
    units,
    value: pensionAmount
  };
}

/**
 * Calculate year-by-year withdrawals from SIPP
 */
function calculateYearlyWithdrawals(startingUnits, startYear, annualWithdrawalGross, years, indexType, costs) {
  const results = [];
  let currentUnits = startingUnits;
  const managementFeeRate = costs.sippManagementFeePercent / 100;

  for (let i = 0; i < years; i++) {
    const year = startYear + i;
    const etfPrice = getSyntheticPrice(year, indexType);
    const startValue = currentUnits * etfPrice;

    // Apply management fee first
    const managementFee = startValue * managementFeeRate;
    const unitsLostToFee = managementFee / etfPrice;
    currentUnits -= unitsLostToFee;
    const valueAfterFee = currentUnits * etfPrice;

    // Determine status and withdrawal
    let status = 'active';
    let grossWithdrawal = annualWithdrawalGross;
    if (costs.adjustForInflation) {
      grossWithdrawal = annualWithdrawalGross * getInflationMultiplier(startYear, year);
    }

    let unitsSold = 0;
    let taxOnWithdrawal = 0;
    let netWithdrawal = 0;

    if (currentUnits <= 0) {
      // Already exhausted
      status = 'exhausted';
      grossWithdrawal = 0;
      currentUnits = 0;
    } else {
      // Calculate how many units to sell for gross withdrawal
      const unitsNeeded = grossWithdrawal / etfPrice;

      if (unitsNeeded >= currentUnits) {
        // Not enough units - sell everything
        status = 'depleted';
        unitsSold = currentUnits;
        grossWithdrawal = unitsSold * etfPrice;
        currentUnits = 0;
      } else {
        // Enough units - sell what we need
        unitsSold = unitsNeeded;
        currentUnits -= unitsSold;
      }

      // Calculate tax on withdrawal (25% tax-free, 75% taxable)
      if (grossWithdrawal > 0) {
        const taxResult = calculateIncomeTax(grossWithdrawal, year, true);
        taxOnWithdrawal = taxResult.taxPaid;
        netWithdrawal = taxResult.netIncome;
      }
    }

    const endValue = currentUnits * etfPrice;

    results.push({
      year,
      startUnits: currentUnits + unitsSold + unitsLostToFee,
      etfPricePerUnit: etfPrice,
      startValueGbp: startValue,
      managementFee,
      valueAfterFee,
      grossWithdrawal,
      unitsSold,
      taxOnWithdrawal,
      netWithdrawal,
      endUnits: currentUnits,
      endValueGbp: endValue,
      status
    });
  }

  return results;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(pensionAmount, initialInvestment, yearlyResults, targetWithdrawal) {
  const totalGrossWithdrawn = yearlyResults.reduce((sum, r) => sum + r.grossWithdrawal, 0);
  const totalNetWithdrawn = yearlyResults.reduce((sum, r) => sum + r.netWithdrawal, 0);
  const totalTaxPaid = yearlyResults.reduce((sum, r) => sum + r.taxOnWithdrawal, 0);
  const totalManagementFees = yearlyResults.reduce((sum, r) => sum + r.managementFee, 0);

  const activeYears = yearlyResults.filter(r => r.status === 'active').length;
  const depletedYear = yearlyResults.find(r => r.status === 'depleted');
  const exhaustedYear = yearlyResults.find(r => r.status === 'exhausted');

  const lastResult = yearlyResults[yearlyResults.length - 1];
  const finalValue = lastResult.endValueGbp;
  const finalUnits = lastResult.endUnits;

  // Calculate total value received (net withdrawals + remaining value)
  // Note: remaining value would still be taxed if withdrawn
  const totalValueRealized = totalNetWithdrawn + finalValue;

  // Years where full withdrawal was achieved
  // When inflation adjustment is on, actual withdrawals grow each year,
  // so we just check status === 'active' (which implies full withdrawal was met)
  const fullWithdrawalYears = yearlyResults.filter(
    r => r.status === 'active'
  ).length;

  return {
    initialInvestment: pensionAmount,
    initialUnits: initialInvestment.units,
    targetAnnualWithdrawal: targetWithdrawal,
    totalGrossWithdrawn,
    totalNetWithdrawn,
    totalTaxPaid,
    totalManagementFees,
    finalUnits,
    finalValue,
    totalValueRealized,
    activeYears,
    fullWithdrawalYears,
    yearDepleted: depletedYear ? depletedYear.year : null,
    yearExhausted: exhaustedYear ? exhaustedYear.year : null,
    strategySuccessful: lastResult.status === 'active'
  };
}

/**
 * Calculate how many years the SIPP holdings will last
 *
 * @param {number} units - Starting ETF units
 * @param {number} startYear - Starting year
 * @param {number} annualWithdrawalGross - Annual gross withdrawal amount
 * @param {string} [indexType='sp500'] - Index type (sp500, nasdaq100, ftse100)
 * @param {Object} [config={}] - Optional configuration overrides
 * @param {number} [config.sippManagementFeePercent] - SIPP management fee percentage (default: 0.5)
 * @returns {number} Number of years until funds exhausted
 */
export function calculateSippYearsRemaining(units, startYear, annualWithdrawalGross, indexType = INDEX_TYPES.SP500, config = {}) {
  if (units <= 0) return 0;
  if (annualWithdrawalGross <= 0) return Infinity;

  // Merge config with defaults
  const costs = {
    sippManagementFeePercent: config.sippManagementFeePercent ?? COSTS.sippManagementFeePercent,
    adjustForInflation: config.adjustForInflation ?? COSTS.adjustForInflation
  };

  let currentUnits = units;
  let years = 0;
  const maxYears = 2026 - startYear + 1;
  const managementFeeRate = costs.sippManagementFeePercent / 100;

  for (let i = 0; i < maxYears && currentUnits > 0; i++) {
    const year = startYear + i;
    if (year > 2026) break;

    const etfPrice = getSyntheticPrice(year, indexType);
    const startValue = currentUnits * etfPrice;

    // Apply management fee
    const managementFee = startValue * managementFeeRate;
    const unitsLostToFee = managementFee / etfPrice;
    currentUnits -= unitsLostToFee;

    if (currentUnits <= 0) break;

    // Determine withdrawal amount for this year (adjusted for inflation if enabled)
    let grossWithdrawal = annualWithdrawalGross;
    if (costs.adjustForInflation) {
      grossWithdrawal = annualWithdrawalGross * getInflationMultiplier(startYear, year);
    }

    // Calculate units needed for withdrawal
    const unitsNeeded = grossWithdrawal / etfPrice;

    if (unitsNeeded >= currentUnits) {
      // Partial year - calculate fraction
      const fractionOfYear = currentUnits / unitsNeeded;
      years += fractionOfYear;
      break;
    }

    currentUnits -= unitsNeeded;
    years++;
  }

  return years;
}

/**
 * Get SIPP holdings value at a specific year
 *
 * @param {number} units - Number of ETF units
 * @param {number} year - Year to value at
 * @param {string} [indexType='sp500'] - Index type (sp500, nasdaq100, ftse100)
 * @returns {number} Value in GBP
 */
export function getSippValue(units, year, indexType = INDEX_TYPES.SP500) {
  if (!isValidYear(year)) {
    throw new Error(`Year ${year} is outside supported range (1980-2026)`);
  }

  const price = getSyntheticPrice(year, indexType);
  return units * price;
}

/**
 * Calculate the after-tax value if SIPP were fully withdrawn
 *
 * @param {number} grossValue - Gross SIPP value
 * @param {number} year - Year of withdrawal
 * @returns {Object} Tax breakdown and net value
 */
export function calculateSippAfterTaxValue(grossValue, year) {
  if (!isValidYear(year)) {
    throw new Error(`Year ${year} is outside supported range (2000-2026)`);
  }

  const taxResult = calculateIncomeTax(grossValue, year, true);

  return {
    grossValue,
    taxFreeAmount: taxResult.taxFreeAmount,
    taxableAmount: taxResult.taxableAmount,
    taxPaid: taxResult.taxPaid,
    netValue: taxResult.netIncome
  };
}

/**
 * Convenience functions for specific index types
 */

/**
 * Calculate S&P 500 SIPP strategy (default behavior)
 */
export function calculateSP500SippStrategy(pensionAmount, startYear, withdrawalRate, years) {
  return calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, INDEX_TYPES.SP500);
}

/**
 * Calculate Nasdaq 100 SIPP strategy
 */
export function calculateNasdaq100SippStrategy(pensionAmount, startYear, withdrawalRate, years) {
  return calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, INDEX_TYPES.NASDAQ100);
}

/**
 * Calculate FTSE 100 SIPP strategy
 */
export function calculateFTSE100SippStrategy(pensionAmount, startYear, withdrawalRate, years) {
  return calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, INDEX_TYPES.FTSE100);
}

/**
 * Calculate Gold ETF SIPP strategy
 */
export function calculateGoldEtfSippStrategy(pensionAmount, startYear, withdrawalRate, years) {
  return calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, INDEX_TYPES.GOLD_ETF);
}

/**
 * Calculate US Long Treasury SIPP strategy (annuity proxy)
 */
export function calculateUSTreasurySippStrategy(pensionAmount, startYear, withdrawalRate, years) {
  return calculateSippStrategy(pensionAmount, startYear, withdrawalRate, years, INDEX_TYPES.US_TREASURY);
}

// Re-export INDEX_TYPES for convenience
export { INDEX_TYPES };

export default {
  calculateSippStrategy,
  calculateSP500SippStrategy,
  calculateNasdaq100SippStrategy,
  calculateFTSE100SippStrategy,
  calculateGoldEtfSippStrategy,
  calculateUSTreasurySippStrategy,
  calculateSippYearsRemaining,
  getSippValue,
  calculateSippAfterTaxValue,
  INDEX_TYPES
};
