/**
 * Backtest Application
 *
 * Compares two strategies across all possible starting years for a given period length.
 * Shows a table of results and summary statistics.
 *
 * @module backtestApp
 */

import { compareAnyStrategies } from './calculators/comparisonEngine.js';
import {
  BASE_STRATEGIES,
  COMBINATION_STRATEGIES,
  getStrategy
} from './calculators/strategyRegistry.js';
import { DEFAULTS, YEAR_RANGE } from './config/defaults.js';
import { formatCurrency } from './utils/formatters.js';

/**
 * Initialize the backtest application
 */
export function initBacktestApp() {
  populateStrategyDropdowns();
  setupStrategyChangeHandlers();
  setupFormHandler();
  setDefaultValues();

  // Auto-run with defaults
  runBacktest();

  console.log('Backtest page initialized');
}

/**
 * Populate both strategy dropdowns with grouped options
 */
function populateStrategyDropdowns() {
  const strategy1Select = document.getElementById('strategy-1');
  const strategy2Select = document.getElementById('strategy-2');

  if (!strategy1Select || !strategy2Select) return;

  const optionsHtml = buildStrategyOptionsHtml();

  strategy1Select.innerHTML = optionsHtml;
  strategy2Select.innerHTML = optionsHtml;

  strategy1Select.value = 'gold';
  strategy2Select.value = 'sp500';
}

/**
 * Build HTML for strategy dropdown options with optgroups
 * @returns {string} HTML string for options
 */
function buildStrategyOptionsHtml() {
  let html = '';

  html += '<optgroup label="Base Strategies">';
  Object.values(BASE_STRATEGIES).forEach(strategy => {
    html += `<option value="${strategy.id}">${strategy.name}</option>`;
  });
  html += '</optgroup>';

  html += '<optgroup label="Combined (50/50)">';
  Object.values(COMBINATION_STRATEGIES).forEach(strategy => {
    html += `<option value="${strategy.id}">${strategy.name}</option>`;
  });
  html += '</optgroup>';

  return html;
}

/**
 * Set up handlers for strategy selection changes
 */
function setupStrategyChangeHandlers() {
  const strategy1Select = document.getElementById('strategy-1');
  const strategy2Select = document.getElementById('strategy-2');

  if (!strategy1Select || !strategy2Select) return;

  const handleChange = () => {
    updatePeriodConstraints();
    highlightDuplicateStrategies();
  };

  strategy1Select.addEventListener('change', handleChange);
  strategy2Select.addEventListener('change', handleChange);

  handleChange();
}

/**
 * Update period length constraints based on selected strategies
 */
function updatePeriodConstraints() {
  const strategy1Id = document.getElementById('strategy-1')?.value;
  const strategy2Id = document.getElementById('strategy-2')?.value;
  const periodInput = document.getElementById('period-length');

  if (!strategy1Id || !strategy2Id || !periodInput) return;

  const strategy1 = getStrategy(strategy1Id);
  const strategy2 = getStrategy(strategy2Id);
  const earliestYear = Math.max(strategy1.earliestYear, strategy2.earliestYear);

  // Max period is (latest year - earliest year + 1)
  const maxPeriod = YEAR_RANGE.max - earliestYear + 1;
  periodInput.max = Math.min(maxPeriod, 30);

  if (parseInt(periodInput.value, 10) > maxPeriod) {
    periodInput.value = Math.min(maxPeriod, 30);
  }
}

/**
 * Highlight if same strategy is selected for both dropdowns
 */
function highlightDuplicateStrategies() {
  const strategy1Select = document.getElementById('strategy-1');
  const strategy2Select = document.getElementById('strategy-2');

  if (!strategy1Select || !strategy2Select) return;

  const isDuplicate = strategy1Select.value === strategy2Select.value;
  strategy1Select.classList.toggle('input-warning', isDuplicate);
  strategy2Select.classList.toggle('input-warning', isDuplicate);
}

/**
 * Set default form values
 */
function setDefaultValues() {
  const pensionInput = document.getElementById('pension-amount');
  const withdrawalInput = document.getElementById('withdrawal-rate');
  const periodInput = document.getElementById('period-length');

  if (pensionInput) pensionInput.value = DEFAULTS.pensionAmount;
  if (withdrawalInput) withdrawalInput.value = DEFAULTS.withdrawalRate;
  if (periodInput) periodInput.value = 15;
}

/**
 * Set up form submission handler
 */
function setupFormHandler() {
  const form = document.getElementById('backtest-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const validation = validateInputs();
    if (!validation.valid) {
      showError(validation.errors.join('. '));
      return;
    }

    clearError();
    runBacktest();
  });
}

/**
 * Extract form inputs
 * @returns {Object} Form inputs
 */
function getFormInputs() {
  return {
    strategy1: document.getElementById('strategy-1')?.value,
    strategy2: document.getElementById('strategy-2')?.value,
    pensionAmount: parseFloat(document.getElementById('pension-amount')?.value),
    withdrawalRate: parseFloat(document.getElementById('withdrawal-rate')?.value),
    periodLength: parseInt(document.getElementById('period-length')?.value, 10)
  };
}

/**
 * Validate backtest inputs
 * @param {Object} inputs - Backtest inputs to validate
 * @param {string} inputs.strategy1 - Strategy 1 ID
 * @param {string} inputs.strategy2 - Strategy 2 ID
 * @param {number} inputs.pensionAmount - Pension amount
 * @param {number} inputs.withdrawalRate - Withdrawal rate
 * @param {number} inputs.periodLength - Period length in years
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateBacktestInputs(inputs) {
  const errors = [];

  if (!inputs.strategy1 || !inputs.strategy2) {
    errors.push('Please select both strategies');
  }

  if (inputs.strategy1 === inputs.strategy2) {
    errors.push('Please select two different strategies');
  }

  if (!inputs.pensionAmount || inputs.pensionAmount < 10000) {
    errors.push('Pension amount must be at least £10,000');
  }

  if (!inputs.withdrawalRate || inputs.withdrawalRate < 1 || inputs.withdrawalRate > 10) {
    errors.push('Withdrawal rate must be between 1% and 10%');
  }

  if (!inputs.periodLength || inputs.periodLength < 5 || inputs.periodLength > 30) {
    errors.push('Period length must be between 5 and 30 years');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @private
 */
function validateInputs() {
  const inputs = getFormInputs();
  return validateBacktestInputs(inputs);
}

/**
 * Run the backtest across all possible starting years
 */
function runBacktest() {
  const inputs = getFormInputs();

  const backtestResult = calculateBacktestResults(
    inputs.strategy1,
    inputs.strategy2,
    inputs.pensionAmount,
    inputs.withdrawalRate,
    inputs.periodLength
  );

  if (backtestResult.error) {
    showError(backtestResult.error);
    return;
  }

  const { results, strategy1, strategy2 } = backtestResult;

  // Update table headers
  document.getElementById('strategy1-header').textContent = strategy1.shortName;
  document.getElementById('strategy2-header').textContent = strategy2.shortName;

  renderBacktestTable(results, strategy1, strategy2);
  renderBacktestSummary(results, strategy1, strategy2, inputs);
  showResultsSection();

  // Track in analytics
  if (typeof gtag === 'function') {
    gtag('event', 'run_backtest', {
      'strategy_1': inputs.strategy1,
      'strategy_2': inputs.strategy2,
      'period_length': inputs.periodLength,
      'pension_amount': inputs.pensionAmount,
      'withdrawal_rate': inputs.withdrawalRate,
      'total_periods': results.length
    });
  }
}

/**
 * Format the outcome for a strategy in a backtest row
 * @param {Object} metrics - Strategy metrics from comparison
 * @returns {Object} Formatted outcome with text, CSS class, and numeric value
 */
export function formatStrategyOutcome(metrics) {
  if (!metrics.strategySuccessful) {
    const depletedYear = metrics.yearDepleted;
    const yearsActive = metrics.yearsActive;
    return {
      text: `Exhausted after ${yearsActive} year${yearsActive !== 1 ? 's' : ''} (${depletedYear})`,
      cssClass: 'negative',
      value: 0
    };
  }

  const finalValue = metrics.totalValueRealized;
  return {
    text: formatCurrency(finalValue),
    cssClass: 'positive',
    value: finalValue
  };
}

/**
 * Render the backtest results table
 * @param {Object[]} results - Array of backtest results per starting year
 * @param {Object} strategy1 - Strategy 1 metadata
 * @param {Object} strategy2 - Strategy 2 metadata
 */
function renderBacktestTable(results, strategy1, strategy2) {
  const tbody = document.getElementById('backtest-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  results.forEach(({ startYear, endYear, comparison }) => {
    const row = document.createElement('tr');

    const s1Outcome = formatStrategyOutcome(comparison.strategy1.metrics);
    const s2Outcome = formatStrategyOutcome(comparison.strategy2.metrics);

    // Determine winner
    let winnerText = '';
    let winnerClass = '';
    if (comparison.summary.winner === 'tie') {
      winnerText = 'Tie';
      winnerClass = '';
    } else if (comparison.summary.winner === 'strategy1') {
      winnerText = strategy1.shortName;
      winnerClass = 'backtest-winner-s1';
    } else {
      winnerText = strategy2.shortName;
      winnerClass = 'backtest-winner-s2';
    }

    row.innerHTML = `
      <td>${startYear}</td>
      <td>${endYear}</td>
      <td class="${s1Outcome.cssClass}">${s1Outcome.text}</td>
      <td class="${s2Outcome.cssClass}">${s2Outcome.text}</td>
      <td class="${winnerClass}">${winnerText}</td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Render the backtest summary statistics
 * @param {Object[]} results - Array of backtest results
 * @param {Object} strategy1 - Strategy 1 metadata
 * @param {Object} strategy2 - Strategy 2 metadata
 * @param {Object} inputs - Form inputs
 */
function renderBacktestSummary(results, strategy1, strategy2, inputs) {
  const summaryEl = document.getElementById('backtest-summary');
  if (!summaryEl) return;

  const stats = calculateBacktestSummaryStats(results, strategy1, strategy2);

  const { totalPeriods, s1Wins, s2Wins, ties, s1Exhausted, s2Exhausted,
          s1AvgValue, s2AvgValue, s1SuccessCount, s2SuccessCount,
          s1Best, s1Worst, s2Best, s2Worst,
          overallWinner, overallWinnerClass } = stats;

  summaryEl.innerHTML = `
    <div class="backtest-summary-banner ${overallWinnerClass}">
      <h3>Overall: ${overallWinner} wins ${Math.max(s1Wins, s2Wins)} out of ${totalPeriods} periods</h3>
      <p>${inputs.periodLength}-year periods from ${results[0]?.startYear || '?'} to ${results[results.length - 1]?.endYear || '?'} | ${formatCurrency(inputs.pensionAmount)} pension | ${inputs.withdrawalRate}% withdrawal rate</p>
    </div>

    <div class="backtest-stats-grid">
      <div class="backtest-stat-card backtest-stat-s1">
        <h4>${strategy1.shortName}</h4>
        <dl class="backtest-stat-list">
          <div class="backtest-stat-row">
            <dt>Wins</dt>
            <dd><strong>${s1Wins}</strong> of ${totalPeriods} (${((s1Wins / totalPeriods) * 100).toFixed(0)}%)</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Times Exhausted</dt>
            <dd class="${s1Exhausted > 0 ? 'negative' : ''}">${s1Exhausted} of ${totalPeriods}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Avg Total Value (successful)</dt>
            <dd>${s1SuccessCount > 0 ? formatCurrency(s1AvgValue) : 'N/A'}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Best Period</dt>
            <dd>${s1Best.year ? `${formatCurrency(s1Best.value)} (${s1Best.year})` : 'N/A'}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Worst Period</dt>
            <dd>${s1Worst.year ? `${formatCurrency(s1Worst.value)} (${s1Worst.year})` : 'N/A'}</dd>
          </div>
        </dl>
      </div>

      <div class="backtest-stat-card backtest-stat-s2">
        <h4>${strategy2.shortName}</h4>
        <dl class="backtest-stat-list">
          <div class="backtest-stat-row">
            <dt>Wins</dt>
            <dd><strong>${s2Wins}</strong> of ${totalPeriods} (${((s2Wins / totalPeriods) * 100).toFixed(0)}%)</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Times Exhausted</dt>
            <dd class="${s2Exhausted > 0 ? 'negative' : ''}">${s2Exhausted} of ${totalPeriods}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Avg Total Value (successful)</dt>
            <dd>${s2SuccessCount > 0 ? formatCurrency(s2AvgValue) : 'N/A'}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Best Period</dt>
            <dd>${s2Best.year ? `${formatCurrency(s2Best.value)} (${s2Best.year})` : 'N/A'}</dd>
          </div>
          <div class="backtest-stat-row">
            <dt>Worst Period</dt>
            <dd>${s2Worst.year ? `${formatCurrency(s2Worst.value)} (${s2Worst.year})` : 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </div>

    ${ties > 0 ? `<p class="backtest-ties">Ties: ${ties}</p>` : ''}
  `;

  summaryEl.hidden = false;
}

/**
 * Calculate summary statistics from backtest results (pure function)
 * @param {Object[]} results - Array of backtest results
 * @param {Object} strategy1 - Strategy 1 metadata
 * @param {Object} strategy2 - Strategy 2 metadata
 * @returns {Object} Summary statistics
 */
export function calculateBacktestSummaryStats(results, strategy1, strategy2) {
  const totalPeriods = results.length;

  let s1Wins = 0;
  let s2Wins = 0;
  let ties = 0;
  let s1Exhausted = 0;
  let s2Exhausted = 0;
  let s1TotalValue = 0;
  let s1SuccessCount = 0;
  let s2TotalValue = 0;
  let s2SuccessCount = 0;
  let s1Best = { value: -Infinity, year: null };
  let s1Worst = { value: Infinity, year: null };
  let s2Best = { value: -Infinity, year: null };
  let s2Worst = { value: Infinity, year: null };

  results.forEach(({ startYear, comparison }) => {
    const m1 = comparison.strategy1.metrics;
    const m2 = comparison.strategy2.metrics;

    if (comparison.summary.winner === 'strategy1') s1Wins++;
    else if (comparison.summary.winner === 'strategy2') s2Wins++;
    else ties++;

    if (!m1.strategySuccessful) s1Exhausted++;
    if (!m2.strategySuccessful) s2Exhausted++;

    const v1 = m1.totalValueRealized;
    const v2 = m2.totalValueRealized;

    if (m1.strategySuccessful) {
      s1TotalValue += v1;
      s1SuccessCount++;
    }
    if (m2.strategySuccessful) {
      s2TotalValue += v2;
      s2SuccessCount++;
    }

    if (v1 > s1Best.value) s1Best = { value: v1, year: startYear };
    if (v1 < s1Worst.value) s1Worst = { value: v1, year: startYear };
    if (v2 > s2Best.value) s2Best = { value: v2, year: startYear };
    if (v2 < s2Worst.value) s2Worst = { value: v2, year: startYear };
  });

  const s1AvgValue = s1SuccessCount > 0 ? s1TotalValue / s1SuccessCount : 0;
  const s2AvgValue = s2SuccessCount > 0 ? s2TotalValue / s2SuccessCount : 0;

  let overallWinner = '';
  let overallWinnerClass = '';
  if (s1Wins > s2Wins) {
    overallWinner = strategy1.shortName;
    overallWinnerClass = 'backtest-winner-s1';
  } else if (s2Wins > s1Wins) {
    overallWinner = strategy2.shortName;
    overallWinnerClass = 'backtest-winner-s2';
  } else {
    overallWinner = 'Tie';
  }

  return {
    totalPeriods, s1Wins, s2Wins, ties,
    s1Exhausted, s2Exhausted,
    s1TotalValue, s1SuccessCount, s1AvgValue,
    s2TotalValue, s2SuccessCount, s2AvgValue,
    s1Best, s1Worst, s2Best, s2Worst,
    overallWinner, overallWinnerClass
  };
}

/**
 * Calculate backtest results for all valid starting years (pure function)
 * @param {string} strategy1Id - Strategy 1 ID
 * @param {string} strategy2Id - Strategy 2 ID
 * @param {number} pensionAmount - Starting pension amount
 * @param {number} withdrawalRate - Withdrawal rate percentage
 * @param {number} periodLength - Number of years per period
 * @param {Object} [config={}] - Optional fee configuration
 * @returns {Object} Results array and metadata, or error
 */
export function calculateBacktestResults(strategy1Id, strategy2Id, pensionAmount, withdrawalRate, periodLength, config = {}) {
  const strategy1 = getStrategy(strategy1Id);
  const strategy2 = getStrategy(strategy2Id);

  const earliestYear = Math.max(strategy1.earliestYear, strategy2.earliestYear);
  const latestStartYear = YEAR_RANGE.max - periodLength + 1;

  if (earliestYear > latestStartYear) {
    return {
      error: `Not enough data: ${strategy1.shortName} and ${strategy2.shortName} need at least ${periodLength} years of data from ${earliestYear}, but data only goes to ${YEAR_RANGE.max}.`,
      results: []
    };
  }

  const results = [];

  for (let startYear = earliestYear; startYear <= latestStartYear; startYear++) {
    try {
      const comparison = compareAnyStrategies(
        strategy1Id,
        strategy2Id,
        pensionAmount,
        startYear,
        withdrawalRate,
        periodLength,
        config
      );
      results.push({
        startYear,
        endYear: startYear + periodLength - 1,
        comparison
      });
    } catch (error) {
      // Skip years that can't be calculated
      console.warn(`Skipping year ${startYear}: ${error.message}`);
    }
  }

  return {
    results,
    earliestYear,
    latestStartYear,
    strategy1,
    strategy2
  };
}

/**
 * Show the results section
 */
function showResultsSection() {
  const section = document.getElementById('backtest-results-section');
  if (section) {
    section.classList.add('visible');
  }
}

/**
 * Display an error message
 * @param {string} message - Error to show
 */
function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

/**
 * Clear error message
 */
function clearError() {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}
