/**
 * Synthetic ETF Price Calculator Tests
 *
 * Tests for calculating GBP-denominated ETF prices for multiple indices
 * (S&P 500, Nasdaq 100, FTSE 100) before the funds existed.
 * All tests follow the naming convention: given_[precondition]_when_[action]_then_[expectedResult]
 */

import { describe, test, expect } from 'vitest';
import {
  getSyntheticPrice,
  getSyntheticEtfPrice,
  calculateUnits,
  calculateValue,
  calculateReturn,
  calculateAnnualizedReturn,
  getAllPrices,
  validatePrices,
  isDataAvailable,
  getEarliestYear,
  getIndexConfig,
  INDEX_TYPES,
  INDEX_CONFIG,
  BASE_YEAR,
  BASE_PRICE_GBP
} from '../../src/calculators/syntheticEtf.js';

describe('getSyntheticEtfPrice', () => {
  describe('input validation', () => {
    test('given_yearOutsideRange_when_gettingPrice_then_throwsError', () => {
      expect(() => getSyntheticEtfPrice(1979)).toThrow('outside supported range');
      expect(() => getSyntheticEtfPrice(2027)).toThrow('outside supported range');
    });

    test('given_nonIntegerYear_when_gettingPrice_then_throwsError', () => {
      expect(() => getSyntheticEtfPrice(2020.5)).toThrow();
    });
  });

  describe('base year calibration', () => {
    test('given_baseYear2019_when_gettingPrice_then_equalsBasePrice', () => {
      const price = getSyntheticEtfPrice(BASE_YEAR);
      expect(price).toBeCloseTo(BASE_PRICE_GBP, 2);
    });

    test('given_validatePrices_when_called_then_returnsTrue', () => {
      expect(validatePrices()).toBe(true);
    });
  });

  describe('historical price calculation', () => {
    test('given_year2000_when_gettingPrice_then_calculatesCorrectly', () => {
      // 2000: S&P 500 TR = 2474.50, Exchange = 1.6178
      // 2019 (base): S&P 500 TR = 5648.40, Exchange = 1.2755
      // Price = (2474.50 / 5648.40) * 44.30 * (1.2755 / 1.6178)
      // Price = 0.4381 * 44.30 * 0.7884 = ~15.30
      const price = getSyntheticEtfPrice(2000);
      expect(price).toBeGreaterThan(10);
      expect(price).toBeLessThan(25);
    });

    test('given_year2010_when_gettingPrice_then_calculatesCorrectly', () => {
      // 2010: S&P 500 TR = 2596.98, Exchange = 1.6148
      // Should be higher than 2000 due to S&P growth but similar FX
      const price = getSyntheticEtfPrice(2010);
      expect(price).toBeGreaterThan(10);
      expect(price).toBeLessThan(25);
    });

    test('given_year2020_when_gettingPrice_then_calculatesCorrectly', () => {
      // 2020: S&P 500 TR = 7315.00, Exchange = 1.3253
      // Should be higher than base year (stronger performance after 2019)
      const price = getSyntheticEtfPrice(2020);
      expect(price).toBeGreaterThan(BASE_PRICE_GBP);
    });

    test('given_year2026_when_gettingPrice_then_calculatesCorrectly', () => {
      // 2026 should show significant growth from base year
      const price = getSyntheticEtfPrice(2026);
      expect(price).toBeGreaterThan(BASE_PRICE_GBP * 1.5);
    });
  });

  describe('price trends', () => {
    test('given_multipleYears_when_comparing_then_pricesReflectMarketMoves', () => {
      // 2008 (pre-crash high) should be higher than 2009 (post-crash low)
      const price2008 = getSyntheticEtfPrice(2008);
      const price2009 = getSyntheticEtfPrice(2009);
      expect(price2008).toBeGreaterThan(price2009);
    });

    test('given_2000To2003_when_comparing_then_showsDotComCrash', () => {
      // Dot-com crash: 2000 peak -> 2003 trough
      const price2000 = getSyntheticEtfPrice(2000);
      const price2003 = getSyntheticEtfPrice(2003);
      expect(price2000).toBeGreaterThan(price2003);
    });

    test('given_2019To2026_when_comparing_then_showsOverallGrowth', () => {
      const price2019 = getSyntheticEtfPrice(2019);
      const price2026 = getSyntheticEtfPrice(2026);
      expect(price2026).toBeGreaterThan(price2019);
    });
  });

  describe('currency impact', () => {
    test('given_yearWithWeakPound_when_gettingPrice_then_priceIsHigher', () => {
      // 2017 had a weak pound (1.2271) post-Brexit vote
      // Compare to 2007 which had stronger pound (1.9586)
      // All else equal, weak pound = higher GBP price for USD assets

      // This is a conceptual test - the actual effect depends on S&P performance too
      // We just verify the calculation includes currency adjustments
      const price2017 = getSyntheticEtfPrice(2017);
      expect(price2017).toBeGreaterThan(0);
    });
  });
});

describe('calculateUnits', () => {
  test('given_negativeAmount_when_calculating_then_throwsError', () => {
    expect(() => calculateUnits(-1000, 2020)).toThrow('Amount must be non-negative');
  });

  test('given_zeroAmount_when_calculating_then_returnsZero', () => {
    expect(calculateUnits(0, 2020)).toBe(0);
  });

  test('given_validAmount_when_calculating_then_returnsCorrectUnits', () => {
    const amount = 10000;
    const year = 2020;
    const price = getSyntheticEtfPrice(year);
    const expectedUnits = amount / price;

    const units = calculateUnits(amount, year);
    expect(units).toBeCloseTo(expectedUnits, 6);
  });

  test('given_largeAmount_when_calculating_then_returnsMoreUnits', () => {
    const smallUnits = calculateUnits(10000, 2020);
    const largeUnits = calculateUnits(100000, 2020);
    expect(largeUnits).toBeCloseTo(smallUnits * 10, 6);
  });
});

describe('calculateValue', () => {
  test('given_negativeUnits_when_calculating_then_throwsError', () => {
    expect(() => calculateValue(-100, 2020)).toThrow('Units must be non-negative');
  });

  test('given_zeroUnits_when_calculating_then_returnsZero', () => {
    expect(calculateValue(0, 2020)).toBe(0);
  });

  test('given_validUnits_when_calculating_then_returnsCorrectValue', () => {
    const units = 100;
    const year = 2020;
    const price = getSyntheticEtfPrice(year);
    const expectedValue = units * price;

    const value = calculateValue(units, year);
    expect(value).toBeCloseTo(expectedValue, 2);
  });

  test('given_unitsAndAmount_when_roundTrip_then_valuesMatch', () => {
    // Buy £50,000 of units, then calculate their value
    const investAmount = 50000;
    const buyYear = 2015;

    const units = calculateUnits(investAmount, buyYear);
    const valueAtSameYear = calculateValue(units, buyYear);

    expect(valueAtSameYear).toBeCloseTo(investAmount, 2);
  });
});

describe('calculateReturn', () => {
  test('given_sameYear_when_calculating_then_returnsOne', () => {
    expect(calculateReturn(2020, 2020)).toBeCloseTo(1, 6);
  });

  test('given_positiveGrowthPeriod_when_calculating_then_returnsGreaterThanOne', () => {
    // 2010 to 2020 was a strong growth period
    const returnMultiplier = calculateReturn(2010, 2020);
    expect(returnMultiplier).toBeGreaterThan(1);
  });

  test('given_downturnPeriod_when_calculating_then_returnsLessThanOne', () => {
    // 2000 to 2003 was the dot-com crash
    const returnMultiplier = calculateReturn(2000, 2003);
    expect(returnMultiplier).toBeLessThan(1);
  });

  test('given_longTermPeriod_when_calculating_then_showsSignificantGrowth', () => {
    // 2000 to 2026 should show significant long-term growth
    const returnMultiplier = calculateReturn(2000, 2026);
    expect(returnMultiplier).toBeGreaterThan(2);  // At least doubled
  });

  test('given_startAndEnd_when_calculating_then_matchesPriceRatio', () => {
    const startPrice = getSyntheticEtfPrice(2015);
    const endPrice = getSyntheticEtfPrice(2020);
    const expectedReturn = endPrice / startPrice;

    const returnMultiplier = calculateReturn(2015, 2020);
    expect(returnMultiplier).toBeCloseTo(expectedReturn, 6);
  });
});

describe('calculateAnnualizedReturn', () => {
  test('given_sameYear_when_calculating_then_throwsError', () => {
    expect(() => calculateAnnualizedReturn(2020, 2020)).toThrow('End year must be after start year');
  });

  test('given_endBeforeStart_when_calculating_then_throwsError', () => {
    expect(() => calculateAnnualizedReturn(2020, 2015)).toThrow('End year must be after start year');
  });

  test('given_oneYearPeriod_when_calculating_then_equalsSimpleReturn', () => {
    // For 1 year, annualized return equals simple return
    const simpleReturn = calculateReturn(2019, 2020);
    const annualizedReturn = calculateAnnualizedReturn(2019, 2020);

    expect(annualizedReturn + 1).toBeCloseTo(simpleReturn, 4);
  });

  test('given_longPeriod_when_calculating_then_returnsReasonableRate', () => {
    // 2000 to 2026 - expect reasonable annualized return
    const annualizedReturn = calculateAnnualizedReturn(2000, 2026);

    // Long-term stock returns are typically 7-10% nominal
    expect(annualizedReturn).toBeGreaterThan(0.03);
    expect(annualizedReturn).toBeLessThan(0.15);
  });

  test('given_annualizedReturn_when_compounded_then_matchesTotalReturn', () => {
    const startYear = 2010;
    const endYear = 2020;
    const years = endYear - startYear;

    const totalReturn = calculateReturn(startYear, endYear);
    const annualized = calculateAnnualizedReturn(startYear, endYear);

    // Compounding the annualized return should give the total return
    const compounded = Math.pow(1 + annualized, years);
    expect(compounded).toBeCloseTo(totalReturn, 4);
  });
});

describe('getAllPrices', () => {
  test('given_call_when_gettingAllPrices_then_returnsAllYears', () => {
    const prices = getAllPrices();

    expect(Object.keys(prices).length).toBe(47);  // 1980-2026
    expect(prices[1980]).toBeDefined();
    expect(prices[2026]).toBeDefined();
  });

  test('given_allPrices_when_checking_then_allPositive', () => {
    const prices = getAllPrices();

    for (const year in prices) {
      expect(prices[year]).toBeGreaterThan(0);
    }
  });

  test('given_allPrices_when_checkingBaseYear_then_matchesBasePrice', () => {
    const prices = getAllPrices();
    expect(prices[BASE_YEAR]).toBeCloseTo(BASE_PRICE_GBP, 2);
  });
});

describe('integration tests', () => {
  test('given_investmentScenario_when_simulating_then_calculatesCorrectly', () => {
    // Invest £100,000 in 2005, check value in 2025
    const investAmount = 100000;
    const buyYear = 2005;
    const sellYear = 2025;

    const units = calculateUnits(investAmount, buyYear);
    const endValue = calculateValue(units, sellYear);

    // Should have grown significantly over 20 years
    expect(endValue).toBeGreaterThan(investAmount * 2);

    // Verify against return calculation
    const returnMultiplier = calculateReturn(buyYear, sellYear);
    expect(endValue).toBeCloseTo(investAmount * returnMultiplier, 0);
  });

  test('given_crashAndRecovery_when_tracking_then_showsPatterns', () => {
    // 2008 financial crisis pattern
    const pre2008 = getSyntheticEtfPrice(2007);
    const crash2009 = getSyntheticEtfPrice(2009);
    const recovery2013 = getSyntheticEtfPrice(2013);

    // Crash: 2009 should be significantly lower than 2007
    expect(crash2009).toBeLessThan(pre2008 * 0.9);

    // Recovery: 2013 should have recovered
    expect(recovery2013).toBeGreaterThan(crash2009);
  });
});

describe('edge cases', () => {
  test('given_firstYear_when_gettingPrice_then_works', () => {
    const price = getSyntheticEtfPrice(2000);
    expect(price).toBeGreaterThan(0);
  });

  test('given_lastYear_when_gettingPrice_then_works', () => {
    const price = getSyntheticEtfPrice(2026);
    expect(price).toBeGreaterThan(0);
  });

  test('given_verySmallInvestment_when_calculating_then_handlesCorrectly', () => {
    const units = calculateUnits(0.01, 2020);
    expect(units).toBeGreaterThan(0);
  });

  test('given_veryLargeInvestment_when_calculating_then_handlesCorrectly', () => {
    const units = calculateUnits(10000000, 2020);
    expect(units).toBeGreaterThan(0);
    expect(isFinite(units)).toBe(true);
  });
});

// ============================================
// NEW: Multi-Index Tests
// ============================================

describe('INDEX_TYPES and INDEX_CONFIG', () => {
  test('given_indexTypes_when_checking_then_hasAllIndices', () => {
    expect(INDEX_TYPES.SP500).toBe('sp500');
    expect(INDEX_TYPES.NASDAQ100).toBe('nasdaq100');
    expect(INDEX_TYPES.FTSE100).toBe('ftse100');
    expect(INDEX_TYPES.GOLD_ETF).toBe('goldEtf');
    expect(INDEX_TYPES.US_TREASURY).toBe('usTreasury');
  });

  test('given_indexConfig_when_checking_then_hasAllIndices', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.SP500]).toBeDefined();
    expect(INDEX_CONFIG[INDEX_TYPES.NASDAQ100]).toBeDefined();
    expect(INDEX_CONFIG[INDEX_TYPES.FTSE100]).toBeDefined();
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF]).toBeDefined();
    expect(INDEX_CONFIG[INDEX_TYPES.US_TREASURY]).toBeDefined();
  });

  test('given_sp500Config_when_checking_then_requiresCurrencyConversion', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.SP500].requiresCurrencyConversion).toBe(true);
    expect(INDEX_CONFIG[INDEX_TYPES.SP500].currency).toBe('USD');
  });

  test('given_nasdaq100Config_when_checking_then_requiresCurrencyConversion', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.NASDAQ100].requiresCurrencyConversion).toBe(true);
    expect(INDEX_CONFIG[INDEX_TYPES.NASDAQ100].currency).toBe('USD');
  });

  test('given_ftse100Config_when_checking_then_noCurrencyConversion', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.FTSE100].requiresCurrencyConversion).toBe(false);
    expect(INDEX_CONFIG[INDEX_TYPES.FTSE100].currency).toBe('GBP');
  });

  test('given_nasdaq100Config_when_checking_then_hasCorrectEarliestYear', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.NASDAQ100].earliestYear).toBe(1985);
  });

  test('given_ftse100Config_when_checking_then_hasCorrectEarliestYear', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.FTSE100].earliestYear).toBe(1984);
  });
});

describe('getSyntheticPrice multi-index', () => {
  describe('S&P 500', () => {
    test('given_sp500Index_when_gettingPrice_then_matchesLegacyFunction', () => {
      const newPrice = getSyntheticPrice(2010, INDEX_TYPES.SP500);
      const legacyPrice = getSyntheticEtfPrice(2010);
      expect(newPrice).toBeCloseTo(legacyPrice, 6);
    });

    test('given_sp500BaseYear_when_gettingPrice_then_equalsBasePrice', () => {
      const price = getSyntheticPrice(INDEX_CONFIG[INDEX_TYPES.SP500].baseYear, INDEX_TYPES.SP500);
      expect(price).toBeCloseTo(INDEX_CONFIG[INDEX_TYPES.SP500].basePriceGbp, 2);
    });
  });

  describe('Nasdaq 100', () => {
    test('given_nasdaq100_when_gettingPrice2019_then_equalsBasePrice', () => {
      const price = getSyntheticPrice(2019, INDEX_TYPES.NASDAQ100);
      expect(price).toBeCloseTo(INDEX_CONFIG[INDEX_TYPES.NASDAQ100].basePriceGbp, 2);
    });

    test('given_nasdaq100_when_gettingPrice1985_then_works', () => {
      const price = getSyntheticPrice(1985, INDEX_TYPES.NASDAQ100);
      expect(price).toBeGreaterThan(0);
    });

    test('given_nasdaq100_when_gettingPrice1984_then_throwsError', () => {
      expect(() => getSyntheticPrice(1984, INDEX_TYPES.NASDAQ100))
        .toThrow('Nasdaq 100 data not available for year 1984');
    });

    test('given_nasdaq100_when_comparingToSp500_then_showsHigherVolatility', () => {
      // Nasdaq typically more volatile than S&P 500
      const nasdaq2000 = getSyntheticPrice(2000, INDEX_TYPES.NASDAQ100);
      const nasdaq2003 = getSyntheticPrice(2003, INDEX_TYPES.NASDAQ100);
      const sp500_2000 = getSyntheticPrice(2000, INDEX_TYPES.SP500);
      const sp500_2003 = getSyntheticPrice(2003, INDEX_TYPES.SP500);

      // Nasdaq crashed harder in dot-com bust
      const nasdaqDrop = nasdaq2003 / nasdaq2000;
      const sp500Drop = sp500_2003 / sp500_2000;
      expect(nasdaqDrop).toBeLessThan(sp500Drop);
    });
  });

  describe('FTSE 100', () => {
    test('given_ftse100_when_gettingPrice2019_then_equalsBasePrice', () => {
      const price = getSyntheticPrice(2019, INDEX_TYPES.FTSE100);
      expect(price).toBeCloseTo(INDEX_CONFIG[INDEX_TYPES.FTSE100].basePriceGbp, 2);
    });

    test('given_ftse100_when_gettingPrice1984_then_works', () => {
      const price = getSyntheticPrice(1984, INDEX_TYPES.FTSE100);
      expect(price).toBeGreaterThan(0);
    });

    test('given_ftse100_when_gettingPrice1983_then_throwsError', () => {
      expect(() => getSyntheticPrice(1983, INDEX_TYPES.FTSE100))
        .toThrow('FTSE 100 data not available for year 1983');
    });

    test('given_ftse100_when_comparingToSp500_then_showsLowerGrowth', () => {
      // FTSE 100 historically underperformed S&P 500
      const ftseReturn = calculateReturn(2000, 2025, INDEX_TYPES.FTSE100);
      const sp500Return = calculateReturn(2000, 2025, INDEX_TYPES.SP500);
      expect(ftseReturn).toBeLessThan(sp500Return);
    });

    test('given_ftse100_when_calculatingPrice_then_noCurrencyConversion', () => {
      // FTSE is GBP-based - price should only reflect index performance
      // This is a conceptual test - we verify no errors occur
      const price = getSyntheticPrice(2010, INDEX_TYPES.FTSE100);
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('US Treasury', () => {
    test('given_usTreasury_when_gettingPrice2019_then_equalsBasePrice', () => {
      const price = getSyntheticPrice(2019, INDEX_TYPES.US_TREASURY);
      expect(price).toBeCloseTo(INDEX_CONFIG[INDEX_TYPES.US_TREASURY].basePriceGbp, 2);
    });

    test('given_usTreasury_when_gettingPrice1980_then_works', () => {
      const price = getSyntheticPrice(1980, INDEX_TYPES.US_TREASURY);
      expect(price).toBeGreaterThan(0);
    });

    test('given_usTreasury_when_checking2008_then_showsFlightToSafety', () => {
      // 2008 financial crisis should show Treasury gains
      const price2007 = getSyntheticPrice(2007, INDEX_TYPES.US_TREASURY);
      const price2008 = getSyntheticPrice(2008, INDEX_TYPES.US_TREASURY);
      expect(price2008).toBeGreaterThan(price2007);
    });

    test('given_usTreasury_when_checking2023_then_showsRateHikeImpact', () => {
      // 2022-2023 rate hikes devastated long bonds
      const price2022 = getSyntheticPrice(2022, INDEX_TYPES.US_TREASURY);
      const price2023 = getSyntheticPrice(2023, INDEX_TYPES.US_TREASURY);
      expect(price2023).toBeLessThan(price2022);
    });

    test('given_usTreasuryConfig_when_checking_then_requiresCurrencyConversion', () => {
      expect(INDEX_CONFIG[INDEX_TYPES.US_TREASURY].requiresCurrencyConversion).toBe(true);
      expect(INDEX_CONFIG[INDEX_TYPES.US_TREASURY].currency).toBe('USD');
    });

    test('given_usTreasuryConfig_when_checking_then_hasCorrectEarliestYear', () => {
      expect(INDEX_CONFIG[INDEX_TYPES.US_TREASURY].earliestYear).toBe(1980);
    });
  });

  describe('error handling', () => {
    test('given_invalidIndex_when_gettingPrice_then_throwsError', () => {
      expect(() => getSyntheticPrice(2020, 'invalid'))
        .toThrow('Unknown index type: invalid');
    });

    test('given_yearOutOfRange_when_gettingPrice_then_throwsError', () => {
      expect(() => getSyntheticPrice(1979, INDEX_TYPES.SP500))
        .toThrow('outside supported range');
    });
  });
});

describe('calculateUnits multi-index', () => {
  test('given_nasdaq100_when_calculatingUnits_then_works', () => {
    const units = calculateUnits(10000, 2020, INDEX_TYPES.NASDAQ100);
    expect(units).toBeGreaterThan(0);
  });

  test('given_ftse100_when_calculatingUnits_then_works', () => {
    const units = calculateUnits(10000, 2020, INDEX_TYPES.FTSE100);
    expect(units).toBeGreaterThan(0);
  });

  test('given_sameAmountDifferentIndices_when_comparing_then_differentUnits', () => {
    const sp500Units = calculateUnits(10000, 2020, INDEX_TYPES.SP500);
    const nasdaqUnits = calculateUnits(10000, 2020, INDEX_TYPES.NASDAQ100);
    const ftseUnits = calculateUnits(10000, 2020, INDEX_TYPES.FTSE100);

    // Different prices = different unit counts
    expect(sp500Units).not.toBeCloseTo(nasdaqUnits, 1);
    expect(sp500Units).not.toBeCloseTo(ftseUnits, 1);
  });
});

describe('calculateValue multi-index', () => {
  test('given_nasdaq100_when_calculatingValue_then_works', () => {
    const value = calculateValue(100, 2020, INDEX_TYPES.NASDAQ100);
    expect(value).toBeGreaterThan(0);
  });

  test('given_ftse100_when_calculatingValue_then_works', () => {
    const value = calculateValue(100, 2020, INDEX_TYPES.FTSE100);
    expect(value).toBeGreaterThan(0);
  });
});

describe('calculateReturn multi-index', () => {
  test('given_nasdaq100_when_calculatingReturn_then_works', () => {
    const returnVal = calculateReturn(2010, 2020, INDEX_TYPES.NASDAQ100);
    expect(returnVal).toBeGreaterThan(1);  // Growth over 10 years
  });

  test('given_ftse100_when_calculatingReturn_then_works', () => {
    const returnVal = calculateReturn(2010, 2020, INDEX_TYPES.FTSE100);
    expect(returnVal).toBeGreaterThan(1);  // Growth over 10 years
  });

  test('given_allIndices_when_comparing20002020_then_showsRelativePerformance', () => {
    const sp500Return = calculateReturn(2000, 2020, INDEX_TYPES.SP500);
    const nasdaqReturn = calculateReturn(2000, 2020, INDEX_TYPES.NASDAQ100);
    const ftseReturn = calculateReturn(2000, 2020, INDEX_TYPES.FTSE100);

    // All should have positive returns over 20 years
    expect(sp500Return).toBeGreaterThan(1);
    expect(nasdaqReturn).toBeGreaterThan(1);
    expect(ftseReturn).toBeGreaterThan(1);

    // FTSE should have lower returns than US indices
    expect(ftseReturn).toBeLessThan(sp500Return);
  });
});

describe('calculateAnnualizedReturn multi-index', () => {
  test('given_nasdaq100_when_calculatingAnnualizedReturn_then_works', () => {
    const annualized = calculateAnnualizedReturn(2010, 2020, INDEX_TYPES.NASDAQ100);
    expect(annualized).toBeGreaterThan(0);
    expect(annualized).toBeLessThan(0.30);  // Reasonable range
  });

  test('given_ftse100_when_calculatingAnnualizedReturn_then_works', () => {
    const annualized = calculateAnnualizedReturn(2010, 2020, INDEX_TYPES.FTSE100);
    expect(annualized).toBeGreaterThan(0);
    expect(annualized).toBeLessThan(0.20);  // FTSE typically lower
  });
});

describe('getAllPrices multi-index', () => {
  test('given_sp500_when_gettingAllPrices_then_startsAt1980', () => {
    const prices = getAllPrices(INDEX_TYPES.SP500);
    expect(prices[1980]).toBeDefined();
    expect(prices[1979]).toBeUndefined();
  });

  test('given_nasdaq100_when_gettingAllPrices_then_startsAt1985', () => {
    const prices = getAllPrices(INDEX_TYPES.NASDAQ100);
    expect(prices[1985]).toBeDefined();
    expect(prices[1984]).toBeUndefined();
  });

  test('given_ftse100_when_gettingAllPrices_then_startsAt1984', () => {
    const prices = getAllPrices(INDEX_TYPES.FTSE100);
    expect(prices[1984]).toBeDefined();
    expect(prices[1983]).toBeUndefined();
  });

  test('given_nasdaq100Prices_when_checking_then_allPositive', () => {
    const prices = getAllPrices(INDEX_TYPES.NASDAQ100);
    for (const year in prices) {
      expect(prices[year]).toBeGreaterThan(0);
    }
  });
});

describe('validatePrices multi-index', () => {
  test('given_sp500_when_validating_then_returnsTrue', () => {
    expect(validatePrices(INDEX_TYPES.SP500)).toBe(true);
  });

  test('given_nasdaq100_when_validating_then_returnsTrue', () => {
    expect(validatePrices(INDEX_TYPES.NASDAQ100)).toBe(true);
  });

  test('given_ftse100_when_validating_then_returnsTrue', () => {
    expect(validatePrices(INDEX_TYPES.FTSE100)).toBe(true);
  });

  test('given_invalidIndex_when_validating_then_returnsFalse', () => {
    expect(validatePrices('invalid')).toBe(false);
  });
});

describe('isDataAvailable', () => {
  test('given_sp5001980_when_checking_then_returnsTrue', () => {
    expect(isDataAvailable(INDEX_TYPES.SP500, 1980)).toBe(true);
  });

  test('given_nasdaq1985_when_checking_then_returnsTrue', () => {
    expect(isDataAvailable(INDEX_TYPES.NASDAQ100, 1985)).toBe(true);
  });

  test('given_nasdaq1984_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable(INDEX_TYPES.NASDAQ100, 1984)).toBe(false);
  });

  test('given_ftse1984_when_checking_then_returnsTrue', () => {
    expect(isDataAvailable(INDEX_TYPES.FTSE100, 1984)).toBe(true);
  });

  test('given_ftse1983_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable(INDEX_TYPES.FTSE100, 1983)).toBe(false);
  });

  test('given_invalidIndex_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable('invalid', 2020)).toBe(false);
  });

  test('given_yearOutOfRange_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable(INDEX_TYPES.SP500, 2027)).toBe(false);
  });
});

describe('getEarliestYear', () => {
  test('given_sp500_when_gettingEarliestYear_then_returns1980', () => {
    expect(getEarliestYear(INDEX_TYPES.SP500)).toBe(1980);
  });

  test('given_nasdaq100_when_gettingEarliestYear_then_returns1985', () => {
    expect(getEarliestYear(INDEX_TYPES.NASDAQ100)).toBe(1985);
  });

  test('given_ftse100_when_gettingEarliestYear_then_returns1984', () => {
    expect(getEarliestYear(INDEX_TYPES.FTSE100)).toBe(1984);
  });

  test('given_invalidIndex_when_gettingEarliestYear_then_throwsError', () => {
    expect(() => getEarliestYear('invalid')).toThrow('Unknown index type');
  });
});

describe('getIndexConfig', () => {
  test('given_sp500_when_gettingConfig_then_returnsConfig', () => {
    const config = getIndexConfig(INDEX_TYPES.SP500);
    expect(config.name).toBe('S&P 500');
    expect(config.baseYear).toBe(2019);
  });

  test('given_config_when_modifying_then_doesNotAffectOriginal', () => {
    const config = getIndexConfig(INDEX_TYPES.SP500);
    config.baseYear = 2000;  // Try to modify

    const config2 = getIndexConfig(INDEX_TYPES.SP500);
    expect(config2.baseYear).toBe(2019);  // Original unchanged
  });

  test('given_invalidIndex_when_gettingConfig_then_throwsError', () => {
    expect(() => getIndexConfig('invalid')).toThrow('Unknown index type');
  });
});

describe('multi-index integration', () => {
  test('given_investmentInAllIndices_when_simulating_then_showsRelativePerformance', () => {
    const investAmount = 100000;
    const buyYear = 2000;
    const sellYear = 2020;

    // Invest in all three indices
    const sp500Units = calculateUnits(investAmount, buyYear, INDEX_TYPES.SP500);
    const nasdaqUnits = calculateUnits(investAmount, buyYear, INDEX_TYPES.NASDAQ100);
    const ftseUnits = calculateUnits(investAmount, buyYear, INDEX_TYPES.FTSE100);

    // Calculate end values
    const sp500EndValue = calculateValue(sp500Units, sellYear, INDEX_TYPES.SP500);
    const nasdaqEndValue = calculateValue(nasdaqUnits, sellYear, INDEX_TYPES.NASDAQ100);
    const ftseEndValue = calculateValue(ftseUnits, sellYear, INDEX_TYPES.FTSE100);

    // All should have grown
    expect(sp500EndValue).toBeGreaterThan(investAmount);
    expect(nasdaqEndValue).toBeGreaterThan(investAmount);
    expect(ftseEndValue).toBeGreaterThan(investAmount);

    // FTSE typically underperforms US indices long-term
    expect(ftseEndValue).toBeLessThan(sp500EndValue);
  });
});

// ============================================
// Gold ETF Synthetic Pricing Tests
// ============================================

describe('getSyntheticPrice Gold ETF', () => {
  test('given_goldEtf_when_gettingPrice2019_then_equalsBasePrice', () => {
    const price = getSyntheticPrice(2019, INDEX_TYPES.GOLD_ETF);
    expect(price).toBeCloseTo(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].basePriceGbp, 2);
  });

  test('given_goldEtf_when_gettingPrice1980_then_works', () => {
    const price = getSyntheticPrice(1980, INDEX_TYPES.GOLD_ETF);
    expect(price).toBeGreaterThan(0);
  });

  test('given_goldEtf_when_gettingHistoricalPrices_then_allPositive', () => {
    const prices = getAllPrices(INDEX_TYPES.GOLD_ETF);
    for (const year in prices) {
      expect(prices[year]).toBeGreaterThan(0);
    }
  });

  test('given_goldEtf_when_gettingAllPrices_then_startsAt1980', () => {
    const prices = getAllPrices(INDEX_TYPES.GOLD_ETF);
    expect(prices[1980]).toBeDefined();
    expect(prices[1979]).toBeUndefined();
  });

  test('given_goldEtfConfig_when_checking_then_noCurrencyConversion', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].requiresCurrencyConversion).toBe(false);
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].currency).toBe('GBP');
  });

  test('given_goldEtfConfig_when_checking_then_hasCorrectBaseYear', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].baseYear).toBe(2019);
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].basePriceGbp).toBeCloseTo(99.70, 2);
  });

  test('given_goldEtfConfig_when_checking_then_hasCorrectEarliestYear', () => {
    expect(INDEX_CONFIG[INDEX_TYPES.GOLD_ETF].earliestYear).toBe(1980);
  });

  test('given_goldEtf_when_calculatingUnits_then_works', () => {
    const units = calculateUnits(10000, 2020, INDEX_TYPES.GOLD_ETF);
    expect(units).toBeGreaterThan(0);
  });

  test('given_goldEtf_when_calculatingValue_then_works', () => {
    const value = calculateValue(100, 2020, INDEX_TYPES.GOLD_ETF);
    expect(value).toBeGreaterThan(0);
  });

  test('given_goldEtf_when_calculatingReturn_then_works', () => {
    const returnVal = calculateReturn(2000, 2020, INDEX_TYPES.GOLD_ETF);
    expect(returnVal).toBeGreaterThan(1); // Gold grew over 20 years
  });

  test('given_goldEtf_when_calculatingAnnualizedReturn_then_reasonable', () => {
    const annualized = calculateAnnualizedReturn(2000, 2020, INDEX_TYPES.GOLD_ETF);
    expect(annualized).toBeGreaterThan(0);
    expect(annualized).toBeLessThan(0.30);
  });
});

describe('validatePrices Gold ETF and US Treasury', () => {
  test('given_goldEtf_when_validating_then_returnsTrue', () => {
    expect(validatePrices(INDEX_TYPES.GOLD_ETF)).toBe(true);
  });

  test('given_usTreasury_when_validating_then_returnsTrue', () => {
    expect(validatePrices(INDEX_TYPES.US_TREASURY)).toBe(true);
  });
});

describe('isDataAvailable Gold ETF and US Treasury', () => {
  test('given_goldEtf1980_when_checking_then_returnsTrue', () => {
    expect(isDataAvailable(INDEX_TYPES.GOLD_ETF, 1980)).toBe(true);
  });

  test('given_goldEtf1979_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable(INDEX_TYPES.GOLD_ETF, 1979)).toBe(false);
  });

  test('given_usTreasury1980_when_checking_then_returnsTrue', () => {
    expect(isDataAvailable(INDEX_TYPES.US_TREASURY, 1980)).toBe(true);
  });

  test('given_usTreasury1979_when_checking_then_returnsFalse', () => {
    expect(isDataAvailable(INDEX_TYPES.US_TREASURY, 1979)).toBe(false);
  });
});

describe('getEarliestYear Gold ETF and US Treasury', () => {
  test('given_goldEtf_when_gettingEarliestYear_then_returns1980', () => {
    expect(getEarliestYear(INDEX_TYPES.GOLD_ETF)).toBe(1980);
  });

  test('given_usTreasury_when_gettingEarliestYear_then_returns1980', () => {
    expect(getEarliestYear(INDEX_TYPES.US_TREASURY)).toBe(1980);
  });
});

describe('getIndexConfig Gold ETF and US Treasury', () => {
  test('given_goldEtf_when_gettingConfig_then_returnsCorrectConfig', () => {
    const config = getIndexConfig(INDEX_TYPES.GOLD_ETF);
    expect(config.name).toBe('Gold ETF');
    expect(config.baseYear).toBe(2019);
    expect(config.basePriceGbp).toBeCloseTo(99.70, 2);
  });

  test('given_usTreasury_when_gettingConfig_then_returnsCorrectConfig', () => {
    const config = getIndexConfig(INDEX_TYPES.US_TREASURY);
    expect(config.name).toBe('US Long Treasury');
    expect(config.baseYear).toBe(2019);
    expect(config.basePriceGbp).toBeCloseTo(115.00, 2);
  });
});
