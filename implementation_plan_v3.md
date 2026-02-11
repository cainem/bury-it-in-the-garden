# Implementation Plan v3.0
## Code Review Fixes: Accuracy, Bugs & Test Coverage

**Version:** 3.0  
**Date:** February 11, 2026  
**Status:** Planned  
**Origin:** Full code review identifying accuracy bugs, calculator issues, and test gaps

---

## Phase 1: Data Accuracy Fixes
> Fix incorrect historical data that affects calculation accuracy

- [ ] **1.1** Fix 1997 basic rate in `src/data/ukTaxData.js` — change `basicRate: 0.24` → `0.23` (line ~184)
- [ ] **1.2** Fix misleading header comments in `src/data/ukTaxData.js` — correct the historical notes about when rate changes occurred (lines 11-16)
- [ ] **1.3** Add 1980s simplification comment in `src/data/ukTaxData.js` — document that 1980-1987 uses a flat 60% higher rate as a simplification of the actual multi-band system

---

## Phase 2: Calculator Bug Fixes
> Fix logic bugs in calculator modules

- [ ] **2.1** Fix `fullWithdrawalYears` in `src/calculators/goldStrategy.js` — compare against actual (inflation-adjusted) withdrawal amount per year, not the static `targetWithdrawal`
- [ ] **2.2** Fix `fullWithdrawalYears` in `src/calculators/sippStrategy.js` — same fix as 2.1
- [ ] **2.3** Fix misleading `grossWithdrawal` field in `src/calculators/comparisonEngine.js` — combined strategy's `combinedWithdrawal` is net, not gross; rename or split into separate fields

---

## Phase 3: Critical Test Gaps — Inflation-Adjusted Withdrawals
> The default code path (`adjustForInflation: true`) has ZERO test coverage

- [ ] **3.1** Add inflation-adjusted gold strategy tests in `tests/calculators/goldStrategy.test.js` — test withdrawals grow with CPI; verify year-2 > year-1; verify depletion happens sooner with inflation
- [ ] **3.2** Add inflation-adjusted SIPP strategy tests in `tests/calculators/sippStrategy.test.js` — test CPI-adjusted gross withdrawals; verify `grossWithdrawal` increases year-over-year
- [ ] **3.3** Add inflation-adjusted combined strategy tests in `tests/calculators/combinedStrategy.test.js` — verify inflation flows through to both halves
- [ ] **3.4** Add inflation-adjusted comparison tests in `tests/calculators/comparisonEngine.test.js` — verify `compareStrategies` and `compareAnyStrategies` work with inflation on/off

---

## Phase 4: Missing Strategy Tests — Gold ETF & US Treasury
> Exported functions with zero test coverage

- [ ] **4.1** Add Gold ETF SIPP strategy tests in `tests/calculators/sippStrategy.test.js` — initial investment, yearly results, summary, depletion
- [ ] **4.2** Add US Treasury SIPP strategy tests in `tests/calculators/sippStrategy.test.js` — initial investment, yearly results, summary
- [ ] **4.3** Add Gold ETF synthetic pricing tests in `tests/calculators/syntheticEtf.test.js` — base year calibration, historical prices, `validatePrices`
- [ ] **4.4** Add US Treasury `validatePrices` test in `tests/calculators/syntheticEtf.test.js`
- [ ] **4.5** Add Gold ETF combination strategy tests in `tests/calculators/combinedStrategy.test.js` — `gold-goldEtf`, `goldEtf-sp500`, `goldEtf-nasdaq100`, `goldEtf-ftse100`
- [ ] **4.6** Add US Treasury combination strategy tests in `tests/calculators/combinedStrategy.test.js` — `gold-usTreasury`, `sp500-usTreasury`, etc.
- [ ] **4.7** Add Gold ETF / US Treasury comparison tests in `tests/calculators/comparisonEngine.test.js`

---

## Phase 5: Expand ukCpi Tests
> Only 5 tests for a module that powers the default inflation logic

- [ ] **5.1** Add self-consistency test in `tests/data/ukCpi.test.js` — verify `index[n+1] ≈ index[n] * (1 + rate[n]/100)` for all years
- [ ] **5.2** Add `getInflationRate()` tests — known values, error on invalid year
- [ ] **5.3** Add backward adjustment test — `getInflationMultiplier(2020, 2000)` should return < 1
- [ ] **5.4** Add boundary year tests — years 1980 and 2026 explicitly
- [ ] **5.5** Add `adjustForInflation` same-year test — should return original amount
- [ ] **5.6** Add data completeness test — every year 1980-2026 has both inflation rate and CPI index entry

---

## Phase 6: 1980s Tax Regime Tests
> Tax years 1980-1987 (30% basic / 60% higher) have zero test coverage

- [ ] **6.1** Add 1980 basic rate (30%) test in `tests/calculators/taxCalculator.test.js`
- [ ] **6.2** Add 1980 higher rate (60%) test
- [ ] **6.3** Add 1986 transitional rate (29%) test
- [ ] **6.4** Add 1988 Lawson reform test (25% basic / 40% higher)
- [ ] **6.5** Add 1980s pension withdrawal test — verify 25% tax-free with 30%/60% era
- [ ] **6.6** Add 1997 tax test — verify fix from Phase 1 (23% basic rate)

---

## Phase 7: Additional Tax Calculator Edge Cases
> Boundary conditions and edge cases not currently tested

- [ ] **7.1** Test income at exactly £100,001 — taper threshold + £1
- [ ] **7.2** Test very large income (£500k+) — all bands including fully tapered PA
- [ ] **7.3** Test `getMarginalTaxRate` in taper zone — £100k-£125k effective 60% zone
- [ ] **7.4** Test year 2026 — latest data year
- [ ] **7.5** Test NaN input — verify error handling

---

## Phase 8: Comparison Engine & Strategy Registry Gaps

- [ ] **8.1** Test configurable fees in `compareStrategies` in `tests/calculators/comparisonEngine.test.js`
- [ ] **8.2** Test configurable fees in `compareAnyStrategies`
- [ ] **8.3** Test `canCompareStrategies` with invalid IDs in `tests/calculators/strategyRegistry.test.js`
- [ ] **8.4** Test `getStrategiesAvailableForYear(1984)` — should include FTSE but not Nasdaq
- [ ] **8.5** Test Gold ETF & US Treasury strategy properties — `earliestYear`, `requiresCurrencyConversion`, etc.

---

## Phase 9: Cosmetic / Consistency Fixes

- [ ] **9.1** Fix stale test name "2PercentCost" in `tests/calculators/goldStrategy.test.js` — rename to reflect 3% default
- [ ] **9.2** Normalize `it()` → `test()` in `tests/calculators/strategyRegistry.test.js` and `tests/data/ukCpi.test.js`

---

## Execution Order & Dependencies

```
Phase 1 (data fixes) ──► Phase 6 (1980s tax tests, 1997 test)
                    └──► Phase 7 (tax edge cases)

Phase 2 (calculator fixes) ──► Phase 3 (inflation tests validate the fixes)

Phase 4 (new strategy tests) ── independent
Phase 5 (ukCpi tests) ── independent
Phase 8 (comparison/registry gaps) ── independent
Phase 9 (cosmetic) ── independent, do last
```

**Phases 1 & 2** must be done first (bug fixes that later tests validate).  
**Phase 3** is the highest-value test addition (covers the default code path).  
**Phases 4-8** are independent and can be done in any order.  
**Phase 9** is cleanup — do last.

---

## Estimated Scope

- ~3 source file edits (data fix + 2 calculator fixes)
- ~8 test file edits
- ~80-100 new tests
- **Baseline:** 682 tests passing, 89.3% statement coverage
