/**
 * Backtest Application Tests
 *
 * Tests for the backtest page logic: input validation, strategy outcome formatting,
 * backtest result calculation, and summary statistics.
 *
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
  validateBacktestInputs,
  formatStrategyOutcome,
  calculateBacktestSummaryStats,
  calculateBacktestResults
} from '../src/backtestApp.js';
import { getStrategy } from '../src/calculators/strategyRegistry.js';
import { YEAR_RANGE } from '../src/config/defaults.js';

describe('Backtest Input Validation', () => {
  const validInputs = {
    strategy1: 'gold',
    strategy2: 'sp500',
    pensionAmount: 500000,
    withdrawalRate: 5,
    periodLength: 15
  };

  test('given_validInputs_when_validating_then_returnsValid', () => {
    const result = validateBacktestInputs(validInputs);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('given_missingStrategy1_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, strategy1: '' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Please select both strategies');
  });

  test('given_missingStrategy2_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, strategy2: null });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Please select both strategies');
  });

  test('given_sameStrategies_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, strategy2: 'gold' });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Please select two different strategies');
  });

  test('given_pensionAmountTooLow_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, pensionAmount: 5000 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pension amount must be at least £10,000');
  });

  test('given_zeroPensionAmount_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, pensionAmount: 0 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pension amount must be at least £10,000');
  });

  test('given_withdrawalRateTooLow_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, withdrawalRate: 0.5 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Withdrawal rate must be between 1% and 10%');
  });

  test('given_withdrawalRateTooHigh_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, withdrawalRate: 11 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Withdrawal rate must be between 1% and 10%');
  });

  test('given_periodLengthTooShort_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, periodLength: 3 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Period length must be between 5 and 30 years');
  });

  test('given_periodLengthTooLong_when_validating_then_returnsError', () => {
    const result = validateBacktestInputs({ ...validInputs, periodLength: 35 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Period length must be between 5 and 30 years');
  });

  test('given_minimumValidValues_when_validating_then_returnsValid', () => {
    const result = validateBacktestInputs({
      strategy1: 'gold',
      strategy2: 'sp500',
      pensionAmount: 10000,
      withdrawalRate: 1,
      periodLength: 5
    });

    expect(result.valid).toBe(true);
  });

  test('given_maximumValidValues_when_validating_then_returnsValid', () => {
    const result = validateBacktestInputs({
      strategy1: 'gold',
      strategy2: 'sp500',
      pensionAmount: 10000000,
      withdrawalRate: 10,
      periodLength: 30
    });

    expect(result.valid).toBe(true);
  });

  test('given_multipleInvalidFields_when_validating_then_returnsAllErrors', () => {
    const result = validateBacktestInputs({
      strategy1: 'gold',
      strategy2: 'gold',
      pensionAmount: 100,
      withdrawalRate: 0,
      periodLength: 2
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Format Strategy Outcome', () => {
  test('given_successfulStrategy_when_formatting_then_showsCurrencyValue', () => {
    const metrics = {
      strategySuccessful: true,
      totalValueRealized: 750000
    };

    const result = formatStrategyOutcome(metrics);

    expect(result.cssClass).toBe('positive');
    expect(result.value).toBe(750000);
    expect(result.text).toContain('750,000');
  });

  test('given_exhaustedStrategy_when_formatting_then_showsExhaustedMessage', () => {
    const metrics = {
      strategySuccessful: false,
      yearDepleted: 2015,
      yearsActive: 10
    };

    const result = formatStrategyOutcome(metrics);

    expect(result.cssClass).toBe('negative');
    expect(result.value).toBe(0);
    expect(result.text).toContain('Exhausted after 10 years');
    expect(result.text).toContain('2015');
  });

  test('given_exhaustedAfter1Year_when_formatting_then_usesSingularYear', () => {
    const metrics = {
      strategySuccessful: false,
      yearDepleted: 2001,
      yearsActive: 1
    };

    const result = formatStrategyOutcome(metrics);

    expect(result.text).toContain('Exhausted after 1 year');
    expect(result.text).not.toContain('years');
  });

  test('given_exhaustedAfterMultipleYears_when_formatting_then_usesPluralYears', () => {
    const metrics = {
      strategySuccessful: false,
      yearDepleted: 2005,
      yearsActive: 5
    };

    const result = formatStrategyOutcome(metrics);

    expect(result.text).toContain('Exhausted after 5 years');
  });

  test('given_zeroValueStrategy_when_formatting_then_showsCurrencyZero', () => {
    const metrics = {
      strategySuccessful: true,
      totalValueRealized: 0
    };

    const result = formatStrategyOutcome(metrics);

    expect(result.cssClass).toBe('positive');
    expect(result.value).toBe(0);
  });
});

describe('Calculate Backtest Results', () => {
  test('given_goldAndSp500With5YearPeriod_when_calculating_then_returnsResultsForAllYears', () => {
    const result = calculateBacktestResults('gold', 'sp500', 500000, 5, 5);

    expect(result.error).toBeUndefined();
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.strategy1.id).toBe('gold');
    expect(result.strategy2.id).toBe('sp500');
    expect(result.earliestYear).toBe(1980);
  });

  test('given_goldAndSp500_when_calculating_then_eachResultHasStartAndEndYear', () => {
    const periodLength = 10;
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, periodLength);

    result.results.forEach(r => {
      expect(r.endYear).toBe(r.startYear + periodLength - 1);
      expect(r.comparison).toBeDefined();
      expect(r.comparison.strategy1).toBeDefined();
      expect(r.comparison.strategy2).toBeDefined();
      expect(r.comparison.summary).toBeDefined();
    });
  });

  test('given_goldAndSp500_when_calculating_then_startYearsAreContinuous', () => {
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, 10);

    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i].startYear).toBe(result.results[i - 1].startYear + 1);
    }
  });

  test('given_goldAndSp500_when_calculating_then_firstYearIsEarliestAvailable', () => {
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, 10);

    expect(result.results[0].startYear).toBe(1980);
  });

  test('given_goldAndSp500_when_calculating_then_lastEndYearDoesNotExceedMaxYear', () => {
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, 10);
    const lastResult = result.results[result.results.length - 1];

    expect(lastResult.endYear).toBeLessThanOrEqual(YEAR_RANGE.max);
  });

  test('given_nasdaq100AndFtse100_when_calculating_then_earliestYearIs1985', () => {
    const result = calculateBacktestResults('nasdaq100', 'ftse100', 100000, 4, 5);

    expect(result.earliestYear).toBe(1985);
    expect(result.results[0].startYear).toBe(1985);
  });

  test('given_goldAndNasdaq100_when_calculating_then_earliestYearIs1985', () => {
    const result = calculateBacktestResults('gold', 'nasdaq100', 100000, 4, 10);

    expect(result.earliestYear).toBe(1985);
    expect(result.results[0].startYear).toBe(1985);
  });

  test('given_periodLongerThanData_when_calculating_then_returnsError', () => {
    // Nasdaq 100 starts at 1985, data goes to 2026 = 42 years max
    // Period of 30 from 1985 would end 2014, that should work
    // But a period that's too long will fail
    const result = calculateBacktestResults('nasdaq100', 'ftse100', 100000, 4, 50);

    expect(result.error).toBeDefined();
    expect(result.results).toHaveLength(0);
  });

  test('given_5YearPeriod_when_calculating_then_latestStartYearCorrect', () => {
    const periodLength = 5;
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, periodLength);

    const expectedLatest = YEAR_RANGE.max - periodLength + 1;
    const lastResult = result.results[result.results.length - 1];

    expect(lastResult.startYear).toBe(expectedLatest);
  });

  test('given_validInputs_when_calculating_then_correctNumberOfPeriods', () => {
    const periodLength = 10;
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, periodLength);

    const earliestYear = 1980;
    const latestStart = YEAR_RANGE.max - periodLength + 1;
    const expectedCount = latestStart - earliestYear + 1;

    expect(result.results.length).toBe(expectedCount);
  });

  test('given_combinedStrategy_when_calculating_then_worksCorrectly', () => {
    const result = calculateBacktestResults('gold-sp500', 'sp500', 100000, 4, 10);

    expect(result.error).toBeUndefined();
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.strategy1.id).toBe('gold-sp500');
  });

  test('given_eachResult_when_inspecting_then_hasWinner', () => {
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, 10);

    result.results.forEach(r => {
      expect(['strategy1', 'strategy2', 'tie']).toContain(r.comparison.summary.winner);
    });
  });

  test('given_eachResult_when_inspecting_then_hasMetrics', () => {
    const result = calculateBacktestResults('gold', 'sp500', 100000, 4, 10);

    result.results.forEach(r => {
      const m1 = r.comparison.strategy1.metrics;
      const m2 = r.comparison.strategy2.metrics;

      expect(m1).toHaveProperty('totalValueRealized');
      expect(m1).toHaveProperty('strategySuccessful');
      expect(m2).toHaveProperty('totalValueRealized');
      expect(m2).toHaveProperty('strategySuccessful');
    });
  });
});

describe('Calculate Backtest Summary Stats', () => {
  // Build minimal mock results for testing summary stats
  function buildMockResults(scenarios) {
    return scenarios.map(s => ({
      startYear: s.startYear,
      comparison: {
        strategy1: {
          metrics: {
            totalValueRealized: s.s1Value,
            strategySuccessful: s.s1Successful
          }
        },
        strategy2: {
          metrics: {
            totalValueRealized: s.s2Value,
            strategySuccessful: s.s2Successful
          }
        },
        summary: {
          winner: s.winner
        }
      }
    }));
  }

  const strategy1 = { shortName: 'Gold' };
  const strategy2 = { shortName: 'S&P 500' };

  test('given_allStrategy1Wins_when_calculatingSummary_then_strategy1IsOverallWinner', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2001, s1Value: 700000, s2Value: 500000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2002, s1Value: 800000, s2Value: 300000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Wins).toBe(3);
    expect(stats.s2Wins).toBe(0);
    expect(stats.ties).toBe(0);
    expect(stats.overallWinner).toBe('Gold');
    expect(stats.overallWinnerClass).toBe('backtest-winner-s1');
    expect(stats.totalPeriods).toBe(3);
  });

  test('given_allStrategy2Wins_when_calculatingSummary_then_strategy2IsOverallWinner', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 300000, s2Value: 600000, s1Successful: true, s2Successful: true, winner: 'strategy2' },
      { startYear: 2001, s1Value: 400000, s2Value: 700000, s1Successful: true, s2Successful: true, winner: 'strategy2' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Wins).toBe(0);
    expect(stats.s2Wins).toBe(2);
    expect(stats.overallWinner).toBe('S&P 500');
    expect(stats.overallWinnerClass).toBe('backtest-winner-s2');
  });

  test('given_equalWins_when_calculatingSummary_then_tieResult', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2001, s1Value: 400000, s2Value: 600000, s1Successful: true, s2Successful: true, winner: 'strategy2' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Wins).toBe(1);
    expect(stats.s2Wins).toBe(1);
    expect(stats.overallWinner).toBe('Tie');
    expect(stats.overallWinnerClass).toBe('');
  });

  test('given_someTies_when_calculatingSummary_then_tiesCountedCorrectly', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 500000, s2Value: 500000, s1Successful: true, s2Successful: true, winner: 'tie' },
      { startYear: 2001, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.ties).toBe(1);
    expect(stats.s1Wins).toBe(1);
  });

  test('given_exhaustedStrategies_when_calculatingSummary_then_exhaustionCounted', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 0, s2Value: 600000, s1Successful: false, s2Successful: true, winner: 'strategy2' },
      { startYear: 2001, s1Value: 700000, s2Value: 0, s1Successful: true, s2Successful: false, winner: 'strategy1' },
      { startYear: 2002, s1Value: 0, s2Value: 0, s1Successful: false, s2Successful: false, winner: 'tie' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Exhausted).toBe(2);
    expect(stats.s2Exhausted).toBe(2);
  });

  test('given_mixedResults_when_calculatingSummary_then_averagesOnlyCountSuccessful', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2001, s1Value: 0, s2Value: 800000, s1Successful: false, s2Successful: true, winner: 'strategy2' },
      { startYear: 2002, s1Value: 800000, s2Value: 200000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    // S1 avg: only 2 successful = (600000 + 800000) / 2 = 700000
    expect(stats.s1AvgValue).toBe(700000);
    expect(stats.s1SuccessCount).toBe(2);

    // S2 avg: all 3 successful = (400000 + 800000 + 200000) / 3
    expect(stats.s2AvgValue).toBeCloseTo(466666.67, 0);
    expect(stats.s2SuccessCount).toBe(3);
  });

  test('given_allExhausted_when_calculatingSummary_then_averageIsZero', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 0, s2Value: 0, s1Successful: false, s2Successful: false, winner: 'tie' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1AvgValue).toBe(0);
    expect(stats.s2AvgValue).toBe(0);
    expect(stats.s1SuccessCount).toBe(0);
    expect(stats.s2SuccessCount).toBe(0);
  });

  test('given_multipleResults_when_calculatingSummary_then_bestPeriodIdentified', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2001, s1Value: 900000, s2Value: 800000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2002, s1Value: 500000, s2Value: 300000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Best.value).toBe(900000);
    expect(stats.s1Best.year).toBe(2001);
    expect(stats.s2Best.value).toBe(800000);
    expect(stats.s2Best.year).toBe(2001);
  });

  test('given_multipleResults_when_calculatingSummary_then_worstPeriodIdentified', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 600000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2001, s1Value: 200000, s2Value: 100000, s1Successful: true, s2Successful: true, winner: 'strategy1' },
      { startYear: 2002, s1Value: 500000, s2Value: 300000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Worst.value).toBe(200000);
    expect(stats.s1Worst.year).toBe(2001);
    expect(stats.s2Worst.value).toBe(100000);
    expect(stats.s2Worst.year).toBe(2001);
  });

  test('given_singleResult_when_calculatingSummary_then_bestAndWorstAreSame', () => {
    const results = buildMockResults([
      { startYear: 2000, s1Value: 500000, s2Value: 400000, s1Successful: true, s2Successful: true, winner: 'strategy1' }
    ]);

    const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

    expect(stats.s1Best.year).toBe(2000);
    expect(stats.s1Worst.year).toBe(2000);
    expect(stats.s1Best.value).toBe(stats.s1Worst.value);
  });
});

describe('Backtest Integration', () => {
  test('given_goldVsSp500With15YearPeriod_when_runningFullBacktest_then_producesConsistentResults', () => {
    const result = calculateBacktestResults('gold', 'sp500', 500000, 5, 15);

    expect(result.error).toBeUndefined();
    expect(result.results.length).toBeGreaterThan(0);

    const stats = calculateBacktestSummaryStats(
      result.results,
      result.strategy1,
      result.strategy2
    );

    // Total wins + ties should equal total periods
    expect(stats.s1Wins + stats.s2Wins + stats.ties).toBe(stats.totalPeriods);

    // Exhausted counts should not exceed total periods
    expect(stats.s1Exhausted).toBeLessThanOrEqual(stats.totalPeriods);
    expect(stats.s2Exhausted).toBeLessThanOrEqual(stats.totalPeriods);

    // Best should be >= worst
    expect(stats.s1Best.value).toBeGreaterThanOrEqual(stats.s1Worst.value);
    expect(stats.s2Best.value).toBeGreaterThanOrEqual(stats.s2Worst.value);
  });

  test('given_goldVsFtse100With10YearPeriod_when_runningBacktest_then_respectsEarliestYear', () => {
    const result = calculateBacktestResults('gold', 'ftse100', 100000, 4, 10);

    // FTSE 100 starts 1984, so earliest should be 1984
    expect(result.earliestYear).toBe(1984);
    expect(result.results[0].startYear).toBe(1984);
  });

  test('given_nasdaq100VsFtse100_when_runningBacktest_then_respectsNasdaq100Constraint', () => {
    const result = calculateBacktestResults('nasdaq100', 'ftse100', 100000, 4, 10);

    expect(result.earliestYear).toBe(1985);
    expect(result.results[0].startYear).toBe(1985);
  });

  test('given_backtestResults_when_formattingOutcomes_then_allOutcomesAreValid', () => {
    const result = calculateBacktestResults('gold', 'sp500', 500000, 5, 10);

    result.results.forEach(r => {
      const s1Outcome = formatStrategyOutcome(r.comparison.strategy1.metrics);
      const s2Outcome = formatStrategyOutcome(r.comparison.strategy2.metrics);

      expect(['positive', 'negative']).toContain(s1Outcome.cssClass);
      expect(['positive', 'negative']).toContain(s2Outcome.cssClass);
      expect(typeof s1Outcome.text).toBe('string');
      expect(typeof s2Outcome.text).toBe('string');
      expect(s1Outcome.text.length).toBeGreaterThan(0);
      expect(s2Outcome.text.length).toBeGreaterThan(0);
    });
  });

  test('given_highWithdrawalRate_when_runningBacktest_then_someStrategiesExhaust', () => {
    // 10% withdrawal should exhaust some strategies
    const result = calculateBacktestResults('gold', 'sp500', 100000, 10, 20);

    expect(result.results.length).toBeGreaterThan(0);

    const stats = calculateBacktestSummaryStats(
      result.results,
      result.strategy1,
      result.strategy2
    );

    // With 10% withdrawal over 20 years, at least one strategy should exhaust sometimes
    const totalExhausted = stats.s1Exhausted + stats.s2Exhausted;
    expect(totalExhausted).toBeGreaterThan(0);
  });

  test('given_lowWithdrawalRate_when_runningBacktest_then_fewerExhaustions', () => {
    const resultLow = calculateBacktestResults('gold', 'sp500', 100000, 1, 10);
    const resultHigh = calculateBacktestResults('gold', 'sp500', 100000, 10, 10);

    const statsLow = calculateBacktestSummaryStats(
      resultLow.results,
      resultLow.strategy1,
      resultLow.strategy2
    );
    const statsHigh = calculateBacktestSummaryStats(
      resultHigh.results,
      resultHigh.strategy1,
      resultHigh.strategy2
    );

    // Low withdrawal should have fewer or equal exhaustions
    expect(statsLow.s1Exhausted + statsLow.s2Exhausted)
      .toBeLessThanOrEqual(statsHigh.s1Exhausted + statsHigh.s2Exhausted);
  });
});
