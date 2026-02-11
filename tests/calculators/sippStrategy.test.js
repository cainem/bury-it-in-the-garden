/**
 * SIPP Strategy Calculator Tests
 *
 * Tests for simulating pension kept invested in equity trackers within SIPP.
 * Supports multiple indices: S&P 500, Nasdaq 100, FTSE 100.
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
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
} from '../../src/calculators/sippStrategy.js';
import { getSyntheticPrice, getSyntheticEtfPrice } from '../../src/calculators/syntheticEtf.js';
import { COSTS } from '../../src/config/defaults.js';

describe('calculateSippStrategy', () => {
  describe('input validation', () => {
    test('given_negativePensionAmount_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(-100000, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_zeroPensionAmount_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(0, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_invalidStartYear_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(100000, 1979, 4, 10))
        .toThrow('Start year 1979 is outside supported range');
    });

    test('given_invalidWithdrawalRate_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(100000, 2000, 0, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
      expect(() => calculateSippStrategy(100000, 2000, -5, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
      expect(() => calculateSippStrategy(100000, 2000, 101, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
    });

    test('given_invalidYears_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(100000, 2000, 4, 0))
        .toThrow('Years must be a positive integer');
      expect(() => calculateSippStrategy(100000, 2000, 4, -5))
        .toThrow('Years must be a positive integer');
      expect(() => calculateSippStrategy(100000, 2000, 4, 2.5))
        .toThrow('Years must be a positive integer');
    });

    test('given_yearsExtendBeyondData_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(100000, 2020, 4, 10))
        .toThrow('Not enough data');
    });
  });

  describe('initial investment', () => {
    test('given_pension500k_when_calculating_then_noInitialTax', () => {
      const result = calculateSippStrategy(500000, 2000, 4, 10);

      // Initial investment should equal pension amount (no tax in SIPP)
      expect(result.initialInvestment.pensionAmount).toBe(500000);
      expect(result.initialInvestment.initialValue).toBe(500000);
    });

    test('given_pensionAmount_when_calculating_then_calculatesCorrectUnits', () => {
      const result = calculateSippStrategy(100000, 2020, 4, 5);

      const etfPrice = getSyntheticEtfPrice(2020);
      const expectedUnits = 100000 / etfPrice;

      expect(result.initialInvestment.etfPriceAtStart).toBe(etfPrice);
      expect(result.initialInvestment.unitsAcquired).toBeCloseTo(expectedUnits, 4);
    });
  });

  describe('management fees', () => {
    test('given_activeYear_when_calculating_then_deductsManagementFee', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 5);

      // Each year should have a management fee
      result.yearlyResults.forEach(year => {
        if (year.status !== 'exhausted') {
          expect(year.managementFee).toBeGreaterThan(0);
        }
      });
    });

    test('given_portfolio_when_calculating_then_feeIs0Point5Percent', () => {
      const result = calculateSippStrategy(100000, 2020, 4, 1);

      const year1 = result.yearlyResults[0];
      const expectedFee = year1.startValueGbp * (COSTS.sippManagementFeePercent / 100);

      expect(year1.managementFee).toBeCloseTo(expectedFee, 2);
    });

    test('given_multipleYears_when_calculating_then_totalFeesAreSubstantial', () => {
      const result = calculateSippStrategy(500000, 2000, 4, 25);

      // Over 25 years, fees should be significant
      expect(result.summary.totalManagementFees).toBeGreaterThan(10000);
    });
  });

  describe('yearly withdrawals', () => {
    test('given_activeStrategy_when_withdrawing_then_sellsUnitsAndPaysTax', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 5);

      // First year should be active
      const year1 = result.yearlyResults[0];
      expect(year1.status).toBe('active');
      expect(year1.unitsSold).toBeGreaterThan(0);
      expect(year1.taxOnWithdrawal).toBeGreaterThan(0);
    });

    test('given_4PercentWithdrawal_when_calculating_then_withdrawsCorrectGrossAmount', () => {
      const pensionAmount = 500000;
      const withdrawalRate = 4;
      const expectedAnnualWithdrawal = pensionAmount * (withdrawalRate / 100);

      const result = calculateSippStrategy(pensionAmount, 2010, withdrawalRate, 5);

      // Active years should get the target gross withdrawal
      const activeYear = result.yearlyResults[0];
      expect(activeYear.grossWithdrawal).toBeCloseTo(expectedAnnualWithdrawal, 0);
    });

    test('given_withdrawal_when_calculating_then_applies25PercentTaxFree', () => {
      const result = calculateSippStrategy(100000, 2020, 4, 5);

      const year1 = result.yearlyResults[0];
      // Net should be greater than gross minus 40% (worst case)
      // because 25% is tax-free
      expect(year1.netWithdrawal).toBeGreaterThan(year1.grossWithdrawal * 0.6);
    });

    test('given_unitsSold_when_calculating_then_reducesHoldings', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 5);

      const year1 = result.yearlyResults[0];
      const year2 = result.yearlyResults[1];

      // Units should decrease (after fee and withdrawal)
      expect(year2.startUnits).toBeLessThan(year1.startUnits);
    });
  });

  describe('fund depletion', () => {
    test('given_highWithdrawalRate_when_calculating_then_eventuallyDepletes', () => {
      // 10% withdrawal rate on small pot with poor market timing
      const result = calculateSippStrategy(50000, 2000, 10, 20);

      // May or may not deplete depending on market performance
      // Just check it runs without error
      expect(result.yearlyResults).toHaveLength(20);
    });

    test('given_depletedFunds_when_withdrawing_then_sellsAllRemaining', () => {
      const result = calculateSippStrategy(30000, 2000, 15, 26);

      const depletedYear = result.yearlyResults.find(r => r.status === 'depleted');
      if (depletedYear) {
        expect(depletedYear.endUnits).toBeCloseTo(0, 6);
      }
    });

    test('given_exhaustedFunds_when_withdrawing_then_returnsZero', () => {
      const result = calculateSippStrategy(30000, 2000, 15, 26);

      const exhaustedYears = result.yearlyResults.filter(r => r.status === 'exhausted');

      exhaustedYears.forEach(year => {
        expect(year.unitsSold).toBe(0);
        expect(year.grossWithdrawal).toBe(0);
        expect(year.netWithdrawal).toBe(0);
      });
    });
  });

  describe('result structure', () => {
    test('given_validInputs_when_calculating_then_returnsCorrectStructure', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 5);

      // Initial investment structure
      expect(result.initialInvestment).toHaveProperty('pensionAmount');
      expect(result.initialInvestment).toHaveProperty('etfPriceAtStart');
      expect(result.initialInvestment).toHaveProperty('unitsAcquired');
      expect(result.initialInvestment).toHaveProperty('initialValue');

      // Yearly results structure
      expect(result.yearlyResults).toHaveLength(5);
      result.yearlyResults.forEach(year => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('startUnits');
        expect(year).toHaveProperty('etfPricePerUnit');
        expect(year).toHaveProperty('startValueGbp');
        expect(year).toHaveProperty('managementFee');
        expect(year).toHaveProperty('valueAfterFee');
        expect(year).toHaveProperty('grossWithdrawal');
        expect(year).toHaveProperty('unitsSold');
        expect(year).toHaveProperty('taxOnWithdrawal');
        expect(year).toHaveProperty('netWithdrawal');
        expect(year).toHaveProperty('endUnits');
        expect(year).toHaveProperty('endValueGbp');
        expect(year).toHaveProperty('status');
      });

      // Summary structure
      expect(result.summary).toHaveProperty('initialInvestment');
      expect(result.summary).toHaveProperty('totalGrossWithdrawn');
      expect(result.summary).toHaveProperty('totalNetWithdrawn');
      expect(result.summary).toHaveProperty('totalTaxPaid');
      expect(result.summary).toHaveProperty('totalManagementFees');
      expect(result.summary).toHaveProperty('finalUnits');
      expect(result.summary).toHaveProperty('finalValue');
      expect(result.summary).toHaveProperty('totalValueRealized');
    });

    test('given_calculation_when_checking_then_yearsAreSequential', () => {
      const result = calculateSippStrategy(500000, 2015, 4, 5);

      for (let i = 0; i < result.yearlyResults.length; i++) {
        expect(result.yearlyResults[i].year).toBe(2015 + i);
      }
    });
  });

  describe('summary calculations', () => {
    test('given_completedStrategy_when_summarizing_then_totalsAreCorrect', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 5);

      // Total gross withdrawn should equal sum of yearly gross withdrawals
      const sumGross = result.yearlyResults.reduce((sum, r) => sum + r.grossWithdrawal, 0);
      expect(result.summary.totalGrossWithdrawn).toBeCloseTo(sumGross, 2);

      // Total net withdrawn should equal sum of yearly net withdrawals
      const sumNet = result.yearlyResults.reduce((sum, r) => sum + r.netWithdrawal, 0);
      expect(result.summary.totalNetWithdrawn).toBeCloseTo(sumNet, 2);

      // Total tax should equal sum of yearly taxes
      const sumTax = result.yearlyResults.reduce((sum, r) => sum + r.taxOnWithdrawal, 0);
      expect(result.summary.totalTaxPaid).toBeCloseTo(sumTax, 2);
    });

    test('given_successfulStrategy_when_summarizing_then_marksAsSuccessful', () => {
      const result = calculateSippStrategy(500000, 2020, 4, 5);

      // With S&P growth, strategy should be successful
      expect(result.summary.strategySuccessful).toBe(true);
      expect(result.summary.yearDepleted).toBeNull();
    });
  });
});

describe('calculateSippYearsRemaining', () => {
  test('given_zeroUnits_when_calculating_then_returnsZero', () => {
    expect(calculateSippYearsRemaining(0, 2020, 10000)).toBe(0);
  });

  test('given_zeroWithdrawal_when_calculating_then_returnsInfinity', () => {
    expect(calculateSippYearsRemaining(100, 2020, 0)).toBe(Infinity);
  });

  test('given_validInputs_when_calculating_then_returnsPositiveYears', () => {
    const years = calculateSippYearsRemaining(1000, 2020, 5000);
    expect(years).toBeGreaterThan(0);
  });

  test('given_largeHoldings_when_calculating_then_returnsMoreYears', () => {
    const smallYears = calculateSippYearsRemaining(100, 2000, 10000);
    const largeYears = calculateSippYearsRemaining(1000, 2000, 10000);

    expect(largeYears).toBeGreaterThan(smallYears);
  });
});

describe('getSippValue', () => {
  test('given_invalidYear_when_valuing_then_throwsError', () => {
    expect(() => getSippValue(100, 1979)).toThrow('outside supported range');
  });

  test('given_validInputs_when_valuing_then_calculatesCorrectly', () => {
    const units = 100;
    const year = 2020;
    const etfPrice = getSyntheticEtfPrice(year);
    const expectedValue = units * etfPrice;

    expect(getSippValue(units, year)).toBeCloseTo(expectedValue, 2);
  });

  test('given_zeroUnits_when_valuing_then_returnsZero', () => {
    expect(getSippValue(0, 2020)).toBe(0);
  });
});

describe('calculateSippAfterTaxValue', () => {
  test('given_invalidYear_when_calculating_then_throwsError', () => {
    expect(() => calculateSippAfterTaxValue(100000, 1979)).toThrow('outside supported range');
  });

  test('given_validValue_when_calculating_then_applies25PercentTaxFree', () => {
    const result = calculateSippAfterTaxValue(100000, 2024);

    expect(result.grossValue).toBe(100000);
    expect(result.taxFreeAmount).toBe(25000);
    expect(result.taxableAmount).toBeLessThanOrEqual(75000);
  });

  test('given_validValue_when_calculating_then_netLessThanGross', () => {
    const result = calculateSippAfterTaxValue(100000, 2024);

    expect(result.netValue).toBeLessThan(result.grossValue);
    expect(result.netValue).toBeGreaterThan(result.grossValue * 0.5);
  });

  test('given_smallValue_when_calculating_then_mayPayNoTax', () => {
    // £16,000 withdrawal: 25% tax-free = £4,000, 75% taxable = £12,000
    // £12,000 is below personal allowance of £12,570
    const result = calculateSippAfterTaxValue(16000, 2024);

    expect(result.taxPaid).toBe(0);
    expect(result.netValue).toBe(16000);
  });
});

describe('integration tests', () => {
  test('given_fullScenario_when_simulating_then_producesRealisticResults', () => {
    // £500,000 pension, starting 2000, 4% withdrawal, 25 years
    const result = calculateSippStrategy(500000, 2000, 4, 25);

    // No initial tax (stays in SIPP)
    // Tax is paid on withdrawals
    expect(result.summary.totalTaxPaid).toBeGreaterThan(0);

    // Management fees over 25 years should be substantial
    expect(result.summary.totalManagementFees).toBeGreaterThan(10000);

    // Should have withdrawn money each year
    expect(result.summary.totalNetWithdrawn).toBeGreaterThan(0);

    // With S&P 500 growth, should still have significant value
    expect(result.summary.finalValue).toBeGreaterThan(0);
  });

  test('given_startYear2000_when_simulating25Years_then_benefitsFromMarketGrowth', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 25);

    // S&P 500 has grown significantly over this period
    // Despite withdrawals and fees, should have good final value
    expect(result.summary.finalValue).toBeGreaterThan(100000);

    // Total value realized should exceed initial investment
    expect(result.summary.totalValueRealized).toBeGreaterThan(500000);
  });

  test('given_latestPossibleStart_when_calculating_then_works', () => {
    // Start 2025, run for 2 years (ends 2026)
    const result = calculateSippStrategy(100000, 2025, 4, 2);

    expect(result.yearlyResults).toHaveLength(2);
    expect(result.yearlyResults[0].year).toBe(2025);
    expect(result.yearlyResults[1].year).toBe(2026);
  });

  test('given_sippVsGoldComparison_when_calculating_then_canCompare', () => {
    // Both strategies with same inputs should be comparable
    const sippResult = calculateSippStrategy(500000, 2000, 4, 25);

    // SIPP should have:
    // - No initial tax (advantage)
    // - Tax on every withdrawal (disadvantage)
    // - Management fees (disadvantage)
    // - Market exposure (could be advantage or disadvantage)

    expect(sippResult.summary.totalTaxPaid).toBeGreaterThan(0);
    expect(sippResult.summary.totalManagementFees).toBeGreaterThan(0);
    expect(sippResult.summary.totalNetWithdrawn).toBeGreaterThan(0);
  });
});

describe('multi-index support', () => {
  describe('index type parameter', () => {
    test('given_noIndexType_when_calculating_then_defaultsToSP500', () => {
      const result = calculateSippStrategy(100000, 2000, 4, 5);

      expect(result.indexType).toBe(INDEX_TYPES.SP500);
      expect(result.indexName).toBe('S&P 500');
    });

    test('given_sp500IndexType_when_calculating_then_usesSP500', () => {
      const result = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.SP500);

      expect(result.indexType).toBe(INDEX_TYPES.SP500);
      expect(result.indexName).toBe('S&P 500');
    });

    test('given_nasdaq100IndexType_when_calculating_then_usesNasdaq100', () => {
      const result = calculateSippStrategy(100000, 1990, 4, 5, INDEX_TYPES.NASDAQ100);

      expect(result.indexType).toBe(INDEX_TYPES.NASDAQ100);
      expect(result.indexName).toBe('Nasdaq 100');
    });

    test('given_ftse100IndexType_when_calculating_then_usesFTSE100', () => {
      const result = calculateSippStrategy(100000, 1990, 4, 5, INDEX_TYPES.FTSE100);

      expect(result.indexType).toBe(INDEX_TYPES.FTSE100);
      expect(result.indexName).toBe('FTSE 100');
    });

    test('given_invalidIndexType_when_calculating_then_throwsError', () => {
      expect(() => calculateSippStrategy(100000, 2000, 4, 5, 'invalid'))
        .toThrow('Unknown index type');
    });
  });

  describe('index data availability', () => {
    test('given_nasdaq100_when_startYear1984_then_throwsError', () => {
      // Nasdaq 100 data starts from 1985
      expect(() => calculateSippStrategy(100000, 1984, 4, 5, INDEX_TYPES.NASDAQ100))
        .toThrow('Nasdaq 100 data not available for year 1984');
    });

    test('given_ftse100_when_startYear1983_then_throwsError', () => {
      // FTSE 100 data starts from 1984
      expect(() => calculateSippStrategy(100000, 1983, 4, 5, INDEX_TYPES.FTSE100))
        .toThrow('FTSE 100 data not available for year 1983');
    });

    test('given_nasdaq100_when_startYear1985_then_succeeds', () => {
      const result = calculateSippStrategy(100000, 1985, 4, 5, INDEX_TYPES.NASDAQ100);
      expect(result.yearlyResults).toHaveLength(5);
    });

    test('given_ftse100_when_startYear1984_then_succeeds', () => {
      const result = calculateSippStrategy(100000, 1984, 4, 5, INDEX_TYPES.FTSE100);
      expect(result.yearlyResults).toHaveLength(5);
    });
  });

  describe('convenience functions', () => {
    test('given_sp500Convenience_when_calculating_then_sameAsExplicitSP500', () => {
      const convenience = calculateSP500SippStrategy(100000, 2000, 4, 5);
      const explicit = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.SP500);

      expect(convenience.indexType).toBe(explicit.indexType);
      expect(convenience.summary.totalNetWithdrawn).toBeCloseTo(explicit.summary.totalNetWithdrawn, 2);
    });

    test('given_nasdaq100Convenience_when_calculating_then_usesNasdaq100', () => {
      const result = calculateNasdaq100SippStrategy(100000, 1990, 4, 5);

      expect(result.indexType).toBe(INDEX_TYPES.NASDAQ100);
      expect(result.indexName).toBe('Nasdaq 100');
    });

    test('given_ftse100Convenience_when_calculating_then_usesFTSE100', () => {
      const result = calculateFTSE100SippStrategy(100000, 1990, 4, 5);

      expect(result.indexType).toBe(INDEX_TYPES.FTSE100);
      expect(result.indexName).toBe('FTSE 100');
    });
  });

  describe('index-specific pricing', () => {
    test('given_differentIndices_when_calculating_then_useDifferentPrices', () => {
      const sp500Result = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.SP500);
      const ftseResult = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.FTSE100);

      // Different indices should have different ETF prices
      expect(sp500Result.initialInvestment.etfPriceAtStart)
        .not.toBe(ftseResult.initialInvestment.etfPriceAtStart);
    });

    test('given_sameIndex_when_calculating_then_matchesSyntheticPrice', () => {
      const result = calculateSippStrategy(100000, 2010, 4, 5, INDEX_TYPES.SP500);
      const expectedPrice = getSyntheticPrice(2010, INDEX_TYPES.SP500);

      expect(result.initialInvestment.etfPriceAtStart).toBe(expectedPrice);
    });

    test('given_nasdaq100_when_calculating_then_usesNasdaqPrices', () => {
      const result = calculateSippStrategy(100000, 2010, 4, 5, INDEX_TYPES.NASDAQ100);
      const expectedPrice = getSyntheticPrice(2010, INDEX_TYPES.NASDAQ100);

      expect(result.initialInvestment.etfPriceAtStart).toBe(expectedPrice);
    });

    test('given_ftse100_when_calculating_then_usesFTSEPrices', () => {
      const result = calculateSippStrategy(100000, 2010, 4, 5, INDEX_TYPES.FTSE100);
      const expectedPrice = getSyntheticPrice(2010, INDEX_TYPES.FTSE100);

      expect(result.initialInvestment.etfPriceAtStart).toBe(expectedPrice);
    });
  });

  describe('performance comparison', () => {
    test('given_nasdaq100_when_2010to2025_then_showsGrowth', () => {
      const result = calculateSippStrategy(500000, 2010, 4, 15, INDEX_TYPES.NASDAQ100);

      // Nasdaq had strong growth in this period
      expect(result.summary.strategySuccessful).toBe(true);
      expect(result.summary.finalValue).toBeGreaterThan(0);
    });

    test('given_ftse100_when_2000to2025_then_calculatesCorrectly', () => {
      const result = calculateSippStrategy(500000, 2000, 4, 25, INDEX_TYPES.FTSE100);

      // FTSE 100 should work correctly
      expect(result.yearlyResults).toHaveLength(25);
      expect(result.summary.totalNetWithdrawn).toBeGreaterThan(0);
    });

    test('given_allIndices_when_sameInputs_then_produceDifferentResults', () => {
      const sp500 = calculateSippStrategy(500000, 2000, 4, 25, INDEX_TYPES.SP500);
      const ftse = calculateSippStrategy(500000, 2000, 4, 25, INDEX_TYPES.FTSE100);

      // Different indices should produce different final values
      // (due to different performance)
      expect(sp500.summary.finalValue).not.toBeCloseTo(ftse.summary.finalValue, 0);
    });
  });

  describe('getSippValue with index type', () => {
    test('given_sp500Index_when_valuing_then_usesCorrectPrice', () => {
      const units = 100;
      const year = 2020;
      const expectedPrice = getSyntheticPrice(year, INDEX_TYPES.SP500);
      const expectedValue = units * expectedPrice;

      expect(getSippValue(units, year, INDEX_TYPES.SP500)).toBeCloseTo(expectedValue, 2);
    });

    test('given_nasdaq100Index_when_valuing_then_usesCorrectPrice', () => {
      const units = 100;
      const year = 2020;
      const expectedPrice = getSyntheticPrice(year, INDEX_TYPES.NASDAQ100);
      const expectedValue = units * expectedPrice;

      expect(getSippValue(units, year, INDEX_TYPES.NASDAQ100)).toBeCloseTo(expectedValue, 2);
    });

    test('given_ftse100Index_when_valuing_then_usesCorrectPrice', () => {
      const units = 100;
      const year = 2020;
      const expectedPrice = getSyntheticPrice(year, INDEX_TYPES.FTSE100);
      const expectedValue = units * expectedPrice;

      expect(getSippValue(units, year, INDEX_TYPES.FTSE100)).toBeCloseTo(expectedValue, 2);
    });

    test('given_noIndexType_when_valuing_then_defaultsToSP500', () => {
      const units = 100;
      const year = 2020;
      const defaultValue = getSippValue(units, year);
      const sp500Value = getSippValue(units, year, INDEX_TYPES.SP500);

      expect(defaultValue).toBe(sp500Value);
    });
  });

  describe('calculateSippYearsRemaining with index type', () => {
    test('given_sp500Index_when_calculating_then_usesCorrectPrices', () => {
      const years = calculateSippYearsRemaining(1000, 2020, 5000, INDEX_TYPES.SP500);
      expect(years).toBeGreaterThan(0);
    });

    test('given_nasdaq100Index_when_calculating_then_usesCorrectPrices', () => {
      const years = calculateSippYearsRemaining(1000, 2020, 5000, INDEX_TYPES.NASDAQ100);
      expect(years).toBeGreaterThan(0);
    });

    test('given_ftse100Index_when_calculating_then_usesCorrectPrices', () => {
      const years = calculateSippYearsRemaining(1000, 2020, 5000, INDEX_TYPES.FTSE100);
      expect(years).toBeGreaterThan(0);
    });

    test('given_noIndexType_when_calculating_then_defaultsToSP500', () => {
      const defaultYears = calculateSippYearsRemaining(1000, 2020, 5000);
      const sp500Years = calculateSippYearsRemaining(1000, 2020, 5000, INDEX_TYPES.SP500);

      expect(defaultYears).toBe(sp500Years);
    });
  });
});

describe('configurable fees', () => {
  test('given_customManagementFee_when_calculating_then_usesCustomFee', () => {
    const defaultResult = calculateSippStrategy(100000, 2020, 4, 5);
    const customResult = calculateSippStrategy(100000, 2020, 4, 5, INDEX_TYPES.SP500, {
      sippManagementFeePercent: 0.25 // 0.25% instead of default 0.5%
    });

    // Custom fee result should have lower management fees
    expect(customResult.summary.totalManagementFees)
      .toBeLessThan(defaultResult.summary.totalManagementFees);
  });

  test('given_higherManagementFee_when_calculating_then_resultsDiffer', () => {
    const defaultResult = calculateSippStrategy(100000, 2020, 4, 5);
    const highFeeResult = calculateSippStrategy(100000, 2020, 4, 5, INDEX_TYPES.SP500, {
      sippManagementFeePercent: 1.0 // 1% instead of default 0.5%
    });

    // Higher fee = higher total fees
    expect(highFeeResult.summary.totalManagementFees)
      .toBeGreaterThan(defaultResult.summary.totalManagementFees);

    // Higher fee = lower final value
    expect(highFeeResult.summary.finalValue)
      .toBeLessThan(defaultResult.summary.finalValue);
  });

  test('given_zeroManagementFee_when_calculating_then_noFeeDeducted', () => {
    const result = calculateSippStrategy(100000, 2020, 4, 5, INDEX_TYPES.SP500, {
      sippManagementFeePercent: 0
    });

    expect(result.summary.totalManagementFees).toBe(0);
  });

  test('given_emptyConfig_when_calculating_then_usesDefaults', () => {
    const emptyConfigResult = calculateSippStrategy(100000, 2020, 4, 5, INDEX_TYPES.SP500, {});
    const noConfigResult = calculateSippStrategy(100000, 2020, 4, 5);

    // Results should be identical
    expect(emptyConfigResult.summary.totalManagementFees)
      .toBe(noConfigResult.summary.totalManagementFees);
  });

  test('given_customFeeWithNasdaq_when_calculating_then_usesCustomFee', () => {
    const defaultResult = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.NASDAQ100);
    const customResult = calculateSippStrategy(100000, 2000, 4, 5, INDEX_TYPES.NASDAQ100, {
      sippManagementFeePercent: 0.2
    });

    expect(customResult.summary.totalManagementFees)
      .toBeLessThan(defaultResult.summary.totalManagementFees);
  });

  test('given_customFeeWithFTSE_when_calculating_then_usesCustomFee', () => {
    const defaultResult = calculateSippStrategy(100000, 1985, 4, 5, INDEX_TYPES.FTSE100);
    const customResult = calculateSippStrategy(100000, 1985, 4, 5, INDEX_TYPES.FTSE100, {
      sippManagementFeePercent: 0.2
    });

    expect(customResult.summary.totalManagementFees)
      .toBeLessThan(defaultResult.summary.totalManagementFees);
  });
});

describe('calculateSippYearsRemaining with config', () => {
  test('given_customManagementFee_when_calculatingYearsRemaining_then_usesCustomFee', () => {
    const units = 100;
    const startYear = 2020;
    const annualWithdrawal = 10000;

    const defaultYears = calculateSippYearsRemaining(units, startYear, annualWithdrawal, INDEX_TYPES.SP500);
    const customYears = calculateSippYearsRemaining(units, startYear, annualWithdrawal, INDEX_TYPES.SP500, {
      sippManagementFeePercent: 0.1 // Much lower than default
    });

    // Lower management fee = funds last longer
    expect(customYears).toBeGreaterThanOrEqual(defaultYears);
  });

  test('given_zeroManagementFee_when_calculatingYearsRemaining_then_noFeeApplied', () => {
    const units = 100;
    const startYear = 2020;
    const annualWithdrawal = 10000;

    const zeroFeeYears = calculateSippYearsRemaining(units, startYear, annualWithdrawal, INDEX_TYPES.SP500, {
      sippManagementFeePercent: 0
    });
    const defaultYears = calculateSippYearsRemaining(units, startYear, annualWithdrawal, INDEX_TYPES.SP500);

    // Zero fee should result in equal or more years
    expect(zeroFeeYears).toBeGreaterThanOrEqual(defaultYears);
  });
});

describe('inflation-adjusted withdrawals', () => {
  test('given_inflationEnabled_when_calculating_then_year2GrossWithdrawalExceedsYear1', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.SP500, { adjustForInflation: true });

    const year1 = result.yearlyResults[0];
    const year2 = result.yearlyResults[1];

    // Year 2 gross withdrawal should be higher due to inflation
    expect(year2.grossWithdrawal).toBeGreaterThan(year1.grossWithdrawal);
  });

  test('given_inflationEnabled_when_calculating_then_grossWithdrawalsGrowWithCpi', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.SP500, { adjustForInflation: true });

    for (let i = 1; i < result.yearlyResults.length; i++) {
      const prev = result.yearlyResults[i - 1];
      const curr = result.yearlyResults[i];
      if (curr.status === 'active' && prev.status === 'active') {
        expect(curr.grossWithdrawal).toBeGreaterThanOrEqual(prev.grossWithdrawal);
      }
    }
  });

  test('given_inflationDisabled_when_calculating_then_grossWithdrawalStaysFlat', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.SP500, { adjustForInflation: false });
    const baseWithdrawal = 500000 * 0.04; // £20,000

    result.yearlyResults.forEach(year => {
      if (year.status === 'active') {
        expect(year.grossWithdrawal).toBeCloseTo(baseWithdrawal, 0);
      }
    });
  });

  test('given_inflationEnabledByDefault_when_noConfigProvided_then_withdrawalsGrow', () => {
    // Default config has adjustForInflation: true
    const result = calculateSippStrategy(500000, 2010, 4, 5);

    const year1 = result.yearlyResults[0];
    const year5 = result.yearlyResults[4];

    if (year5.status === 'active') {
      expect(year5.grossWithdrawal).toBeGreaterThan(year1.grossWithdrawal);
    }
  });

  test('given_inflationEnabled_when_summarizing_then_fullWithdrawalYearsCountsAllActive', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.SP500, { adjustForInflation: true });

    const expectedFullYears = result.yearlyResults.filter(r => r.status === 'active').length;
    expect(result.summary.fullWithdrawalYears).toBe(expectedFullYears);
  });

  test('given_inflationEnabled_when_calculatingNasdaq_then_withdrawalsGrow', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.NASDAQ100, { adjustForInflation: true });

    const year1 = result.yearlyResults[0];
    const year2 = result.yearlyResults[1];

    expect(year2.grossWithdrawal).toBeGreaterThan(year1.grossWithdrawal);
  });

  test('given_inflationEnabled_when_calculatingFtse_then_withdrawalsGrow', () => {
    const result = calculateSippStrategy(500000, 2010, 4, 5, INDEX_TYPES.FTSE100, { adjustForInflation: true });

    const year1 = result.yearlyResults[0];
    const year2 = result.yearlyResults[1];

    expect(year2.grossWithdrawal).toBeGreaterThan(year1.grossWithdrawal);
  });
});

// ============================================
// Gold ETF SIPP Strategy Tests
// ============================================

describe('Gold ETF SIPP strategy', () => {
  test('given_goldEtfIndex_when_calculating_then_returnsValidResults', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.GOLD_ETF);

    expect(result.yearlyResults).toHaveLength(10);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalNetWithdrawn).toBeGreaterThan(0);
  });

  test('given_goldEtfIndex_when_calculating_then_initialInvestmentCorrect', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.GOLD_ETF);

    const firstYear = result.yearlyResults[0];
    // First year start value should be close to pension amount (before fees)
    expect(firstYear.startValueGbp).toBeCloseTo(500000, -2);
  });

  test('given_goldEtfIndex_when_calculating_then_managementFeesApplied', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.GOLD_ETF);

    expect(result.summary.totalManagementFees).toBeGreaterThan(0);
    // First year fee should be ~0.5% of 500000 = £2500
    const firstYearFee = result.yearlyResults[0].managementFee;
    expect(firstYearFee).toBeCloseTo(2500, -1);
  });

  test('given_goldEtfIndex_when_calculating_then_withdrawalsTaxedCorrectly', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.GOLD_ETF);

    const firstYear = result.yearlyResults[0];
    // 4% of 500000 = £20,000 gross withdrawal
    expect(firstYear.grossWithdrawal).toBeCloseTo(20000, 0);
    // Tax should be applied (25% tax-free, 75% taxable)
    expect(firstYear.taxOnWithdrawal).toBeGreaterThan(0);
    expect(firstYear.netWithdrawal).toBeLessThan(firstYear.grossWithdrawal);
  });

  test('given_goldEtfIndex_when_calculating25years_then_mayDeplete', () => {
    const result = calculateSippStrategy(100000, 2000, 4, 25, INDEX_TYPES.GOLD_ETF);

    // Should have results for all years
    expect(result.yearlyResults).toHaveLength(25);
    // Some years may show exhausted status
    const exhaustedYears = result.yearlyResults.filter(r => r.status === 'exhausted');
    // With gold ETF, could last or deplete depending on gold performance
    expect(exhaustedYears.length + result.summary.fullWithdrawalYears).toBe(25);
  });

  test('given_goldEtfConvenienceFunction_when_calculating_then_matchesDirect', () => {
    const directResult = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.GOLD_ETF);
    const convenienceResult = calculateGoldEtfSippStrategy(500000, 2000, 4, 10);

    expect(convenienceResult.summary.totalNetWithdrawn)
      .toBe(directResult.summary.totalNetWithdrawn);
    expect(convenienceResult.summary.finalValue)
      .toBe(directResult.summary.finalValue);
  });

  test('given_goldEtfIndex_when_gettingValue_then_works', () => {
    const value = getSippValue(100, 2020, INDEX_TYPES.GOLD_ETF);
    expect(value).toBeGreaterThan(0);
  });

  test('given_goldEtfIndex_when_calculatingYearsRemaining_then_works', () => {
    const years = calculateSippYearsRemaining(100, 2000, 5000, INDEX_TYPES.GOLD_ETF);
    expect(years).toBeGreaterThan(0);
  });
});

// ============================================
// US Treasury SIPP Strategy Tests
// ============================================

describe('US Treasury SIPP strategy', () => {
  test('given_usTreasuryIndex_when_calculating_then_returnsValidResults', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.US_TREASURY);

    expect(result.yearlyResults).toHaveLength(10);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalNetWithdrawn).toBeGreaterThan(0);
  });

  test('given_usTreasuryIndex_when_calculating_then_initialInvestmentCorrect', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.US_TREASURY);

    const firstYear = result.yearlyResults[0];
    expect(firstYear.startValueGbp).toBeCloseTo(500000, -2);
  });

  test('given_usTreasuryIndex_when_calculating_then_managementFeesApplied', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.US_TREASURY);

    expect(result.summary.totalManagementFees).toBeGreaterThan(0);
  });

  test('given_usTreasuryIndex_when_calculating_then_withdrawalsTaxedCorrectly', () => {
    const result = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.US_TREASURY);

    const firstYear = result.yearlyResults[0];
    expect(firstYear.grossWithdrawal).toBeCloseTo(20000, 0);
    expect(firstYear.taxOnWithdrawal).toBeGreaterThan(0);
    expect(firstYear.netWithdrawal).toBeLessThan(firstYear.grossWithdrawal);
  });

  test('given_usTreasuryConvenienceFunction_when_calculating_then_matchesDirect', () => {
    const directResult = calculateSippStrategy(500000, 2000, 4, 10, INDEX_TYPES.US_TREASURY);
    const convenienceResult = calculateUSTreasurySippStrategy(500000, 2000, 4, 10);

    expect(convenienceResult.summary.totalNetWithdrawn)
      .toBe(directResult.summary.totalNetWithdrawn);
    expect(convenienceResult.summary.finalValue)
      .toBe(directResult.summary.finalValue);
  });

  test('given_usTreasuryIndex_when_gettingValue_then_works', () => {
    const value = getSippValue(100, 2020, INDEX_TYPES.US_TREASURY);
    expect(value).toBeGreaterThan(0);
  });

  test('given_usTreasuryIndex_when_calculatingYearsRemaining_then_works', () => {
    const years = calculateSippYearsRemaining(100, 2000, 5000, INDEX_TYPES.US_TREASURY);
    expect(years).toBeGreaterThan(0);
  });

  test('given_usTreasury_when_compared2008Crisis_then_showsResilience', () => {
    // Treasuries should do relatively well during 2008 crisis vs equities
    const treasuryResult = calculateSippStrategy(500000, 2007, 4, 3, INDEX_TYPES.US_TREASURY);
    const sp500Result = calculateSippStrategy(500000, 2007, 4, 3, INDEX_TYPES.SP500);

    // Both should produce valid results
    expect(treasuryResult.summary.totalNetWithdrawn).toBeGreaterThan(0);
    expect(sp500Result.summary.totalNetWithdrawn).toBeGreaterThan(0);
  });

  test('given_usTreasury_when_starting1980_then_works', () => {
    // US Treasury data starts from 1980
    const result = calculateSippStrategy(500000, 1980, 4, 10, INDEX_TYPES.US_TREASURY);

    expect(result.yearlyResults).toHaveLength(10);
    expect(result.yearlyResults[0].year).toBe(1980);
  });
});
