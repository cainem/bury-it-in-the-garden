/**
 * UK CPI Data Tests
 */

import { describe, test, expect } from 'vitest';
import {
  ukCpiIndex,
  ukInflationRates,
  getInflationMultiplier,
  adjustForInflation,
  getInflationRate
} from '../../src/data/ukCpi.js';

describe('ukCpi data', () => {
  test('given_cpiData_when_checkingStructure_then_containsExpectedYears', () => {
    expect(ukCpiIndex[1980]).toBe(100.00);
    expect(ukCpiIndex[2024]).toBeGreaterThan(500); // Cumulative inflation since 1980
  });

  test('given_multiplier_when_yearsAreSame_then_returnsOne', () => {
    expect(getInflationMultiplier(2000, 2000)).toBe(1);
  });

  test('given_multiplier_when_forwardInTime_then_returnsGreaterThanOne', () => {
    expect(getInflationMultiplier(2000, 2010)).toBeGreaterThan(1);
  });

  test('given_adjustForInflation_when_called_then_calculatesCorrectAmount', () => {
    const amount = 1000;
    const startYear = 1980;
    const targetYear = 1981;
    // 1980 inflation was 18.0%
    const expected = 1180;
    expect(adjustForInflation(amount, startYear, targetYear)).toBeCloseTo(expected, 0);
  });

  test('given_invalidYear_when_called_then_throwsError', () => {
    expect(() => getInflationMultiplier(1979, 2020)).toThrow();
    expect(() => getInflationMultiplier(2020, 2027)).toThrow();
  });
});

// ============================================
// Phase 5: Expanded ukCpi Tests
// ============================================

describe('ukCpi self-consistency', () => {
  test('given_cpiIndexAndInflationRates_when_checking_then_indexFollowsRates', () => {
    // Verify index[n+1] ≈ index[n] * (1 + rate[n]/100) for all years
    for (let year = 1980; year <= 2025; year++) {
      const expected = ukCpiIndex[year] * (1 + ukInflationRates[year] / 100);
      const actual = ukCpiIndex[year + 1];
      expect(actual).toBeCloseTo(expected, 0);
    }
  });
});

describe('getInflationRate', () => {
  test('given_knownYear2022_when_gettingRate_then_returns9point1', () => {
    expect(getInflationRate(2022)).toBe(9.1);
  });

  test('given_knownYear1980_when_gettingRate_then_returns18', () => {
    expect(getInflationRate(1980)).toBe(18.0);
  });

  test('given_knownYear2015_when_gettingRate_then_returnsZero', () => {
    expect(getInflationRate(2015)).toBe(0.0);
  });

  test('given_invalidYear_when_gettingRate_then_throwsError', () => {
    expect(() => getInflationRate(1979)).toThrow('not available');
    expect(() => getInflationRate(2027)).toThrow('not available');
  });
});

describe('getInflationMultiplier backward adjustment', () => {
  test('given_backwardAdjustment_when_targetBeforeStart_then_returnsLessThanOne', () => {
    const multiplier = getInflationMultiplier(2020, 2000);
    expect(multiplier).toBeLessThan(1);
    expect(multiplier).toBeGreaterThan(0);
  });

  test('given_backwardAdjustment_when_reversing_then_isReciprocalOfForward', () => {
    const forward = getInflationMultiplier(2000, 2020);
    const backward = getInflationMultiplier(2020, 2000);
    expect(forward * backward).toBeCloseTo(1, 6);
  });
});

describe('ukCpi boundary years', () => {
  test('given_year1980_when_checkingCpiIndex_then_isBaseYear100', () => {
    expect(ukCpiIndex[1980]).toBe(100.00);
  });

  test('given_year2026_when_checkingCpiIndex_then_exists', () => {
    expect(ukCpiIndex[2026]).toBeDefined();
    expect(ukCpiIndex[2026]).toBeGreaterThan(0);
  });

  test('given_year1980_when_gettingInflationRate_then_exists', () => {
    expect(ukInflationRates[1980]).toBeDefined();
  });

  test('given_year2026_when_gettingInflationRate_then_exists', () => {
    expect(ukInflationRates[2026]).toBeDefined();
  });
});

describe('adjustForInflation edge cases', () => {
  test('given_sameYear_when_adjusting_then_returnsOriginalAmount', () => {
    expect(adjustForInflation(10000, 2010, 2010)).toBe(10000);
  });

  test('given_zeroAmount_when_adjusting_then_returnsZero', () => {
    expect(adjustForInflation(0, 2000, 2020)).toBe(0);
  });
});

describe('ukCpi data completeness', () => {
  test('given_allYears1980to2026_when_checkingInflationRates_then_allPresent', () => {
    for (let year = 1980; year <= 2026; year++) {
      expect(ukInflationRates[year]).toBeDefined();
    }
  });

  test('given_allYears1980to2026_when_checkingCpiIndex_then_allPresent', () => {
    for (let year = 1980; year <= 2026; year++) {
      expect(ukCpiIndex[year]).toBeDefined();
      expect(ukCpiIndex[year]).toBeGreaterThan(0);
    }
  });
});
