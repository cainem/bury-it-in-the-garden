/**
 * Strategy Registry Tests
 */

import { describe, it, expect } from 'vitest';
import {
  STRATEGY_TYPES,
  BASE_STRATEGIES,
  COMBINATION_STRATEGIES,
  ALL_STRATEGIES,
  getStrategy,
  getBaseStrategies,
  getCombinationStrategies,
  getAllStrategies,
  getStrategiesByType,
  isStrategyAvailableForYear,
  getStrategyEarliestYear,
  getStrategiesAvailableForYear,
  canCompareStrategies,
  getComponentStrategies,
  isCombinedStrategy,
  getDefaultStrategies,
  getStrategiesGroupedForDisplay
} from '../../src/calculators/strategyRegistry.js';

describe('STRATEGY_TYPES', () => {
  test('given_strategyTypes_when_checking_then_hasAllTypes', () => {
    expect(STRATEGY_TYPES.GOLD).toBe('gold');
    expect(STRATEGY_TYPES.SIPP).toBe('sipp');
    expect(STRATEGY_TYPES.COMBINED).toBe('combined');
  });
});

describe('BASE_STRATEGIES', () => {
  test('given_baseStrategies_when_counting_then_has6Strategies', () => {
    expect(Object.keys(BASE_STRATEGIES)).toHaveLength(6);
  });

  test('given_baseStrategies_when_checking_then_hasRequiredIds', () => {
    expect(BASE_STRATEGIES.gold).toBeDefined();
    expect(BASE_STRATEGIES.sp500).toBeDefined();
    expect(BASE_STRATEGIES.nasdaq100).toBeDefined();
    expect(BASE_STRATEGIES.ftse100).toBeDefined();
  });

  test('given_goldStrategy_when_checking_then_hasCorrectProperties', () => {
    const gold = BASE_STRATEGIES.gold;
    expect(gold.id).toBe('gold');
    expect(gold.type).toBe(STRATEGY_TYPES.GOLD);
    expect(gold.earliestYear).toBe(1980);
    expect(gold.requiresCurrencyConversion).toBe(false);
    expect(gold.taxEvents.onAnnualWithdrawal).toBe(false);
  });

  test('given_sp500Strategy_when_checking_then_hasCorrectProperties', () => {
    const sp500 = BASE_STRATEGIES.sp500;
    expect(sp500.id).toBe('sp500');
    expect(sp500.type).toBe(STRATEGY_TYPES.SIPP);
    expect(sp500.earliestYear).toBe(1980);
    expect(sp500.requiresCurrencyConversion).toBe(true);
    expect(sp500.taxEvents.onAnnualWithdrawal).toBe(true);
  });

  test('given_nasdaq100Strategy_when_checking_then_hasCorrectEarliestYear', () => {
    const nasdaq = BASE_STRATEGIES.nasdaq100;
    expect(nasdaq.earliestYear).toBe(1985);
  });

  test('given_ftse100Strategy_when_checking_then_hasCorrectEarliestYear', () => {
    const ftse = BASE_STRATEGIES.ftse100;
    expect(ftse.earliestYear).toBe(1984);
    expect(ftse.requiresCurrencyConversion).toBe(false);
  });

  test('given_allBaseStrategies_when_checking_then_haveRequiredFields', () => {
    Object.values(BASE_STRATEGIES).forEach(strategy => {
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.shortName).toBeDefined();
      expect(strategy.type).toBeDefined();
      expect(strategy.description).toBeDefined();
      expect(strategy.earliestYear).toBeDefined();
      expect(typeof strategy.earliestYear).toBe('number');
    });
  });
});

describe('COMBINATION_STRATEGIES', () => {
  test('given_combinationStrategies_when_counting_then_has15Strategies', () => {
    expect(Object.keys(COMBINATION_STRATEGIES)).toHaveLength(15);
  });

  test('given_combinationStrategies_when_checking_then_hasRequiredIds', () => {
    expect(COMBINATION_STRATEGIES['gold-sp500']).toBeDefined();
    expect(COMBINATION_STRATEGIES['gold-nasdaq100']).toBeDefined();
    expect(COMBINATION_STRATEGIES['gold-ftse100']).toBeDefined();
    expect(COMBINATION_STRATEGIES['sp500-nasdaq100']).toBeDefined();
    expect(COMBINATION_STRATEGIES['sp500-ftse100']).toBeDefined();
    expect(COMBINATION_STRATEGIES['nasdaq100-ftse100']).toBeDefined();
  });

  test('given_goldSp500Combo_when_checking_then_hasCorrectComponents', () => {
    const combo = COMBINATION_STRATEGIES['gold-sp500'];
    expect(combo.components).toEqual(['gold', 'sp500']);
    expect(combo.splitRatio).toEqual([0.5, 0.5]);
    expect(combo.earliestYear).toBe(1980);
  });

  test('given_goldNasdaq100Combo_when_checking_then_hasNasdaqConstraint', () => {
    const combo = COMBINATION_STRATEGIES['gold-nasdaq100'];
    expect(combo.earliestYear).toBe(1985);
  });

  test('given_allCombinationStrategies_when_checking_then_areCombinedType', () => {
    Object.values(COMBINATION_STRATEGIES).forEach(strategy => {
      expect(strategy.type).toBe(STRATEGY_TYPES.COMBINED);
      expect(strategy.components).toHaveLength(2);
      expect(strategy.splitRatio).toEqual([0.5, 0.5]);
    });
  });
});

describe('ALL_STRATEGIES', () => {
  test('given_allStrategies_when_counting_then_has21Total', () => {
    expect(Object.keys(ALL_STRATEGIES)).toHaveLength(21);
  });
});

describe('getStrategy', () => {
  test('given_validId_when_gettingStrategy_then_returnsStrategy', () => {
    const gold = getStrategy('gold');
    expect(gold.id).toBe('gold');
    expect(gold.name).toBe('Physical Gold - Outside Pension');
  });

  test('given_combinedId_when_gettingStrategy_then_returnsStrategy', () => {
    const combo = getStrategy('gold-sp500');
    expect(combo.type).toBe(STRATEGY_TYPES.COMBINED);
  });

  test('given_invalidId_when_gettingStrategy_then_throwsError', () => {
    expect(() => getStrategy('invalid')).toThrow("Strategy 'invalid' not found");
  });

  test('given_invalidId_when_gettingStrategy_then_listsAvailableStrategies', () => {
    expect(() => getStrategy('invalid')).toThrow('Available:');
  });
});

describe('getBaseStrategies', () => {
  test('given_registry_when_gettingBaseStrategies_then_returns6', () => {
    const strategies = getBaseStrategies();
    expect(strategies).toHaveLength(6);
  });

  test('given_registry_when_gettingBaseStrategies_then_excludesCombined', () => {
    const strategies = getBaseStrategies();
    strategies.forEach(s => {
      expect(s.type).not.toBe(STRATEGY_TYPES.COMBINED);
    });
  });
});

describe('getCombinationStrategies', () => {
  test('given_registry_when_gettingCombinationStrategies_then_returns15', () => {
    const strategies = getCombinationStrategies();
    expect(strategies).toHaveLength(15);
  });

  test('given_registry_when_gettingCombinationStrategies_then_allAreCombined', () => {
    const strategies = getCombinationStrategies();
    strategies.forEach(s => {
      expect(s.type).toBe(STRATEGY_TYPES.COMBINED);
    });
  });
});

describe('getAllStrategies', () => {
  test('given_registry_when_gettingAllStrategies_then_returns21', () => {
    const strategies = getAllStrategies();
    expect(strategies).toHaveLength(21);
  });
});

describe('getStrategiesByType', () => {
  test('given_goldType_when_filtering_then_returns1', () => {
    const strategies = getStrategiesByType(STRATEGY_TYPES.GOLD);
    expect(strategies).toHaveLength(1);
    expect(strategies[0].id).toBe('gold');
  });

  test('given_sippType_when_filtering_then_returns5', () => {
    const strategies = getStrategiesByType(STRATEGY_TYPES.SIPP);
    expect(strategies).toHaveLength(5);
  });

  test('given_combinedType_when_filtering_then_returns15', () => {
    const strategies = getStrategiesByType(STRATEGY_TYPES.COMBINED);
    expect(strategies).toHaveLength(15);
  });
});

describe('isStrategyAvailableForYear', () => {
  test('given_gold1980_when_checking_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('gold', 1980)).toBe(true);
  });

  test('given_nasdaq1985_when_checking_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('nasdaq100', 1985)).toBe(true);
  });

  test('given_nasdaq1984_when_checking_then_returnsFalse', () => {
    expect(isStrategyAvailableForYear('nasdaq100', 1984)).toBe(false);
  });

  test('given_ftse1984_when_checking_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('ftse100', 1984)).toBe(true);
  });

  test('given_ftse1983_when_checking_then_returnsFalse', () => {
    expect(isStrategyAvailableForYear('ftse100', 1983)).toBe(false);
  });

  test('given_goldNasdaq1985_when_checking_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('gold-nasdaq100', 1985)).toBe(true);
  });

  test('given_goldNasdaq1984_when_checking_then_returnsFalse', () => {
    expect(isStrategyAvailableForYear('gold-nasdaq100', 1984)).toBe(false);
  });
});

describe('getStrategyEarliestYear', () => {
  test('given_gold_when_gettingEarliestYear_then_returns1980', () => {
    expect(getStrategyEarliestYear('gold')).toBe(1980);
  });

  test('given_nasdaq100_when_gettingEarliestYear_then_returns1985', () => {
    expect(getStrategyEarliestYear('nasdaq100')).toBe(1985);
  });

  test('given_ftse100_when_gettingEarliestYear_then_returns1984', () => {
    expect(getStrategyEarliestYear('ftse100')).toBe(1984);
  });
});

describe('getStrategiesAvailableForYear', () => {
  test('given_year1980_when_gettingAvailable_then_excludesNasdaqAndFtse', () => {
    const strategies = getStrategiesAvailableForYear(1980);
    const ids = strategies.map(s => s.id);
    expect(ids).toContain('gold');
    expect(ids).toContain('sp500');
    expect(ids).toContain('gold-sp500');
    expect(ids).not.toContain('nasdaq100');
    expect(ids).not.toContain('ftse100');
  });

  test('given_year1985_when_gettingAvailable_then_includesAll', () => {
    const strategies = getStrategiesAvailableForYear(1985);
    expect(strategies).toHaveLength(21);
  });

  test('given_year2000_when_gettingAvailable_then_includesAll', () => {
    const strategies = getStrategiesAvailableForYear(2000);
    expect(strategies).toHaveLength(21);
  });
});

describe('canCompareStrategies', () => {
  test('given_sameStrategy_when_comparing_then_returnsInvalid', () => {
    const result = canCompareStrategies('gold', 'gold');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('itself');
  });

  test('given_goldAndSp500_when_comparing_then_returnsValid', () => {
    const result = canCompareStrategies('gold', 'sp500');
    expect(result.valid).toBe(true);
    expect(result.earliestCommonYear).toBe(1980);
  });

  test('given_goldAndNasdaq_when_comparing_then_returns1985AsEarliest', () => {
    const result = canCompareStrategies('gold', 'nasdaq100');
    expect(result.valid).toBe(true);
    expect(result.earliestCommonYear).toBe(1985);
  });

  test('given_ftseAndNasdaq_when_comparing_then_returns1985AsEarliest', () => {
    const result = canCompareStrategies('ftse100', 'nasdaq100');
    expect(result.valid).toBe(true);
    expect(result.earliestCommonYear).toBe(1985);
  });
});

describe('getComponentStrategies', () => {
  test('given_combinedStrategy_when_gettingComponents_then_returnsBoth', () => {
    const components = getComponentStrategies('gold-sp500');
    expect(components).toHaveLength(2);
    expect(components[0].id).toBe('gold');
    expect(components[1].id).toBe('sp500');
  });

  test('given_baseStrategy_when_gettingComponents_then_throwsError', () => {
    expect(() => getComponentStrategies('gold')).toThrow('not a combined strategy');
  });
});

describe('isCombinedStrategy', () => {
  test('given_baseStrategy_when_checking_then_returnsFalse', () => {
    expect(isCombinedStrategy('gold')).toBe(false);
    expect(isCombinedStrategy('sp500')).toBe(false);
  });

  test('given_combinedStrategy_when_checking_then_returnsTrue', () => {
    expect(isCombinedStrategy('gold-sp500')).toBe(true);
    expect(isCombinedStrategy('nasdaq100-ftse100')).toBe(true);
  });
});

describe('getDefaultStrategies', () => {
  test('given_registry_when_gettingDefaults_then_returnsGoldAndSp500', () => {
    const defaults = getDefaultStrategies();
    expect(defaults.strategy1).toBe('gold');
    expect(defaults.strategy2).toBe('sp500');
  });
});

describe('getStrategiesGroupedForDisplay', () => {
  test('given_registry_when_grouping_then_hasTwoGroups', () => {
    const grouped = getStrategiesGroupedForDisplay();
    expect(grouped.base).toBeDefined();
    expect(grouped.combined).toBeDefined();
  });

  test('given_registry_when_grouping_then_baseHas6', () => {
    const grouped = getStrategiesGroupedForDisplay();
    expect(grouped.base.strategies).toHaveLength(6);
    expect(grouped.base.label).toBe('Base Strategies');
  });

  test('given_registry_when_grouping_then_combinedHas15', () => {
    const grouped = getStrategiesGroupedForDisplay();
    expect(grouped.combined.strategies).toHaveLength(15);
    expect(grouped.combined.label).toBe('Combined (50/50)');
  });
});

// ============================================
// Phase 8: Strategy Registry Gaps
// ============================================

describe('canCompareStrategies edge cases', () => {
  test('given_invalidStrategyId_when_comparing_then_throwsError', () => {
    expect(() => canCompareStrategies('gold', 'nonexistent')).toThrow();
  });

  test('given_bothInvalidIds_when_comparing_then_throwsError', () => {
    expect(() => canCompareStrategies('fake1', 'fake2')).toThrow();
  });

  test('given_goldEtfAndSp500_when_comparing_then_returnsValid', () => {
    const result = canCompareStrategies('goldEtf', 'sp500');
    expect(result.valid).toBe(true);
    expect(result.earliestCommonYear).toBe(1980);
  });

  test('given_usTreasuryAndNasdaq_when_comparing_then_returns1985', () => {
    const result = canCompareStrategies('usTreasury', 'nasdaq100');
    expect(result.valid).toBe(true);
    expect(result.earliestCommonYear).toBe(1985);
  });
});

describe('getStrategiesAvailableForYear edge cases', () => {
  test('given_year1984_when_gettingAvailable_then_includesFtseButNotNasdaq', () => {
    const strategies = getStrategiesAvailableForYear(1984);
    const ids = strategies.map(s => s.id);
    expect(ids).toContain('ftse100');
    expect(ids).not.toContain('nasdaq100');
    // Gold ETF and US Treasury start at 1980, should be included
    expect(ids).toContain('goldEtf');
    expect(ids).toContain('usTreasury');
  });
});

describe('Gold ETF and US Treasury strategy properties', () => {
  test('given_goldEtf_when_gettingStrategy_then_hasCorrectProperties', () => {
    const strategy = getStrategy('goldEtf');
    expect(strategy.id).toBe('goldEtf');
    expect(strategy.type).toBe(STRATEGY_TYPES.SIPP);
    expect(strategy.earliestYear).toBe(1980);
    expect(strategy.name).toBeDefined();
    expect(strategy.shortName).toBeDefined();
  });

  test('given_usTreasury_when_gettingStrategy_then_hasCorrectProperties', () => {
    const strategy = getStrategy('usTreasury');
    expect(strategy.id).toBe('usTreasury');
    expect(strategy.type).toBe(STRATEGY_TYPES.SIPP);
    expect(strategy.earliestYear).toBe(1980);
    expect(strategy.name).toBeDefined();
    expect(strategy.shortName).toBeDefined();
  });

  test('given_goldEtf_when_checkingAvailabilityFor1980_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('goldEtf', 1980)).toBe(true);
  });

  test('given_usTreasury_when_checkingAvailabilityFor1980_then_returnsTrue', () => {
    expect(isStrategyAvailableForYear('usTreasury', 1980)).toBe(true);
  });

  test('given_goldEtf_when_gettingEarliestYear_then_returns1980', () => {
    expect(getStrategyEarliestYear('goldEtf')).toBe(1980);
  });

  test('given_usTreasury_when_gettingEarliestYear_then_returns1980', () => {
    expect(getStrategyEarliestYear('usTreasury')).toBe(1980);
  });
});
