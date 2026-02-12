/**
 * Gold Strategy Calculator Tests
 *
 * Tests for simulating pension withdrawal into physical gold.
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
  calculateGoldStrategy,
  calculateGoldYearsRemaining,
  getGoldValue
} from '../../src/calculators/goldStrategy.js';
import { getGoldPrice } from '../../src/data/goldPrices.js';
import { COSTS } from '../../src/config/defaults.js';

describe('calculateGoldStrategy', () => {
  describe('input validation', () => {
    test('given_negativePensionAmount_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(-100000, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_zeroPensionAmount_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(0, 2000, 4, 10))
        .toThrow('Pension amount must be a positive number');
    });

    test('given_invalidStartYear_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(100000, 1979, 4, 10))
        .toThrow('Start year 1979 is outside supported range');
    });

    test('given_invalidWithdrawalRate_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(100000, 2000, 0, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
      expect(() => calculateGoldStrategy(100000, 2000, -5, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
      expect(() => calculateGoldStrategy(100000, 2000, 101, 10))
        .toThrow('Withdrawal rate must be between 0 and 100');
    });

    test('given_invalidYears_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(100000, 2000, 4, 0))
        .toThrow('Years must be a positive integer');
      expect(() => calculateGoldStrategy(100000, 2000, 4, -5))
        .toThrow('Years must be a positive integer');
      expect(() => calculateGoldStrategy(100000, 2000, 4, 2.5))
        .toThrow('Years must be a positive integer');
    });

    test('given_yearsExtendBeyondData_when_calculating_then_throwsError', () => {
      expect(() => calculateGoldStrategy(100000, 2020, 4, 10))
        .toThrow('Not enough data');
    });
  });

  describe('initial withdrawal', () => {
    test('given_pension500k_when_calculating_then_paysTaxOnWithdrawal', () => {
      const result = calculateGoldStrategy(500000, 2000, 4, 10);

      expect(result.initialWithdrawal.grossPension).toBe(500000);
      expect(result.initialWithdrawal.taxCalculation.taxPaid).toBeGreaterThan(0);
      expect(result.initialWithdrawal.netAfterTax).toBeLessThan(500000);
    });

    test('given_pensionWithdrawal_when_calculating_then_applies25PercentTaxFree', () => {
      const result = calculateGoldStrategy(100000, 2020, 4, 5);

      // 25% should be tax-free
      expect(result.initialWithdrawal.taxCalculation.taxFreeAmount).toBe(25000);
    });

    test('given_netProceeds_when_buyingGold_then_applies3PercentCost', () => {
      const result = calculateGoldStrategy(100000, 2020, 4, 5);

      const netAfterTax = result.initialWithdrawal.netAfterTax;
      const expectedCost = netAfterTax * (COSTS.goldTransactionPercent / 100);

      expect(result.initialWithdrawal.goldPurchaseCost).toBeCloseTo(expectedCost, 2);
      expect(result.initialWithdrawal.amountInvested)
        .toBeCloseTo(netAfterTax - expectedCost, 2);
    });

    test('given_goldPurchase_when_calculating_then_usesCorrectPrice', () => {
      const result = calculateGoldStrategy(100000, 2020, 4, 5);

      const goldPrice2020 = getGoldPrice(2020);
      expect(result.initialWithdrawal.goldPriceAtPurchase).toBe(goldPrice2020);

      const expectedOunces = result.initialWithdrawal.amountInvested / goldPrice2020;
      expect(result.initialWithdrawal.goldOuncesPurchased).toBeCloseTo(expectedOunces, 4);
    });
  });

  describe('yearly withdrawals', () => {
    test('given_activeStrategy_when_withdrawing_then_sellsGoldWithCost', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      // First year should be active
      expect(result.yearlyResults[0].status).toBe('active');
      expect(result.yearlyResults[0].goldSold).toBeGreaterThan(0);
      expect(result.yearlyResults[0].transactionCost).toBeGreaterThan(0);
    });

    test('given_4PercentWithdrawal_when_calculating_then_withdrawsCorrectAmount', () => {
      const pensionAmount = 500000;
      const withdrawalRate = 4;
      const expectedAnnualWithdrawal = pensionAmount * (withdrawalRate / 100);

      const result = calculateGoldStrategy(pensionAmount, 2010, withdrawalRate, 5);

      // Active years should get (close to) the target withdrawal
      const activeYear = result.yearlyResults[0];
      expect(activeYear.netWithdrawal).toBeCloseTo(expectedAnnualWithdrawal, 0);
    });

    test('given_goldSold_when_calculating_then_reducesHoldings', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      const year1 = result.yearlyResults[0];
      const year2 = result.yearlyResults[1];

      // Gold ounces should decrease
      expect(year2.startGoldOunces).toBeLessThan(year1.startGoldOunces);
      expect(year1.endGoldOunces).toBe(year2.startGoldOunces);
    });

    test('given_risingGoldPrice_when_withdrawing_then_sellsFewerOunces', () => {
      // Gold rose significantly from 2010 to 2011
      const result = calculateGoldStrategy(500000, 2010, 4, 2);

      const year2010 = result.yearlyResults[0];
      const year2011 = result.yearlyResults[1];

      // With higher gold price, need fewer ounces for same withdrawal
      // (assuming gold price increased)
      const price2010 = getGoldPrice(2010);
      const price2011 = getGoldPrice(2011);

      if (price2011 > price2010) {
        expect(year2011.goldSold).toBeLessThan(year2010.goldSold);
      }
    });
  });

  describe('fund depletion', () => {
    test('given_highWithdrawalRate_when_calculating_then_eventuallyDepletes', () => {
      // 10% withdrawal rate on small pot should deplete quickly
      const result = calculateGoldStrategy(50000, 2000, 10, 20);

      // Should have some depleted or exhausted years
      const hasDepletion = result.yearlyResults.some(
        r => r.status === 'depleted' || r.status === 'exhausted'
      );
      expect(hasDepletion).toBe(true);
    });

    test('given_depletedFunds_when_withdrawing_then_sellsAllRemaining', () => {
      const result = calculateGoldStrategy(50000, 2000, 10, 20, { adjustForInflation: false });

      const depletedYear = result.yearlyResults.find(r => r.status === 'depleted');
      if (depletedYear) {
        expect(depletedYear.endGoldOunces).toBe(0);
        // Net withdrawal should be less than target
        expect(depletedYear.netWithdrawal).toBeLessThan(5000); // 10% of 50k
      }
    });

    test('given_exhaustedFunds_when_withdrawing_then_returnsZero', () => {
      const result = calculateGoldStrategy(50000, 2000, 10, 26);

      const exhaustedYears = result.yearlyResults.filter(r => r.status === 'exhausted');

      exhaustedYears.forEach(year => {
        expect(year.goldSold).toBe(0);
        expect(year.netWithdrawal).toBe(0);
        expect(year.startGoldOunces).toBe(0);
      });
    });
  });

  describe('result structure', () => {
    test('given_validInputs_when_calculating_then_returnsCorrectStructure', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      // Initial withdrawal structure
      expect(result.initialWithdrawal).toHaveProperty('grossPension');
      expect(result.initialWithdrawal).toHaveProperty('taxCalculation');
      expect(result.initialWithdrawal).toHaveProperty('netAfterTax');
      expect(result.initialWithdrawal).toHaveProperty('goldPurchaseCost');
      expect(result.initialWithdrawal).toHaveProperty('amountInvested');
      expect(result.initialWithdrawal).toHaveProperty('goldPriceAtPurchase');
      expect(result.initialWithdrawal).toHaveProperty('goldOuncesPurchased');

      // Yearly results structure
      expect(result.yearlyResults).toHaveLength(5);
      result.yearlyResults.forEach(year => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('startGoldOunces');
        expect(year).toHaveProperty('goldPricePerOunce');
        expect(year).toHaveProperty('startValueGbp');
        expect(year).toHaveProperty('storageFee');
        expect(year).toHaveProperty('goldSoldForStorage');
        expect(year).toHaveProperty('valueAfterStorageFee');
        expect(year).toHaveProperty('withdrawalGross');
        expect(year).toHaveProperty('goldSold');
        expect(year).toHaveProperty('transactionCost');
        expect(year).toHaveProperty('netWithdrawal');
        expect(year).toHaveProperty('endGoldOunces');
        expect(year).toHaveProperty('endValueGbp');
        expect(year).toHaveProperty('status');
      });

      // Summary structure
      expect(result.summary).toHaveProperty('initialInvestment');
      expect(result.summary).toHaveProperty('taxPaidOnWithdrawal');
      expect(result.summary).toHaveProperty('netInvestedInGold');
      expect(result.summary).toHaveProperty('totalWithdrawn');
      expect(result.summary).toHaveProperty('totalTransactionCosts');
      expect(result.summary).toHaveProperty('totalStorageFees');
      expect(result.summary).toHaveProperty('finalGoldOunces');
      expect(result.summary).toHaveProperty('finalGoldValue');
      expect(result.summary).toHaveProperty('totalValueRealized');
    });

    test('given_calculation_when_checking_then_yearsAreSequential', () => {
      const result = calculateGoldStrategy(500000, 2015, 4, 5);

      for (let i = 0; i < result.yearlyResults.length; i++) {
        expect(result.yearlyResults[i].year).toBe(2015 + i);
      }
    });
  });

  describe('summary calculations', () => {
    test('given_completedStrategy_when_summarizing_then_totalsAreCorrect', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      // Total withdrawn should equal sum of yearly withdrawals
      const sumWithdrawals = result.yearlyResults.reduce((sum, r) => sum + r.netWithdrawal, 0);
      expect(result.summary.totalWithdrawn).toBeCloseTo(sumWithdrawals, 2);

      // Total transaction costs should include purchase and sales
      const sumSaleCosts = result.yearlyResults.reduce((sum, r) => sum + r.transactionCost, 0);
      const totalCosts = result.initialWithdrawal.goldPurchaseCost + sumSaleCosts;
      expect(result.summary.totalTransactionCosts).toBeCloseTo(totalCosts, 2);

      // Total storage fees should equal sum of yearly storage fees
      const sumStorageFees = result.yearlyResults.reduce((sum, r) => sum + r.storageFee, 0);
      expect(result.summary.totalStorageFees).toBeCloseTo(sumStorageFees, 2);
    });

    test('given_successfulStrategy_when_summarizing_then_marksAsSuccessful', () => {
      const result = calculateGoldStrategy(500000, 2020, 4, 5);

      // With gold surge to 2026, strategy should be successful
      expect(result.summary.strategySuccessful).toBe(true);
      expect(result.summary.yearDepleted).toBeNull();
    });

    test('given_failedStrategy_when_summarizing_then_marksAsFailed', () => {
      const result = calculateGoldStrategy(50000, 2000, 10, 26);

      expect(result.summary.strategySuccessful).toBe(false);
      expect(result.summary.yearDepleted).not.toBeNull();
    });
  });

  describe('storage fees', () => {
    test('given_goldHoldings_when_storageConfigured_then_chargesStorageFee', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5, {
        goldStorageFeePercent: 0.7 // Explicit storage fee for testing
      });

      // Each year should have a storage fee
      result.yearlyResults.forEach(year => {
        if (year.status !== 'exhausted') {
          expect(year.storageFee).toBeGreaterThan(0);
        }
      });
    });

    test('given_storageFee_when_charged_then_matchesConfiguredPercent', () => {
      const storageFeePercent = 0.7;
      const result = calculateGoldStrategy(500000, 2010, 4, 5, {
        goldStorageFeePercent: storageFeePercent
      });
      const firstYear = result.yearlyResults[0];

      // Storage fee should match configured percentage of start value
      const expectedStorageFee = firstYear.startValueGbp * (storageFeePercent / 100);
      expect(firstYear.storageFee).toBeCloseTo(expectedStorageFee, 2);
    });

    test('given_storageFee_when_paying_then_sellsGoldToCover', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5, {
        goldStorageFeePercent: 0.7 // Explicit storage fee for testing
      });
      const firstYear = result.yearlyResults[0];

      // Should have sold gold specifically for storage
      expect(firstYear.goldSoldForStorage).toBeGreaterThan(0);

      // Value after storage fee should be less than start value
      expect(firstYear.valueAfterStorageFee).toBeLessThan(firstYear.startValueGbp);
    });

    test('given_storageFeePaid_when_calculating_then_reducesHoldingsBeforeWithdrawal', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);
      const firstYear = result.yearlyResults[0];

      // Gold sold for storage + gold sold for withdrawal should total to reduction
      const totalGoldSold = firstYear.goldSoldForStorage + firstYear.goldSold;
      const holdingsReduction = firstYear.startGoldOunces - firstYear.endGoldOunces;

      expect(totalGoldSold).toBeCloseTo(holdingsReduction, 6);
    });

    test('given_totalStorageFees_when_summarizing_then_sumsAllYears', () => {
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      const sumStorageFees = result.yearlyResults.reduce((sum, r) => sum + r.storageFee, 0);
      expect(result.summary.totalStorageFees).toBeCloseTo(sumStorageFees, 2);
    });

    test('given_storageFees_when_overMultipleYears_then_compoundsReduction', () => {
      // Storage fees cause compound reduction in holdings
      const result = calculateGoldStrategy(500000, 2010, 4, 5);

      // Each year's start ounces should be less than previous year's end ounces
      // (after deducting storage but before withdrawal)
      for (let i = 1; i < result.yearlyResults.length; i++) {
        const prevYear = result.yearlyResults[i - 1];
        const currYear = result.yearlyResults[i];

        // Current year's start should equal previous year's end
        expect(currYear.startGoldOunces).toBeCloseTo(prevYear.endGoldOunces, 6);
      }
    });

    test('given_highStorageCost_when_combined_then_acceleratesDepletion', () => {
      // With storage fees, depletion should happen faster than theoretical
      // (0.7% storage + 2% transaction each year adds up)
      // Use small pot with high withdrawal rate to ensure depletion
      const result = calculateGoldStrategy(50000, 2000, 8, 26);

      // Should deplete faster due to storage fees eating into principal
      const depletedYear = result.yearlyResults.find(r => r.status === 'depleted');
      expect(depletedYear).toBeDefined();
    });
  });
});

describe('calculateGoldYearsRemaining', () => {
  test('given_zeroOunces_when_calculating_then_returnsZero', () => {
    expect(calculateGoldYearsRemaining(0, 2020, 10000)).toBe(0);
  });

  test('given_zeroWithdrawal_when_calculating_then_returnsInfinity', () => {
    expect(calculateGoldYearsRemaining(100, 2020, 0)).toBe(Infinity);
  });

  test('given_validInputs_when_calculating_then_returnsPositiveYears', () => {
    const years = calculateGoldYearsRemaining(100, 2020, 10000);
    expect(years).toBeGreaterThan(0);
  });

  test('given_largeHoldings_when_calculating_then_returnsMoreYears', () => {
    // Use earlier start year to avoid hitting data limit
    const smallYears = calculateGoldYearsRemaining(10, 2000, 10000);
    const largeYears = calculateGoldYearsRemaining(100, 2000, 10000);

    expect(largeYears).toBeGreaterThan(smallYears);
  });
});

describe('getGoldValue', () => {
  test('given_invalidYear_when_valuing_then_throwsError', () => {
    expect(() => getGoldValue(100, 1979)).toThrow('outside supported range');
  });

  test('given_validInputs_when_valuing_then_calculatesCorrectly', () => {
    const ounces = 100;
    const year = 2020;
    const expectedValue = ounces * getGoldPrice(year);

    expect(getGoldValue(ounces, year)).toBe(expectedValue);
  });

  test('given_zeroOunces_when_valuing_then_returnsZero', () => {
    expect(getGoldValue(0, 2020)).toBe(0);
  });
});

describe('configurable fees', () => {
  test('given_customTransactionFee_when_calculating_then_usesCustomFee', () => {
    const defaultResult = calculateGoldStrategy(100000, 2020, 4, 5);
    const customResult = calculateGoldStrategy(100000, 2020, 4, 5, {
      goldTransactionPercent: 1.0 // 1% instead of default 2%
    });

    // Custom fee result should have lower transaction costs
    expect(customResult.summary.totalTransactionCosts)
      .toBeLessThan(defaultResult.summary.totalTransactionCosts);

    // More gold should be purchased with lower fees
    expect(customResult.initialWithdrawal.goldOuncesPurchased)
      .toBeGreaterThan(defaultResult.initialWithdrawal.goldOuncesPurchased);
  });

  test('given_customStorageFee_when_calculating_then_usesCustomFee', () => {
    const zeroStorageResult = calculateGoldStrategy(100000, 2020, 4, 5);
    const customResult = calculateGoldStrategy(100000, 2020, 4, 5, {
      goldStorageFeePercent: 0.5 // 0.5% storage fee
    });

    // Custom storage fee should result in higher storage costs than default 0%
    expect(customResult.summary.totalStorageFees)
      .toBeGreaterThan(zeroStorageResult.summary.totalStorageFees);
    expect(zeroStorageResult.summary.totalStorageFees).toBe(0);
  });

  test('given_zeroTransactionFee_when_calculating_then_noTransactionCosts', () => {
    const result = calculateGoldStrategy(100000, 2020, 4, 5, {
      goldTransactionPercent: 0
    });

    // No transaction costs
    expect(result.summary.totalTransactionCosts).toBe(0);
  });

  test('given_zeroStorageFee_when_calculating_then_noStorageCosts', () => {
    const result = calculateGoldStrategy(100000, 2020, 4, 5, {
      goldStorageFeePercent: 0
    });

    // No storage fees
    expect(result.summary.totalStorageFees).toBe(0);
  });

  test('given_partialConfig_when_calculating_then_usesDefaultsForMissing', () => {
    const customResult = calculateGoldStrategy(100000, 2020, 4, 5, {
      goldTransactionPercent: 1.0
      // goldStorageFeePercent not specified, should use default (0%)
    });

    // Should have zero storage fees (default rate is 0%)
    expect(customResult.summary.totalStorageFees).toBe(0);
  });

  test('given_emptyConfig_when_calculating_then_usesAllDefaults', () => {
    const emptyConfigResult = calculateGoldStrategy(100000, 2020, 4, 5, {});
    const noConfigResult = calculateGoldStrategy(100000, 2020, 4, 5);

    // Results should be identical
    expect(emptyConfigResult.summary.totalTransactionCosts)
      .toBe(noConfigResult.summary.totalTransactionCosts);
    expect(emptyConfigResult.summary.totalStorageFees)
      .toBe(noConfigResult.summary.totalStorageFees);
  });
});

describe('calculateGoldYearsRemaining with config', () => {
  test('given_customStorageFee_when_calculatingYearsRemaining_then_usesCustomFee', () => {
    const goldOunces = 100;
    const startYear = 2020;
    const annualWithdrawal = 10000;

    const defaultYears = calculateGoldYearsRemaining(goldOunces, startYear, annualWithdrawal);
    const customYears = calculateGoldYearsRemaining(goldOunces, startYear, annualWithdrawal, {
      goldStorageFeePercent: 0.1 // Much lower than default
    });

    // Lower storage fee = gold lasts longer
    expect(customYears).toBeGreaterThanOrEqual(defaultYears);
  });
});

describe('inflation-adjusted withdrawals', () => {
  test('given_inflationEnabled_when_calculating_then_year2WithdrawalExceedsYear1', () => {
    const result = calculateGoldStrategy(500000, 2010, 4, 5, { adjustForInflation: true });

    const year1 = result.yearlyResults[0];
    const year2 = result.yearlyResults[1];

    // Year 1 withdrawal is at base rate, year 2 should be higher due to inflation
    // Year 1 (startYear) multiplier = 1.0, Year 2 should be > 1.0
    expect(year2.withdrawalGross).toBeGreaterThan(year1.withdrawalGross);
  });

  test('given_inflationEnabled_when_calculating_then_withdrawalsGrowWithCpi', () => {
    const result = calculateGoldStrategy(500000, 2010, 4, 5, { adjustForInflation: true });

    // Each subsequent year's withdrawal should be >= previous (CPI always >= 0 in this range)
    for (let i = 1; i < result.yearlyResults.length; i++) {
      const prev = result.yearlyResults[i - 1];
      const curr = result.yearlyResults[i];
      if (curr.status === 'active' && prev.status === 'active') {
        expect(curr.withdrawalGross).toBeGreaterThanOrEqual(prev.withdrawalGross);
      }
    }
  });

  test('given_inflationEnabled_when_calculating_then_depletionHappensSoonerThanFlat', () => {
    // With inflation, withdrawals grow, so funds deplete sooner
    const inflationResult = calculateGoldStrategy(50000, 2000, 8, 26, { adjustForInflation: true });
    const flatResult = calculateGoldStrategy(50000, 2000, 8, 26, { adjustForInflation: false });

    const inflationDepletedYear = inflationResult.yearlyResults.find(r => r.status === 'depleted');
    const flatDepletedYear = flatResult.yearlyResults.find(r => r.status === 'depleted');

    // Both should deplete, but inflation should deplete sooner (or same year)
    if (inflationDepletedYear && flatDepletedYear) {
      expect(inflationDepletedYear.year).toBeLessThanOrEqual(flatDepletedYear.year);
    }
  });

  test('given_inflationDisabled_when_calculating_then_withdrawalStaysFlat', () => {
    const result = calculateGoldStrategy(500000, 2010, 4, 5, { adjustForInflation: false });
    const baseWithdrawal = 500000 * 0.04; // £20,000

    result.yearlyResults.forEach(year => {
      if (year.status === 'active') {
        expect(year.withdrawalGross).toBeCloseTo(baseWithdrawal, 0);
      }
    });
  });

  test('given_inflationEnabledByDefault_when_noConfigProvided_then_withdrawalsGrow', () => {
    // Default config has adjustForInflation: true
    const result = calculateGoldStrategy(500000, 2010, 4, 5);

    const year1 = result.yearlyResults[0];
    const year5 = result.yearlyResults[4];

    // Over 5 years, inflation should increase the withdrawal
    if (year5.status === 'active') {
      expect(year5.withdrawalGross).toBeGreaterThan(year1.withdrawalGross);
    }
  });

  test('given_inflationEnabled_when_summarizing_then_fullWithdrawalYearsCountsAllActive', () => {
    const result = calculateGoldStrategy(500000, 2010, 4, 5, { adjustForInflation: true });

    // With the Phase 2 fix, fullWithdrawalYears just counts 'active' status years
    const expectedFullYears = result.yearlyResults.filter(r => r.status === 'active').length;
    expect(result.summary.fullWithdrawalYears).toBe(expectedFullYears);
  });
});

describe('integration tests', () => {
  test('given_fullScenario_when_simulating_then_producesRealisticResults', () => {
    // £500,000 pension, starting 2000, 4% withdrawal, 25 years
    const result = calculateGoldStrategy(500000, 2000, 4, 25);

    // Should have paid significant tax initially
    expect(result.summary.taxPaidOnWithdrawal).toBeGreaterThan(50000);

    // Should have withdrawn money each year
    expect(result.summary.totalWithdrawn).toBeGreaterThan(0);

    // Transaction costs should be reasonable percentage
    const totalCostPercent = (result.summary.totalTransactionCosts /
      result.summary.initialInvestment) * 100;
    expect(totalCostPercent).toBeLessThan(20);

    // Gold has risen significantly, so should have good end value
    expect(result.summary.finalGoldValue).toBeGreaterThan(0);
  });

  test('given_startYear2000_when_simulating25Years_then_benefitsFromGoldBullRun', () => {
    const result = calculateGoldStrategy(500000, 2000, 4, 25);

    // Gold went from ~£178 in 2000 to ~£2096 in 2025 (about 12x)
    // Despite withdrawals, final value should be substantial
    expect(result.summary.finalGoldValue).toBeGreaterThan(100000);

    // Total realized (withdrawals + remaining) should exceed initial investment
    // because gold performed so well
    expect(result.summary.totalValueRealized).toBeGreaterThan(500000);
  });

  test('given_latestPossibleStart_when_calculating_then_works', () => {
    // Start 2025, run for 2 years (ends 2026)
    const result = calculateGoldStrategy(100000, 2025, 4, 2);

    expect(result.yearlyResults).toHaveLength(2);
    expect(result.yearlyResults[0].year).toBe(2025);
    expect(result.yearlyResults[1].year).toBe(2026);
  });
});
