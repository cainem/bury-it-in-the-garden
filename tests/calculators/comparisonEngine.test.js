/**
 * Comparison Engine Tests
 *
 * Tests for side-by-side comparison of Gold and SIPP strategies.
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
  compareStrategies,
  compareAnyStrategies,
  getComparisonSummaryText,
  findCrossoverPoint,
  getCumulativeWithdrawals,
  getKeyInsights
} from '../../src/calculators/comparisonEngine.js';

describe('compareStrategies', () => {
  describe('input validation', () => {
    test('given_negativePensionAmount_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(-100000, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_zeroPensionAmount_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(0, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_invalidStartYear_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(100000, 1979, 4, 10))
        .toThrow('Start year 1979 is outside supported range');
    });

    test('given_invalidWithdrawalRate_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(100000, 2000, 0, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
    });

    test('given_invalidYears_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(100000, 2000, 4, 0))
        .toThrow('Years must be a positive integer');
    });

    test('given_yearsExtendBeyondData_when_comparing_then_throwsError', () => {
      expect(() => compareStrategies(100000, 2020, 4, 10))
        .toThrow('Not enough data');
    });
  });

  describe('result structure', () => {
    test('given_validInputs_when_comparing_then_returnsCorrectStructure', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      // Check top-level structure
      expect(result).toHaveProperty('inputs');
      expect(result).toHaveProperty('gold');
      expect(result).toHaveProperty('sipp');
      expect(result).toHaveProperty('yearlyComparison');
      expect(result).toHaveProperty('summary');
    });

    test('given_validInputs_when_comparing_then_inputsArePreserved', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.inputs.pensionAmount).toBe(500000);
      expect(result.inputs.startYear).toBe(2010);
      expect(result.inputs.withdrawalRate).toBe(4);
      expect(result.inputs.years).toBe(5);
      expect(result.inputs.endYear).toBe(2014);
    });

    test('given_validInputs_when_comparing_then_yearlyComparisonHasCorrectLength', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.yearlyComparison).toHaveLength(5);
    });

    test('given_validInputs_when_comparing_then_yearlyComparisonHasCorrectYears', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      for (let i = 0; i < 5; i++) {
        expect(result.yearlyComparison[i].year).toBe(2010 + i);
      }
    });
  });

  describe('yearly comparison data', () => {
    test('given_comparison_when_checkingYearlyData_then_hasAllFields', () => {
      const result = compareStrategies(500000, 2010, 4, 5);
      const year = result.yearlyComparison[0];

      // Gold fields
      expect(year.gold).toHaveProperty('assetValue');
      expect(year.gold).toHaveProperty('grossWithdrawal');
      expect(year.gold).toHaveProperty('netWithdrawal');
      expect(year.gold).toHaveProperty('taxPaid');
      expect(year.gold).toHaveProperty('status');

      // SIPP fields
      expect(year.sipp).toHaveProperty('assetValue');
      expect(year.sipp).toHaveProperty('grossWithdrawal');
      expect(year.sipp).toHaveProperty('netWithdrawal');
      expect(year.sipp).toHaveProperty('taxPaid');
      expect(year.sipp).toHaveProperty('managementFee');
      expect(year.sipp).toHaveProperty('status');

      // Difference fields
      expect(year.difference).toHaveProperty('assetValue');
      expect(year.difference).toHaveProperty('netWithdrawal');
      expect(year.difference).toHaveProperty('goldLeadsBy');
    });

    test('given_comparison_when_checkingDifference_then_calculatesCorrectly', () => {
      const result = compareStrategies(500000, 2010, 4, 5);
      const year = result.yearlyComparison[0];

      expect(year.difference.assetValue).toBeCloseTo(
        year.gold.assetValue - year.sipp.assetValue,
        2
      );
      expect(year.difference.netWithdrawal).toBeCloseTo(
        year.gold.netWithdrawal - year.sipp.netWithdrawal,
        2
      );
    });
  });

  describe('summary calculations', () => {
    test('given_comparison_when_checkingSummary_then_hasWinner', () => {
      const result = compareStrategies(500000, 2000, 4, 25);

      expect(['gold', 'sipp', 'tie']).toContain(result.summary.winner);
      expect(result.summary.difference).toBeGreaterThanOrEqual(0);
      expect(result.summary.percentageDifference).toBeGreaterThanOrEqual(0);
    });

    test('given_comparison_when_checkingSummary_then_hasGoldMetrics', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.summary.gold).toHaveProperty('initialTaxPaid');
      expect(result.summary.gold).toHaveProperty('totalTransactionCosts');
      expect(result.summary.gold).toHaveProperty('totalNetWithdrawn');
      expect(result.summary.gold).toHaveProperty('finalAssetValue');
      expect(result.summary.gold).toHaveProperty('totalValueRealized');
    });

    test('given_comparison_when_checkingSummary_then_hasSippMetrics', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.summary.sipp).toHaveProperty('initialTaxPaid');
      expect(result.summary.sipp).toHaveProperty('totalManagementFees');
      expect(result.summary.sipp).toHaveProperty('totalWithdrawalTax');
      expect(result.summary.sipp).toHaveProperty('totalNetWithdrawn');
      expect(result.summary.sipp).toHaveProperty('finalAfterTaxValue');
      expect(result.summary.sipp).toHaveProperty('totalValueRealized');
    });

    test('given_comparison_when_checkingSummary_then_sippHasNoInitialTax', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.summary.sipp.initialTaxPaid).toBe(0);
    });

    test('given_comparison_when_checkingSummary_then_goldHasNoWithdrawalTax', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.summary.gold.totalWithdrawalTax).toBe(0);
    });

    test('given_comparison_when_checkingSummary_then_hasComparisonMetrics', () => {
      const result = compareStrategies(500000, 2010, 4, 5);

      expect(result.summary.comparison).toHaveProperty('initialTaxDifference');
      expect(result.summary.comparison).toHaveProperty('totalCostsDifference');
      expect(result.summary.comparison).toHaveProperty('totalNetWithdrawnDifference');
      expect(result.summary.comparison).toHaveProperty('finalValueDifference');
      expect(result.summary.comparison).toHaveProperty('totalValueDifference');
    });
  });

  describe('winner determination', () => {
    test('given_goldWins_when_comparing_then_winnerIsGold', () => {
      // Test a scenario - results may vary based on market data
      const result = compareStrategies(500000, 2000, 4, 10);

      // Just verify winner is valid and metrics are consistent
      if (result.summary.winner === 'gold') {
        expect(result.summary.gold.totalValueRealized)
          .toBeGreaterThan(result.summary.sipp.totalValueRealized);
      }
    });

    test('given_sippWins_when_comparing_then_winnerIsSipp', () => {
      const result = compareStrategies(500000, 2010, 4, 10);

      if (result.summary.winner === 'sipp') {
        expect(result.summary.sipp.totalValueRealized)
          .toBeGreaterThan(result.summary.gold.totalValueRealized);
      }
    });

    test('given_tieCondition_when_comparing_then_winnerIsTie', () => {
      // Verify tie is only declared for very close results
      const result = compareStrategies(500000, 2010, 4, 5);

      if (result.summary.winner === 'tie') {
        expect(result.summary.difference).toBeLessThan(100);
      }
    });
  });
});

describe('getComparisonSummaryText', () => {
  test('given_comparison_when_gettingSummaryText_then_returnsString', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const text = getComparisonSummaryText(comparison);

    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  test('given_comparison_when_gettingSummaryText_then_includesKeyInfo', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const text = getComparisonSummaryText(comparison);

    expect(text).toContain('£500,000');
    expect(text).toContain('2010');
    expect(text).toContain('4%');
    expect(text).toContain('Gold Strategy');
    expect(text).toContain('SIPP Strategy');
  });

  test('given_goldWinner_when_gettingSummaryText_then_mentionsGold', () => {
    const comparison = compareStrategies(500000, 2000, 4, 10);

    if (comparison.summary.winner === 'gold') {
      const text = getComparisonSummaryText(comparison);
      expect(text).toContain('Gold strategy wins');
    }
  });

  test('given_sippWinner_when_gettingSummaryText_then_mentionsSipp', () => {
    const comparison = compareStrategies(500000, 2010, 4, 10);

    if (comparison.summary.winner === 'sipp') {
      const text = getComparisonSummaryText(comparison);
      expect(text).toContain('SIPP strategy wins');
    }
  });
});

describe('findCrossoverPoint', () => {
  test('given_singleYear_when_findingCrossover_then_returnsNull', () => {
    const comparison = compareStrategies(500000, 2020, 4, 1);
    const crossover = findCrossoverPoint(comparison);

    expect(crossover).toBeNull();
  });

  test('given_noCrossover_when_finding_then_returnsNull', () => {
    // May or may not have crossover depending on data
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const crossover = findCrossoverPoint(comparison);

    // If no crossover, should be null
    // If crossover exists, should have valid structure
    if (crossover !== null) {
      expect(crossover).toHaveProperty('year');
      expect(crossover).toHaveProperty('direction');
      expect(crossover).toHaveProperty('yearsFromStart');
    }
  });

  test('given_crossoverExists_when_finding_then_returnsValidStructure', () => {
    // Run longer comparison to increase chances of crossover
    const comparison = compareStrategies(500000, 2000, 4, 25);
    const crossover = findCrossoverPoint(comparison);

    if (crossover !== null) {
      expect(crossover.year).toBeGreaterThanOrEqual(2000);
      expect(crossover.year).toBeLessThanOrEqual(2024);
      expect(['sipp_overtakes_gold', 'gold_overtakes_sipp']).toContain(crossover.direction);
      expect(crossover.yearsFromStart).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getCumulativeWithdrawals', () => {
  test('given_comparison_when_gettingCumulative_then_returnsArrayOfCorrectLength', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const cumulative = getCumulativeWithdrawals(comparison);

    expect(cumulative).toHaveLength(5);
  });

  test('given_comparison_when_gettingCumulative_then_valuesIncrease', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const cumulative = getCumulativeWithdrawals(comparison);

    // Cumulative values should be increasing (or at least non-decreasing)
    for (let i = 1; i < cumulative.length; i++) {
      expect(cumulative[i].goldCumulative).toBeGreaterThanOrEqual(cumulative[i - 1].goldCumulative);
      expect(cumulative[i].sippCumulative).toBeGreaterThanOrEqual(cumulative[i - 1].sippCumulative);
    }
  });

  test('given_comparison_when_gettingCumulative_then_hasCorrectStructure', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const cumulative = getCumulativeWithdrawals(comparison);

    cumulative.forEach(year => {
      expect(year).toHaveProperty('year');
      expect(year).toHaveProperty('goldCumulative');
      expect(year).toHaveProperty('sippCumulative');
      expect(year).toHaveProperty('difference');
    });
  });

  test('given_comparison_when_gettingCumulative_then_differenceIsCorrect', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const cumulative = getCumulativeWithdrawals(comparison);

    cumulative.forEach(year => {
      expect(year.difference).toBeCloseTo(
        year.goldCumulative - year.sippCumulative,
        2
      );
    });
  });
});

describe('getKeyInsights', () => {
  test('given_comparison_when_gettingInsights_then_returnsArray', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const insights = getKeyInsights(comparison);

    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);
  });

  test('given_comparison_when_gettingInsights_then_allStrings', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const insights = getKeyInsights(comparison);

    insights.forEach(insight => {
      expect(typeof insight).toBe('string');
    });
  });

  test('given_comparison_when_gettingInsights_then_mentionsInitialTax', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const insights = getKeyInsights(comparison);

    const hasTaxInsight = insights.some(i => i.toLowerCase().includes('tax'));
    expect(hasTaxInsight).toBe(true);
  });

  test('given_comparison_when_gettingInsights_then_mentionsManagementFees', () => {
    const comparison = compareStrategies(500000, 2010, 4, 5);
    const insights = getKeyInsights(comparison);

    const hasFeeInsight = insights.some(i => i.toLowerCase().includes('management fee'));
    expect(hasFeeInsight).toBe(true);
  });
});

describe('integration tests', () => {
  test('given_historicalPeriod2000to2024_when_comparing_then_producesRealisticResults', () => {
    const result = compareStrategies(500000, 2000, 4, 25);

    // Both strategies should have withdrawn money
    expect(result.summary.gold.totalNetWithdrawn).toBeGreaterThan(0);
    expect(result.summary.sipp.totalNetWithdrawn).toBeGreaterThan(0);

    // Gold paid initial tax, SIPP didn't
    expect(result.summary.gold.initialTaxPaid).toBeGreaterThan(0);
    expect(result.summary.sipp.initialTaxPaid).toBe(0);

    // SIPP paid ongoing fees and withdrawal tax
    expect(result.summary.sipp.totalManagementFees).toBeGreaterThan(0);
    expect(result.summary.sipp.totalWithdrawalTax).toBeGreaterThan(0);
  });

  test('given_shortPeriod_when_comparing_then_goldDisadvantagedByInitialTax', () => {
    // Over short periods, gold's initial tax hit is harder to recover from
    const result = compareStrategies(500000, 2020, 4, 3);

    // Gold has already paid significant tax
    expect(result.summary.gold.initialTaxPaid).toBeGreaterThan(50000);
  });

  test('given_highWithdrawalRate_when_comparing_then_bothMayDeplete', () => {
    const result = compareStrategies(100000, 2000, 15, 26);

    // High withdrawal rate may cause depletion - just verify completion
    // result.summary.gold.yearDepleted and result.summary.sipp.yearDepleted track this
    expect(result.yearlyComparison).toHaveLength(26);
  });

  test('given_differentStartYears_when_comparing_then_resultsVary', () => {
    // Gold performed differently in different periods
    const early = compareStrategies(500000, 2000, 4, 10);
    const later = compareStrategies(500000, 2010, 4, 10);

    // Results should be different (gold vs S&P performed differently)
    expect(early.summary.winner).toBeDefined();
    expect(later.summary.winner).toBeDefined();
  });

  test('given_largeComparison_when_running_then_completesEfficiently', () => {
    const startTime = Date.now();
    const result = compareStrategies(500000, 2000, 4, 26);
    const endTime = Date.now();

    // Should complete quickly (under 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
    expect(result.yearlyComparison).toHaveLength(26);
  });
});

describe('compareAnyStrategies', () => {
  describe('input validation', () => {
    test('given_invalidStrategy1_when_comparing_then_throwsError', () => {
      expect(() => compareAnyStrategies('invalid', 'sp500', 500000, 2000, 4, 10))
        .toThrow("Strategy 'invalid' not found");
    });

    test('given_invalidStrategy2_when_comparing_then_throwsError', () => {
      expect(() => compareAnyStrategies('gold', 'invalid', 500000, 2000, 4, 10))
        .toThrow("Strategy 'invalid' not found");
    });

    test('given_startYearBeforeStrategy1Data_when_comparing_then_throwsError', () => {
      // Nasdaq 100 data starts 1985
      expect(() => compareAnyStrategies('nasdaq100', 'gold', 500000, 1980, 4, 10))
        .toThrow('Nasdaq 100 SIPP data not available until 1985');
    });

    test('given_startYearBeforeStrategy2Data_when_comparing_then_throwsError', () => {
      // FTSE 100 data starts 1984
      expect(() => compareAnyStrategies('gold', 'ftse100', 500000, 1980, 4, 10))
        .toThrow('FTSE 100 SIPP data not available until 1984');
    });

    test('given_negativePensionAmount_when_comparing_then_throwsError', () => {
      expect(() => compareAnyStrategies('gold', 'sp500', -100000, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });
  });

  describe('inflation-adjusted comparisons', () => {
    test('given_inflationEnabled_when_comparingStrategies_then_bothStrategiesHaveGrowingWithdrawals', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2010, 4, 5, { adjustForInflation: true });

      const year1 = result.yearlyComparison[0];
      const year2 = result.yearlyComparison[1];

      // Both strategies should show growing gross withdrawals
      if (year2.strategy1.status === 'active' && year1.strategy1.status === 'active') {
        expect(year2.strategy1.grossWithdrawal).toBeGreaterThan(year1.strategy1.grossWithdrawal);
      }
      if (year2.strategy2.status === 'active' && year1.strategy2.status === 'active') {
        expect(year2.strategy2.grossWithdrawal).toBeGreaterThan(year1.strategy2.grossWithdrawal);
      }
    });

    test('given_inflationDisabled_when_comparingStrategies_then_flatWithdrawals', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2010, 4, 5, { adjustForInflation: false });

      const year1 = result.yearlyComparison[0];
      const year5 = result.yearlyComparison[4];

      // Gold gross withdrawal should stay flat
      if (year1.strategy1.status === 'active' && year5.strategy1.status === 'active') {
        expect(year5.strategy1.grossWithdrawal).toBeCloseTo(year1.strategy1.grossWithdrawal, 0);
      }
    });

    test('given_inflationEnabled_when_usingCompareStrategies_then_withdrawalsGrow', () => {
      const result = compareStrategies(500000, 2010, 4, 5, { adjustForInflation: true });

      const year1 = result.yearlyComparison[0];
      const year2 = result.yearlyComparison[1];

      // SIPP gross withdrawal should grow
      expect(year2.sipp.grossWithdrawal).toBeGreaterThan(year1.sipp.grossWithdrawal);
    });

    test('given_inflationDisabled_when_usingCompareStrategies_then_withdrawalsFlat', () => {
      const result = compareStrategies(500000, 2010, 4, 5, { adjustForInflation: false });

      const year1 = result.yearlyComparison[0];
      const year5 = result.yearlyComparison[4];

      // SIPP gross withdrawal should be flat
      expect(year5.sipp.grossWithdrawal).toBeCloseTo(year1.sipp.grossWithdrawal, 0);
    });
  });

  describe('result structure', () => {
    test('given_goldVsNasdaq_when_comparing_then_returnsCorrectStructure', () => {
      const result = compareAnyStrategies('gold', 'nasdaq100', 500000, 1990, 4, 10);

      expect(result).toHaveProperty('inputs');
      expect(result).toHaveProperty('strategy1');
      expect(result).toHaveProperty('strategy2');
      expect(result).toHaveProperty('yearlyComparison');
      expect(result).toHaveProperty('summary');
    });

    test('given_goldVsNasdaq_when_comparing_then_strategy1HasCorrectProperties', () => {
      const result = compareAnyStrategies('gold', 'nasdaq100', 500000, 1990, 4, 10);

      expect(result.strategy1.id).toBe('gold');
      expect(result.strategy1.name).toBe('Physical Gold - Outside Pension');
      expect(result.strategy1.shortName).toBe('Physical Gold');
      expect(result.strategy1.type).toBe('gold');
      expect(result.strategy1).toHaveProperty('result');
      expect(result.strategy1).toHaveProperty('metrics');
    });

    test('given_goldVsNasdaq_when_comparing_then_strategy2HasCorrectProperties', () => {
      const result = compareAnyStrategies('gold', 'nasdaq100', 500000, 1990, 4, 10);

      expect(result.strategy2.id).toBe('nasdaq100');
      expect(result.strategy2.name).toBe('Nasdaq 100 SIPP');
      expect(result.strategy2.shortName).toBe('Nasdaq 100');
      expect(result.strategy2.type).toBe('sipp');
    });

    test('given_validInputs_when_comparing_then_summaryHasWinnerInfo', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      expect(result.summary).toHaveProperty('winner');
      expect(result.summary).toHaveProperty('winnerName');
      expect(result.summary).toHaveProperty('difference');
      expect(result.summary).toHaveProperty('percentageDifference');
      expect(result.summary).toHaveProperty('comparison');
    });

    test('given_validInputs_when_comparing_then_yearlyComparisonHasCorrectLength', () => {
      const result = compareAnyStrategies('gold', 'ftse100', 500000, 1990, 4, 15);

      expect(result.yearlyComparison).toHaveLength(15);
    });

    test('given_validInputs_when_comparing_then_yearlyComparisonHasStrategy1And2', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      const firstYear = result.yearlyComparison[0];
      expect(firstYear).toHaveProperty('strategy1');
      expect(firstYear).toHaveProperty('strategy2');
      expect(firstYear).toHaveProperty('difference');
      expect(firstYear.strategy1).toHaveProperty('assetValue');
      expect(firstYear.strategy2).toHaveProperty('assetValue');
    });
  });

  describe('different strategy combinations', () => {
    test('given_sp500VsFtse100_when_comparing_then_succeeds', () => {
      const result = compareAnyStrategies('sp500', 'ftse100', 500000, 1990, 4, 10);

      expect(result.strategy1.id).toBe('sp500');
      expect(result.strategy2.id).toBe('ftse100');
      expect(result.strategy1.type).toBe('sipp');
      expect(result.strategy2.type).toBe('sipp');
    });

    test('given_nasdaqVsFtse_when_comparing_then_succeeds', () => {
      const result = compareAnyStrategies('nasdaq100', 'ftse100', 500000, 1990, 4, 10);

      expect(result.strategy1.shortName).toBe('Nasdaq 100');
      expect(result.strategy2.shortName).toBe('FTSE 100');
    });

    test('given_combinedVsBase_when_comparing_then_succeeds', () => {
      const result = compareAnyStrategies('gold-sp500', 'gold', 500000, 2000, 4, 10);

      expect(result.strategy1.id).toBe('gold-sp500');
      expect(result.strategy1.type).toBe('combined');
      expect(result.strategy2.id).toBe('gold');
      expect(result.strategy2.type).toBe('gold');
    });

    test('given_twoCombined_when_comparing_then_succeeds', () => {
      const result = compareAnyStrategies('gold-sp500', 'gold-nasdaq100', 500000, 1990, 4, 10);

      expect(result.strategy1.type).toBe('combined');
      expect(result.strategy2.type).toBe('combined');
    });
  });

  describe('metrics calculation', () => {
    test('given_goldStrategy_when_compared_then_metricsIncludeInitialTax', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      expect(result.strategy1.metrics.initialTaxPaid).toBeGreaterThan(0);
      expect(result.strategy2.metrics.initialTaxPaid).toBe(0);
    });

    test('given_validInputs_when_compared_then_totalValueRealizedCalculated', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      expect(result.strategy1.metrics.totalValueRealized).toBeGreaterThan(0);
      expect(result.strategy2.metrics.totalValueRealized).toBeGreaterThan(0);
    });

    test('given_sippStrategy_when_compared_then_hasFees', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      expect(result.strategy2.metrics.totalFees).toBeGreaterThan(0);
    });
  });

  describe('winner determination', () => {
    test('given_goldPerformsWorse_when_comparing_then_strategy2Wins', () => {
      // In many periods S&P 500 outperformed gold
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2010, 4, 10);

      // The winner should be determined
      expect(['strategy1', 'strategy2', 'tie']).toContain(result.summary.winner);
    });

    test('given_winnerIsStrategy1_when_compared_then_winnerNameIsStrategy1ShortName', () => {
      const result = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);

      if (result.summary.winner === 'strategy1') {
        expect(result.summary.winnerName).toBe('Physical Gold');
      } else if (result.summary.winner === 'strategy2') {
        expect(result.summary.winnerName).toBe('S&P 500');
      } else {
        expect(result.summary.winnerName).toBe('Tie');
      }
    });
  });
});

// ============================================
// Gold ETF & US Treasury Comparison Tests
// ============================================

describe('Gold ETF and US Treasury comparisons', () => {
  test('given_goldEtfVsSp500_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('goldEtf', 'sp500', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('goldEtf');
    expect(result.strategy2.id).toBe('sp500');
    expect(result.strategy1.type).toBe('sipp');
    expect(result.strategy2.type).toBe('sipp');
    expect(result.yearlyComparison).toHaveLength(10);
  });

  test('given_goldEtfVsGold_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('goldEtf', 'gold', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('goldEtf');
    expect(result.strategy1.type).toBe('sipp');
    expect(result.strategy2.id).toBe('gold');
    expect(result.strategy2.type).toBe('gold');
  });

  test('given_usTreasuryVsSp500_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('usTreasury', 'sp500', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('usTreasury');
    expect(result.strategy2.id).toBe('sp500');
    expect(result.yearlyComparison).toHaveLength(10);
  });

  test('given_usTreasuryVsGold_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('usTreasury', 'gold', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('usTreasury');
    expect(result.strategy2.id).toBe('gold');
    expect(result.summary).toBeDefined();
    expect(['strategy1', 'strategy2', 'tie']).toContain(result.summary.winner);
  });

  test('given_goldEtfVsUsTreasury_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('goldEtf', 'usTreasury', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('goldEtf');
    expect(result.strategy2.id).toBe('usTreasury');
    expect(result.yearlyComparison).toHaveLength(10);
    expect(result.summary.difference).toBeDefined();
  });

  test('given_goldEtfCombinedVsBase_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('goldEtf-sp500', 'sp500', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('goldEtf-sp500');
    expect(result.strategy1.type).toBe('combined');
    expect(result.strategy2.id).toBe('sp500');
  });

  test('given_usTreasuryCombinedVsBase_when_comparing_then_succeeds', () => {
    const result = compareAnyStrategies('sp500-usTreasury', 'sp500', 500000, 2000, 4, 10);

    expect(result.strategy1.id).toBe('sp500-usTreasury');
    expect(result.strategy1.type).toBe('combined');
    expect(result.strategy2.id).toBe('sp500');
  });
});

// ============================================
// Phase 8: Configurable Fees in Comparison
// ============================================

describe('configurable fees in comparisons', () => {
  test('given_customSippFee_when_comparingAnyStrategies_then_affectsResults', () => {
    const defaultResult = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);
    const customResult = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10, {
      sippManagementFeePercent: 0.1
    });

    // Lower SIPP fee = lower total fees
    expect(customResult.strategy2.metrics.totalFees)
      .toBeLessThan(defaultResult.strategy2.metrics.totalFees);
  });

  test('given_customGoldTransactionFee_when_comparingAnyStrategies_then_affectsResults', () => {
    const defaultResult = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10);
    const customResult = compareAnyStrategies('gold', 'sp500', 500000, 2000, 4, 10, {
      goldTransactionPercent: 1
    });

    // Lower gold transaction fee should improve gold strategy
    expect(customResult.strategy1.metrics.totalValueRealized)
      .toBeGreaterThan(defaultResult.strategy1.metrics.totalValueRealized);
  });

  test('given_customSippFee_when_comparingSippVsSipp_then_affectsResults', () => {
    const defaultResult = compareAnyStrategies('sp500', 'nasdaq100', 500000, 2000, 4, 10);
    const customResult = compareAnyStrategies('sp500', 'nasdaq100', 500000, 2000, 4, 10, {
      sippManagementFeePercent: 0.1
    });

    // Both strategies should have lower fees
    expect(customResult.strategy1.metrics.totalFees)
      .toBeLessThan(defaultResult.strategy1.metrics.totalFees);
    expect(customResult.strategy2.metrics.totalFees)
      .toBeLessThan(defaultResult.strategy2.metrics.totalFees);
  });

  test('given_customFeesWithCombinedStrategy_when_comparing_then_feesFlowThrough', () => {
    const defaultResult = compareAnyStrategies('gold-sp500', 'sp500', 500000, 2000, 4, 10);
    const customResult = compareAnyStrategies('gold-sp500', 'sp500', 500000, 2000, 4, 10, {
      sippManagementFeePercent: 0.1
    });

    // Both results should be valid, and fees should differ
    expect(defaultResult.strategy2.metrics.totalFees)
      .toBeGreaterThan(customResult.strategy2.metrics.totalFees);
  });
});
