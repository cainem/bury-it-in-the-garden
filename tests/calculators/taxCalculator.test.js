/**
 * Tax Calculator Tests
 *
 * Tests for UK income tax calculations across different tax years.
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
  calculateIncomeTax,
  calculateEffectiveTaxRate,
  getMarginalTaxRate,
  getTaxBands
} from '../../src/calculators/taxCalculator.js';

describe('calculateIncomeTax', () => {
  describe('input validation', () => {
    test('given_yearOutsideRange_when_calculating_then_throwsError', () => {
      expect(() => calculateIncomeTax(50000, 1979)).toThrow('outside supported range');
      expect(() => calculateIncomeTax(50000, 2027)).toThrow('outside supported range');
    });

    test('given_negativeIncome_when_calculating_then_throwsError', () => {
      expect(() => calculateIncomeTax(-1000, 2024)).toThrow('Gross income must be a non-negative number');
    });

    test('given_nonNumericIncome_when_calculating_then_throwsError', () => {
      expect(() => calculateIncomeTax('50000', 2024)).toThrow('Gross income must be a non-negative number');
      expect(() => calculateIncomeTax(null, 2024)).toThrow('Gross income must be a non-negative number');
    });
  });

  describe('zero and minimal income', () => {
    test('given_zeroIncome_when_calculating_then_returnsZeroTax', () => {
      const result = calculateIncomeTax(0, 2024);

      expect(result.grossIncome).toBe(0);
      expect(result.taxFreeAmount).toBe(0);
      expect(result.taxableAmount).toBe(0);
      expect(result.taxPaid).toBe(0);
      expect(result.netIncome).toBe(0);
    });

    test('given_incomeBelowPersonalAllowance_when_calculating_then_returnsZeroTax', () => {
      // 2024 personal allowance is £12,570
      const result = calculateIncomeTax(10000, 2024);

      expect(result.grossIncome).toBe(10000);
      expect(result.taxableAmount).toBe(0);
      expect(result.taxPaid).toBe(0);
      expect(result.netIncome).toBe(10000);
      expect(result.breakdown.personalAllowance).toBe(10000);
    });

    test('given_incomeExactlyAtPersonalAllowance_when_calculating_then_returnsZeroTax', () => {
      const result = calculateIncomeTax(12570, 2024);

      expect(result.taxableAmount).toBe(0);
      expect(result.taxPaid).toBe(0);
      expect(result.netIncome).toBe(12570);
    });
  });

  describe('basic rate only (2024)', () => {
    test('given_incomeInBasicRateBand_when_calculating_then_appliesBasicRateOnly', () => {
      // £30,000 gross: £12,570 allowance, £17,430 taxable at 20%
      const result = calculateIncomeTax(30000, 2024);

      expect(result.grossIncome).toBe(30000);
      expect(result.taxableAmount).toBe(17430);
      expect(result.breakdown.basicRateAmount).toBe(17430);
      expect(result.breakdown.basicRateTax).toBe(3486);  // 17430 * 0.20
      expect(result.breakdown.higherRateAmount).toBe(0);
      expect(result.breakdown.higherRateTax).toBe(0);
      expect(result.taxPaid).toBe(3486);
      expect(result.netIncome).toBe(26514);
    });

    test('given_incomeAtTopOfBasicRate_when_calculating_then_appliesBasicRateOnly', () => {
      // £50,270 is the top of basic rate band (12570 + 37700)
      const result = calculateIncomeTax(50270, 2024);

      expect(result.taxableAmount).toBe(37700);
      expect(result.breakdown.basicRateAmount).toBe(37700);
      expect(result.breakdown.basicRateTax).toBe(7540);  // 37700 * 0.20
      expect(result.breakdown.higherRateAmount).toBe(0);
      expect(result.taxPaid).toBe(7540);
    });
  });

  describe('higher rate (2024)', () => {
    test('given_incomeInHigherRateBand_when_calculating_then_appliesHigherRate', () => {
      // £60,000 gross
      // £12,570 allowance
      // £37,700 at basic rate (20%) = £7,540
      // £9,730 at higher rate (40%) = £3,892
      const result = calculateIncomeTax(60000, 2024);

      expect(result.taxableAmount).toBe(47430);
      expect(result.breakdown.basicRateAmount).toBe(37700);
      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateAmount).toBe(9730);
      expect(result.breakdown.higherRateTax).toBe(3892);
      expect(result.taxPaid).toBe(11432);
      expect(result.netIncome).toBe(48568);
    });

    test('given_incomeAt100000_when_calculating_then_appliesCorrectTax', () => {
      // £100,000 gross
      // £12,570 allowance
      // £37,700 at basic rate (20%) = £7,540
      // £49,730 at higher rate (40%) = £19,892
      const result = calculateIncomeTax(100000, 2024);

      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(19892);
      expect(result.breakdown.additionalRateTax).toBe(0);
      expect(result.taxPaid).toBe(27432);
      expect(result.netIncome).toBe(72568);
    });
  });

  describe('additional rate (2024)', () => {
    test('given_incomeAboveAdditionalThreshold_when_calculating_then_appliesAdditionalRate', () => {
      // £150,000 gross (2024 threshold is £125,140)
      // Personal allowance: £0 (fully tapered - income £50,000 over £100,000 threshold)
      // £37,700 at basic rate (20%) = £7,540
      // £87,440 at higher rate (125140 - 37700 = 87440) at 40% = £34,976
      // £24,860 at additional rate (150000 - 125140 = 24860) at 45% = £11,187
      const result = calculateIncomeTax(150000, 2024);

      expect(result.breakdown.personalAllowance).toBe(0);
      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(34976);
      expect(result.breakdown.additionalRateTax).toBe(11187);
      expect(result.taxPaid).toBe(53703);
      expect(result.netIncome).toBe(96297);
    });

    test('given_incomeExactlyAtAdditionalThreshold_when_calculating_then_noAdditionalRateTax', () => {
      // £125,140 is exactly at threshold (2024)
      // Personal allowance: £0 (fully tapered)
      const result = calculateIncomeTax(125140, 2024);

      expect(result.breakdown.personalAllowance).toBe(0);
      expect(result.breakdown.additionalRateAmount).toBe(0);
      expect(result.breakdown.additionalRateTax).toBe(0);
    });
  });

  describe('historical tax rates - 22% basic rate era (2000-2007)', () => {
    test('given_income50000In2000_when_calculating_then_applies22PercentBasicRate', () => {
      // 2000: Personal allowance £4,385, basic rate 22%, basic rate limit £28,400
      // £50,000 gross
      // £4,385 allowance
      // £28,400 at basic rate (22%) = £6,248
      // £17,215 at higher rate (40%) = £6,886
      const result = calculateIncomeTax(50000, 2000);

      expect(result.breakdown.personalAllowance).toBe(4385);
      expect(result.breakdown.basicRateAmount).toBe(28400);
      expect(result.breakdown.basicRateTax).toBe(6248);
      expect(result.breakdown.higherRateAmount).toBe(17215);
      expect(result.breakdown.higherRateTax).toBe(6886);
      expect(result.taxPaid).toBe(13134);
    });

    test('given_income30000In2007_when_calculating_then_applies22PercentBasicRate', () => {
      // 2007: Personal allowance £5,225, basic rate 22%
      const result = calculateIncomeTax(30000, 2007);

      expect(result.breakdown.basicRateTax).toBeCloseTo(24775 * 0.22, 2);
    });
  });

  describe('historical tax rates - transition year 2008', () => {
    test('given_income30000In2008_when_calculating_then_applies20PercentBasicRate', () => {
      // 2008: Basic rate reduced to 20%
      // Personal allowance £5,435
      const result = calculateIncomeTax(30000, 2008);

      expect(result.breakdown.basicRateTax).toBeCloseTo(24565 * 0.20, 2);
    });
  });

  describe('historical tax rates - additional rate introduction (2010)', () => {
    test('given_income200000In2010_when_calculating_then_applies50PercentAdditionalRate', () => {
      // 2010: Additional rate 50% introduced at £150,000
      // Personal allowance £6,475, but fully tapered at £200,000 income
      // Personal allowance: £0 (income £100,000 over threshold, allowance reduced by £50,000)
      const result = calculateIncomeTax(200000, 2010);

      // Additional rate amount = £200,000 - £150,000 = £50,000
      // But with £0 personal allowance, the bands shift
      expect(result.breakdown.personalAllowance).toBe(0);
      expect(result.breakdown.additionalRateAmount).toBe(50000);  // 200000 - 150000
      expect(result.breakdown.additionalRateTax).toBe(25000);     // 50000 * 0.50
    });

    test('given_income200000In2009_when_calculating_then_noAdditionalRate', () => {
      // 2009: No additional rate yet, and no taper yet
      const result = calculateIncomeTax(200000, 2009);

      expect(result.breakdown.additionalRateTax).toBe(0);
      expect(result.breakdown.higherRateAmount).toBeGreaterThan(0);
    });
  });

  describe('historical tax rates - additional rate reduction (2013)', () => {
    test('given_income200000In2012_when_calculating_then_applies50PercentAdditionalRate', () => {
      // 2012: Personal allowance £8,105, fully tapered at £200,000
      const result = calculateIncomeTax(200000, 2012);

      expect(result.breakdown.personalAllowance).toBe(0);
      expect(result.breakdown.additionalRateAmount).toBe(50000);  // 200000 - 150000
      expect(result.breakdown.additionalRateTax).toBe(50000 * 0.50);  // 50% rate
    });

    test('given_income200000In2013_when_calculating_then_applies45PercentAdditionalRate', () => {
      // 2013: Personal allowance £9,440, fully tapered at £200,000
      const result = calculateIncomeTax(200000, 2013);

      expect(result.breakdown.personalAllowance).toBe(0);
      expect(result.breakdown.additionalRateAmount).toBe(50000);  // 200000 - 150000
      expect(result.breakdown.additionalRateTax).toBe(50000 * 0.45);  // 45% rate
    });
  });

  describe('personal allowance taper (from 2010)', () => {
    test('given_incomeExactly100000In2024_when_calculating_then_fullPersonalAllowance', () => {
      // At exactly £100,000, no taper applies yet
      const result = calculateIncomeTax(100000, 2024);

      expect(result.breakdown.personalAllowance).toBe(12570);
      expect(result.taxPaid).toBe(27432); // No taper impact
    });

    test('given_income110000In2024_when_calculating_then_reducedPersonalAllowance', () => {
      // £110,000 is £10,000 over threshold
      // Allowance reduced by £10,000 / 2 = £5,000
      // Effective allowance = £12,570 - £5,000 = £7,570
      const result = calculateIncomeTax(110000, 2024);

      expect(result.breakdown.personalAllowance).toBe(7570);
      // Taxable: £110,000 - £7,570 = £102,430
      // Basic rate: £37,700 at 20% = £7,540
      // Higher rate: £64,730 at 40% = £25,892
      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(25892);
      expect(result.taxPaid).toBe(33432);
    });

    test('given_income112570In2024_when_calculating_then_halfwayTapered', () => {
      // £112,570 is £12,570 over threshold
      // Allowance reduced by £12,570 / 2 = £6,285
      // Effective allowance = £12,570 - £6,285 = £6,285
      const result = calculateIncomeTax(112570, 2024);

      expect(result.breakdown.personalAllowance).toBe(6285);
    });

    test('given_income125140In2024_when_calculating_then_zeroPersonalAllowance', () => {
      // £125,140 is £25,140 over threshold (exactly 2 * £12,570)
      // Allowance reduced by £25,140 / 2 = £12,570
      // Effective allowance = £12,570 - £12,570 = £0
      const result = calculateIncomeTax(125140, 2024);

      expect(result.breakdown.personalAllowance).toBe(0);
      // Taxable: £125,140 - £0 = £125,140
      // Basic rate: £37,700 at 20% = £7,540
      // Higher rate: £87,440 (125140 - 37700) at 40% = £34,976
      // No additional rate (exactly at threshold)
      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(34976);
      expect(result.breakdown.additionalRateTax).toBe(0);
      expect(result.taxPaid).toBe(42516);
    });

    test('given_income130000In2024_when_calculating_then_zeroPersonalAllowance', () => {
      // £130,000 is well over the taper removal point
      // Allowance should remain at £0 (can't go negative)
      const result = calculateIncomeTax(130000, 2024);

      expect(result.breakdown.personalAllowance).toBe(0);
    });

    test('given_income150000In2024_when_calculating_then_noPersonalAllowanceAndAdditionalRate', () => {
      // Well above taper - should have £0 allowance and pay additional rate
      const result = calculateIncomeTax(150000, 2024);

      expect(result.breakdown.personalAllowance).toBe(0);
      // Taxable: £150,000 - £0 = £150,000
      // Basic rate: £37,700 at 20% = £7,540
      // Higher rate: £87,440 (125140 - 37700) at 40% = £34,976
      // Additional rate: £24,860 (150000 - 125140) at 45% = £11,187
      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(34976);
      expect(result.breakdown.additionalRateTax).toBe(11187);
      expect(result.taxPaid).toBe(53703);
    });

    test('given_income110000In2009_when_calculating_then_noTaperApplied', () => {
      // Taper was introduced in 2010, so 2009 should use full allowance
      const result = calculateIncomeTax(110000, 2009);

      // 2009 personal allowance was £6,475
      expect(result.breakdown.personalAllowance).toBe(6475);
    });

    test('given_income110000In2010_when_calculating_then_taperApplied', () => {
      // First year of taper - £110,000 is £10,000 over threshold
      // 2010 personal allowance was £6,475
      // Allowance reduced by £10,000 / 2 = £5,000
      // Effective allowance = £6,475 - £5,000 = £1,475
      const result = calculateIncomeTax(110000, 2010);

      expect(result.breakdown.personalAllowance).toBe(1475);
    });

    test('given_pensionWithdrawal150000In2024_when_calculating_then_taperAppliedToTaxablePortion', () => {
      // £150,000 pension withdrawal
      // 25% tax-free = £37,500
      // 75% taxable = £112,500 (this is used for taper calculation)
      // Taper: £112,500 - £100,000 = £12,500 over threshold
      // Allowance reduced by £12,500 / 2 = £6,250
      // Effective allowance = £12,570 - £6,250 = £6,320
      const result = calculateIncomeTax(150000, 2024, true);

      expect(result.taxFreeAmount).toBe(37500);
      expect(result.breakdown.personalAllowance).toBe(6320);
    });
  });

  describe('pension withdrawal (25% tax-free)', () => {
    test('given_pensionWithdrawal_when_calculating_then_applies25PercentTaxFree', () => {
      // £100,000 pension withdrawal
      // 25% tax-free = £25,000
      // 75% taxable = £75,000
      const result = calculateIncomeTax(100000, 2024, true);

      expect(result.taxFreeAmount).toBe(25000);
      // Taxable portion: £75,000 - £12,570 = £62,430
      expect(result.taxableAmount).toBe(62430);
    });

    test('given_pensionWithdrawal100000_when_calculating_then_correctTaxPaid', () => {
      // £100,000 pension withdrawal
      // 25% tax-free = £25,000
      // 75% taxable = £75,000 (subject to tax rules)
      // After personal allowance: £75,000 - £12,570 = £62,430 taxable
      // Basic rate: £37,700 at 20% = £7,540
      // Higher rate: £24,730 at 40% = £9,892
      const result = calculateIncomeTax(100000, 2024, true);

      expect(result.breakdown.basicRateTax).toBe(7540);
      expect(result.breakdown.higherRateTax).toBe(9892);
      expect(result.taxPaid).toBe(17432);
      expect(result.netIncome).toBe(82568);
    });

    test('given_smallPensionWithdrawal_when_calculating_then_mayPayNoTax', () => {
      // £16,000 pension withdrawal
      // 25% tax-free = £4,000
      // 75% taxable = £12,000
      // After personal allowance: £12,000 - £12,570 = £0 taxable (below allowance)
      const result = calculateIncomeTax(16000, 2024, true);

      expect(result.taxFreeAmount).toBe(4000);
      expect(result.taxableAmount).toBe(0);
      expect(result.taxPaid).toBe(0);
      expect(result.netIncome).toBe(16000);
    });

    test('given_regularIncome_when_calculating_then_noTaxFreeAmount', () => {
      const result = calculateIncomeTax(50000, 2024, false);
      expect(result.taxFreeAmount).toBe(0);
    });
  });

  describe('result structure', () => {
    test('given_anyValidInput_when_calculating_then_returnsCompleteStructure', () => {
      const result = calculateIncomeTax(50000, 2024);

      expect(result).toHaveProperty('grossIncome');
      expect(result).toHaveProperty('taxFreeAmount');
      expect(result).toHaveProperty('taxableAmount');
      expect(result).toHaveProperty('taxPaid');
      expect(result).toHaveProperty('netIncome');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown).toHaveProperty('personalAllowance');
      expect(result.breakdown).toHaveProperty('basicRateTax');
      expect(result.breakdown).toHaveProperty('higherRateTax');
      expect(result.breakdown).toHaveProperty('additionalRateTax');
      expect(result.breakdown).toHaveProperty('basicRateAmount');
      expect(result.breakdown).toHaveProperty('higherRateAmount');
      expect(result.breakdown).toHaveProperty('additionalRateAmount');
    });

    test('given_validIncome_when_calculating_then_netIncomeEqualsGrossMinusTax', () => {
      const result = calculateIncomeTax(75000, 2024);
      expect(result.netIncome).toBe(result.grossIncome - result.taxPaid);
    });

    test('given_validIncome_when_calculating_then_taxAmountsSumToTaxPaid', () => {
      const result = calculateIncomeTax(200000, 2024);
      const sumOfTaxes = result.breakdown.basicRateTax +
                         result.breakdown.higherRateTax +
                         result.breakdown.additionalRateTax;
      expect(sumOfTaxes).toBe(result.taxPaid);
    });
  });
});

describe('calculateEffectiveTaxRate', () => {
  test('given_zeroIncome_when_calculating_then_returnsZero', () => {
    expect(calculateEffectiveTaxRate(0, 0)).toBe(0);
  });

  test('given_negativeIncome_when_calculating_then_returnsZero', () => {
    expect(calculateEffectiveTaxRate(-1000, 0)).toBe(0);
  });

  test('given_validIncomeAndTax_when_calculating_then_returnsCorrectRate', () => {
    // £50,000 income, £10,000 tax = 20% effective rate
    expect(calculateEffectiveTaxRate(50000, 10000)).toBe(0.20);
  });

  test('given_incomeWithTaxResult_when_calculating_then_matchesExpected', () => {
    const result = calculateIncomeTax(100000, 2024);
    const effectiveRate = calculateEffectiveTaxRate(result.grossIncome, result.taxPaid);
    // Tax paid is £27,432 on £100,000 = 27.432%
    expect(effectiveRate).toBeCloseTo(0.27432, 4);
  });
});

describe('getMarginalTaxRate', () => {
  test('given_yearOutsideRange_when_gettingRate_then_throwsError', () => {
    expect(() => getMarginalTaxRate(50000, 1979)).toThrow('outside supported range');
  });

  test('given_zeroIncome_when_gettingRate_then_returnsZero', () => {
    expect(getMarginalTaxRate(0, 2024)).toBe(0);
  });

  test('given_incomeBelowPersonalAllowance_when_gettingRate_then_returnsZero', () => {
    expect(getMarginalTaxRate(10000, 2024)).toBe(0);
  });

  test('given_incomeInBasicRateBand_when_gettingRate_then_returnsBasicRate', () => {
    expect(getMarginalTaxRate(30000, 2024)).toBe(0.20);
    expect(getMarginalTaxRate(30000, 2000)).toBe(0.22);  // 22% in 2000
  });

  test('given_incomeInHigherRateBand_when_gettingRate_then_returnsHigherRate', () => {
    expect(getMarginalTaxRate(60000, 2024)).toBe(0.40);
  });

  test('given_incomeInAdditionalRateBand_when_gettingRate_then_returnsAdditionalRate', () => {
    expect(getMarginalTaxRate(150000, 2024)).toBe(0.45);
    expect(getMarginalTaxRate(200000, 2010)).toBe(0.50);  // 50% in 2010
  });

  test('given_highIncomePreAdditionalRate_when_gettingRate_then_returnsHigherRate', () => {
    // Before 2010, no additional rate existed
    expect(getMarginalTaxRate(200000, 2009)).toBe(0.40);
  });
});

describe('getTaxBands', () => {
  test('given_yearOutsideRange_when_gettingBands_then_throwsError', () => {
    expect(() => getTaxBands(1979)).toThrow('outside supported range');
  });

  test('given_year2024_when_gettingBands_then_returnsFourBands', () => {
    const bands = getTaxBands(2024);

    expect(bands).toHaveLength(4);
    expect(bands[0].name).toBe('Personal Allowance');
    expect(bands[1].name).toBe('Basic Rate');
    expect(bands[2].name).toBe('Higher Rate');
    expect(bands[3].name).toBe('Additional Rate');
  });

  test('given_year2009_when_gettingBands_then_returnsThreeBands', () => {
    // No additional rate in 2009
    const bands = getTaxBands(2009);

    expect(bands).toHaveLength(3);
    expect(bands[0].name).toBe('Personal Allowance');
    expect(bands[1].name).toBe('Basic Rate');
    expect(bands[2].name).toBe('Higher Rate');
  });

  test('given_year2024_when_gettingBands_then_hasCorrectThresholds', () => {
    const bands = getTaxBands(2024);

    expect(bands[0].from).toBe(0);
    expect(bands[0].to).toBe(12570);

    expect(bands[1].from).toBe(12570);
    expect(bands[1].to).toBe(50270);  // 12570 + 37700

    expect(bands[2].from).toBe(50270);
    expect(bands[2].to).toBe(125140);

    expect(bands[3].from).toBe(125140);
    expect(bands[3].to).toBe(Infinity);
  });

  test('given_year2000_when_gettingBands_then_hasCorrect22PercentBasicRate', () => {
    const bands = getTaxBands(2000);

    expect(bands[1].rate).toBe(0.22);
  });

  test('given_year2008_when_gettingBands_then_hasCorrect20PercentBasicRate', () => {
    const bands = getTaxBands(2008);

    expect(bands[1].rate).toBe(0.20);
  });
});

// ============================================
// Phase 6: 1980s Tax Regime Tests
// ============================================

describe('1980s tax regime', () => {
  test('given_income20000_when_calculatingTaxFor1980_then_applies30PercentBasicRate', () => {
    // 1980: PA = £1,375, basic rate = 30%, higher rate = 60%
    const result = calculateIncomeTax(20000, 1980);

    // Taxable = 20000 - 1375 = 18625
    // All within basic rate band (limit 11250)? No: 18625 > 11250
    // Basic: 11250 * 0.30 = 3375
    // Higher: (18625 - 11250) * 0.60 = 7375 * 0.60 = 4425
    // Total: 3375 + 4425 = 7800
    expect(result.taxPaid).toBeCloseTo(7800, 0);
    expect(result.netIncome).toBeCloseTo(12200, 0);
  });

  test('given_income5000_when_calculatingTaxFor1980_then_onlyBasicRate', () => {
    // 1980: PA = £1,375, basic rate = 30%
    const result = calculateIncomeTax(5000, 1980);

    // Taxable = 5000 - 1375 = 3625
    // All within basic rate band (11250)
    // Tax: 3625 * 0.30 = 1087.50
    expect(result.taxPaid).toBeCloseTo(1087.50, 0);
  });

  test('given_income50000_when_calculatingTaxFor1980_then_applies60PercentHigherRate', () => {
    // 1980: PA = £1,375, basic = 30% up to 11250, higher = 60%
    const result = calculateIncomeTax(50000, 1980);

    // Taxable = 48625
    // Basic: 11250 * 0.30 = 3375
    // Higher: (48625 - 11250) * 0.60 = 37375 * 0.60 = 22425
    // Total: 3375 + 22425 = 25800
    expect(result.taxPaid).toBeCloseTo(25800, 0);
  });

  test('given_income20000_when_calculatingTaxFor1986_then_applies29PercentBasicRate', () => {
    // 1986: PA = £2,335, basic rate = 29%, basicRateLimit = 17200, higher = 60%
    const result = calculateIncomeTax(20000, 1986);

    // Taxable = 20000 - 2335 = 17665
    // Basic: 17200 * 0.29 = 4988
    // Higher: (17665 - 17200) * 0.60 = 465 * 0.60 = 279
    // Total: 4988 + 279 = 5267
    expect(result.taxPaid).toBeCloseTo(5267, 0);
  });

  test('given_income30000_when_calculatingTaxFor1988_then_applies25PercentBasicAnd40PercentHigher', () => {
    // 1988: PA = £2,605, basic = 25% up to 19300, higher = 40% (Lawson reform)
    const result = calculateIncomeTax(30000, 1988);

    // Taxable = 30000 - 2605 = 27395
    // Basic: 19300 * 0.25 = 4825
    // Higher: (27395 - 19300) * 0.40 = 8095 * 0.40 = 3238
    // Total: 4825 + 3238 = 8063
    expect(result.taxPaid).toBeCloseTo(8063, 0);
  });

  test('given_income10000_when_calculatingTaxFor1988_then_onlyBasicAt25Percent', () => {
    // 1988: PA = £2,605, basic = 25%
    const result = calculateIncomeTax(10000, 1988);

    // Taxable = 10000 - 2605 = 7395
    // All within basic rate (19300)
    // Tax: 7395 * 0.25 = 1848.75
    expect(result.taxPaid).toBeCloseTo(1848.75, 0);
  });

  test('given_pensionWithdrawal_when_1980_then_25PercentTaxFreeApplied', () => {
    // 1980: PA = £1,375, basic = 30%, higher = 60%
    const result = calculateIncomeTax(20000, 1980, true);

    // 25% tax-free: 5000
    // Taxable gross: 15000
    // PA deducted: 15000 - 1375 = 13625
    // Basic: min(13625, 11250) * 0.30 = 11250 * 0.30 = 3375
    // Higher: (13625 - 11250) * 0.60 = 2375 * 0.60 = 1425
    // Total: 3375 + 1425 = 4800
    expect(result.taxFreeAmount).toBeCloseTo(5000, 0);
    expect(result.taxPaid).toBeCloseTo(4800, 0);
  });

  test('given_income30000_when_calculatingTaxFor1997_then_applies23PercentBasicRate', () => {
    // 1997: PA = £3,765, basic = 23%, limit = 26100, higher = 40%
    const result = calculateIncomeTax(30000, 1997);

    // Taxable = 30000 - 3765 = 26235
    // Basic: 26100 * 0.23 = 6003
    // Higher: (26235 - 26100) * 0.40 = 135 * 0.40 = 54
    // Total: 6003 + 54 = 6057
    expect(result.taxPaid).toBeCloseTo(6057, 0);
  });

  test('given_year1980_when_gettingBands_then_returns30PercentBasicAnd60PercentHigher', () => {
    const bands = getTaxBands(1980);

    expect(bands).toHaveLength(3); // PA, Basic, Higher (no additional rate)
    expect(bands[0].rate).toBe(0);
    expect(bands[1].rate).toBe(0.30);
    expect(bands[2].rate).toBe(0.60);
  });

  test('given_year1988_when_gettingBands_then_returns25PercentBasicAnd40PercentHigher', () => {
    const bands = getTaxBands(1988);

    expect(bands).toHaveLength(3);
    expect(bands[1].rate).toBe(0.25);
    expect(bands[2].rate).toBe(0.40);
  });
});

// ============================================
// Phase 7: Tax Calculator Edge Cases
// ============================================

describe('tax calculator edge cases', () => {
  test('given_income100001_when_calculatingTaxFor2024_then_taperReducesPersonalAllowance', () => {
    // £100,001 is £1 over the taper threshold
    // PA starts at 12570, reduced by £1 for every £2 over £100,000
    // Reduction = floor(1 / 2) = 0 (only £1 over, so floor is 0)
    // But at £100,002: reduction = 1
    const result100001 = calculateIncomeTax(100001, 2024);
    const result100000 = calculateIncomeTax(100000, 2024);

    // With floor(1/2) = 0, PA stays at 12570 for £100,001
    // Tax at £100,001 should be £40 more than at £100,000 (40% marginal rate)
    expect(result100001.taxPaid).toBeGreaterThan(result100000.taxPaid);
  });

  test('given_income100002_when_calculatingTaxFor2024_then_taperStartsReducingPA', () => {
    // At £100,002: excess = 2, reduction = floor(2/2) = 1
    // Effective PA = 12570 - 1 = 12569
    const result100002 = calculateIncomeTax(100002, 2024);
    const result100000 = calculateIncomeTax(100000, 2024);

    // The effective ~60% marginal rate in the taper zone
    // means extra tax increases faster than 40%
    const extraTax = result100002.taxPaid - result100000.taxPaid;
    const extraIncome = 2;
    // Should be more than 40% rate (effective ~60% due to PA taper)
    expect(extraTax / extraIncome).toBeGreaterThan(0.40);
  });

  test('given_income500000_when_calculatingTaxFor2024_then_allBandsApplied', () => {
    // At £500k, PA is fully tapered (income > £125,140)
    // Effective PA = 0
    // Taxable = £500,000
    // Basic: £37,700 * 20% = £7,540
    // Higher: (£125,140 - 0 - £37,700) * 40% = £87,440 * 40% = £34,976
    // Additional: (£500,000 - £125,140) * 45% = £374,860 * 45% = £168,687
    // Total = £7,540 + £34,976 + £168,687 = £211,203
    const result = calculateIncomeTax(500000, 2024);

    expect(result.taxPaid).toBeCloseTo(211203, 0);
    expect(result.netIncome).toBeCloseTo(288797, 0);
  });

  test('given_income125140_when_calculatingTaxFor2024_then_personalAllowanceFullyTapered', () => {
    // At £125,140, PA should be exactly 0 (tapered by £12,570)
    // excess over £100,000 = £25,140, reduction = floor(25140/2) = 12570
    // Effective PA = 12570 - 12570 = 0
    const result = calculateIncomeTax(125140, 2024);

    // Taxable = £125,140 (0 PA)
    // Basic: 37700 * 0.20 = 7540
    // Higher: (125140 - 37700) * 0.40 = 87440 * 0.40 = 34976
    // Total: 7540 + 34976 = 42516
    expect(result.taxPaid).toBeCloseTo(42516, 0);
  });

  test('given_getMarginalTaxRate_when_incomeInTaperZone_then_returns40Percent', () => {
    // Note: getMarginalTaxRate uses base PA (not tapered) for band calculation
    // At £110,000, the nominal band says "higher rate" = 40%
    const rate = getMarginalTaxRate(110000, 2024);
    expect(rate).toBe(0.40);
  });

  test('given_income50000_when_calculatingTaxFor2026_then_worksCorrectly', () => {
    // 2026: PA = £12,570, basic = 20% up to 37700, higher = 40%
    const result = calculateIncomeTax(50000, 2026);

    // Taxable = 50000 - 12570 = 37430
    // All within basic rate (37700)
    // Tax: 37430 * 0.20 = 7486
    expect(result.taxPaid).toBeCloseTo(7486, 0);
  });

  test('given_nanInput_when_calculatingTax_then_throwsError', () => {
    expect(() => calculateIncomeTax(NaN, 2024)).toThrow();
  });

  test('given_zeroIncome_when_calculatingTax_then_returnsZeroTax', () => {
    const result = calculateIncomeTax(0, 2024);
    expect(result.taxPaid).toBe(0);
    expect(result.netIncome).toBe(0);
  });
});
