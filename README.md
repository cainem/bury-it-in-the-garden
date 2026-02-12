# Pension Strategy Comparison Tool

Compare UK pension withdrawal strategies across multiple asset classes.

A client-side web application that helps you understand the trade-offs between different pension strategies, including physical gold, gold ETFs, and various stock market indices.

## Strategies Available

### Base Strategies (6)
1. **Physical Gold - Outside Pension**: Withdraw pension, pay tax, buy CGT-exempt physical gold
2. **Gold ETF SIPP**: Keep pension in gold ETF within SIPP wrapper
3. **S&P 500 SIPP**: Keep pension in S&P 500 tracker ETF within SIPP
4. **Nasdaq 100 SIPP**: Keep pension in Nasdaq 100 tracker ETF within SIPP
5. **FTSE 100 SIPP**: Keep pension in FTSE 100 tracker ETF within SIPP
6. **US Long Treasury SIPP**: Keep pension in US 20+ year Treasury bond ETF within SIPP

### Combined Strategies (15)
- 50/50 splits between various base strategies (e.g., Gold + S&P 500, S&P 500 + US Treasuries, etc.)

## Features

- Compare any two strategies side-by-side
- Year-by-year comparison with detailed breakdowns
- Accurate UK tax calculations (1980-2026)
- Inflation-adjusted withdrawals (maintain purchasing power)
- Configurable parameters:
  - Starting pension amount
  - Annual withdrawal rate (1-10%)
  - Start year (1980-2021 for full 25-yr comparison)
  - Comparison period (5-30 years)
  - Transaction costs and fees
- Interactive charts showing portfolio value over time
- Dynamic disclaimers based on selected strategies
- No server required - runs entirely in your browser

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pension-strategies.git
cd pension-strategies

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── main.js              # Application entry point
├── app.js               # Main orchestration
├── config/
│   └── defaults.js      # Default configuration values
├── calculators/
│   ├── taxCalculator.js      # UK income tax calculations
│   ├── goldStrategy.js       # Physical gold strategy
│   ├── sippStrategy.js       # SIPP-based strategies
│   ├── syntheticEtf.js       # Historical ETF pricing
│   ├── strategyRegistry.js   # Strategy definitions
│   ├── combinedStrategy.js   # 50/50 split strategies
│   └── comparisonEngine.js   # Strategy comparison logic
├── components/
│   ├── inputForm.js          # User input form
│   ├── resultsTable.js       # Results display
│   ├── summary.js            # Comparison summary
│   ├── chart.js              # Performance charts
│   ├── disclaimer.js         # Legal disclaimers
│   └── advancedSettings.js   # Fee configuration
├── data/
│   ├── goldPrices.js         # Historical gold prices (1980-2026)
│   ├── sp500TotalReturn.js   # S&P 500 Total Return Index
│   ├── nasdaq100TotalReturn.js # Nasdaq 100 Total Return Index
│   ├── ftse100TotalReturn.js # FTSE 100 Total Return Index
│   ├── usLongTreasuryTotalReturn.js # US Treasury 20+ Year TR Index
│   ├── ukCpi.js              # UK Consumer Price Index data
│   ├── exchangeRates.js      # GBP/USD exchange rates
│   └── ukTaxData.js          # UK tax rates and bands
└── utils/
    ├── formatters.js         # Currency/number formatting
    └── validators.js         # Input validation
tests/                        # Test files (mirrors src/ structure)
```

## Documentation

- [Product Definition Document](pdd.md) - Full requirements and specifications
- [Implementation Plan](implementation_plan.md) - Development stages and timeline
- [AGENTS.md](AGENTS.md) - Guidelines for AI agents working on this codebase

## Test Coverage

| Area | Coverage |
|------|----------|
| Calculators | 98% statements, 91% branch |
| Data modules | 100% |
| Utils | 100% |
| Config | 100% |

Run `npm run test:coverage` for detailed coverage report.

## Disclaimer

This tool is for **educational purposes only**. It does not constitute financial advice. Past performance does not guarantee future results.

Key assumptions:
- Pre-2015 comparisons are illustrative only (pension freedom rules didn't exist before April 2015)
- Tax calculations assume pension withdrawal is your only income
- Physical gold assumed to be CGT-exempt UK legal tender coins

Always consult a qualified financial advisor before making pension decisions.

## License

MIT
