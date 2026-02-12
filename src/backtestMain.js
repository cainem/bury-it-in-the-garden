/**
 * Backtest Application Entry Point
 * Bootstraps the backtest page
 */

import { initBacktestApp } from './backtestApp.js';

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initBacktestApp();
  });
} else {
  initBacktestApp();
}
