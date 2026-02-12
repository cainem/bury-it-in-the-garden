/**
 * UK Income Tax Data by Tax Year
 * Source: HMRC, legislation.gov.uk
 *
 * Tax years run from 6 April to 5 April the following year.
 * For simplicity, we use the calendar year that contains most of the tax year.
 * e.g., 2000 represents tax year 2000/01 (6 April 2000 - 5 April 2001)
 *
 * Key historical changes:
 * - 1979: Top rate reduced from 83% to 60%
 * - 1986: Basic rate reduced from 30% to 29%
 * - 1987: Basic rate reduced from 29% to 27%
 * - 1988: Basic rate reduced from 27% to 25%, higher rate reduced from 60% to 40%
 * - 1996: Basic rate reduced from 25% to 24%
 * - 1997: Basic rate reduced from 24% to 23%
 * - 1999: Basic rate reduced from 23% to 22%
 * - 2008: Basic rate reduced from 22% to 20%
 * - 2010: Additional rate (50%) introduced for income over £150,000
 * - 2010: Personal allowance taper introduced (reduced by £1 for every £2 over £100,000)
 * - 2013: Additional rate reduced to 45%
 * - 2010-2017: Personal allowance increased significantly
 * - 2023: Additional rate threshold reduced to £125,140
 */

export const ukTaxData = {
  // 1980s
  // Note: 1980-1987 uses a flat 60% higher rate as a simplification.
  // In reality, there were multiple higher-rate bands (40%, 45%, 50%, 55%, 60%)
  // but the 60% top rate is used here for modelling purposes.
  1980: {
    personalAllowance: 1375,
    basicRate: 0.30,
    basicRateLimit: 11250,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1981: {
    personalAllowance: 1375,
    basicRate: 0.30,
    basicRateLimit: 11250,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1982: {
    personalAllowance: 1565,
    basicRate: 0.30,
    basicRateLimit: 12800,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1983: {
    personalAllowance: 1785,
    basicRate: 0.30,
    basicRateLimit: 14600,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1984: {
    personalAllowance: 2005,
    basicRate: 0.30,
    basicRateLimit: 15400,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1985: {
    personalAllowance: 2205,
    basicRate: 0.30,
    basicRateLimit: 16200,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1986: {
    personalAllowance: 2335,
    basicRate: 0.29,
    basicRateLimit: 17200,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1987: {
    personalAllowance: 2425,
    basicRate: 0.27,
    basicRateLimit: 17900,
    higherRate: 0.60,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1988: {
    // Major reform: Basic rate cut to 25%, higher rate cut to 40%
    personalAllowance: 2605,
    basicRate: 0.25,
    basicRateLimit: 19300,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1989: {
    personalAllowance: 2785,
    basicRate: 0.25,
    basicRateLimit: 20700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  // 1990s
  1990: {
    personalAllowance: 3005,
    basicRate: 0.25,
    basicRateLimit: 20700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1991: {
    personalAllowance: 3295,
    basicRate: 0.25,
    basicRateLimit: 23700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1992: {
    personalAllowance: 3445,
    basicRate: 0.25,
    basicRateLimit: 23700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1993: {
    personalAllowance: 3445,
    basicRate: 0.25,
    basicRateLimit: 23700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1994: {
    personalAllowance: 3525,
    basicRate: 0.25,
    basicRateLimit: 23700,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1995: {
    personalAllowance: 3525,
    basicRate: 0.25,
    basicRateLimit: 24300,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1996: {
    // Basic rate reduced to 24%
    personalAllowance: 3765,
    basicRate: 0.24,
    basicRateLimit: 25500,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1997: {
    // Basic rate reduced to 23%
    personalAllowance: 3765,
    basicRate: 0.23,
    basicRateLimit: 26100,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1998: {
    personalAllowance: 4045,
    basicRate: 0.23,
    basicRateLimit: 26100,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  1999: {
    // Basic rate reduced to 22%
    personalAllowance: 4195,
    basicRate: 0.22,
    basicRateLimit: 27100,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  // 2000s
  2000: {
    personalAllowance: 4385,
    basicRate: 0.22,
    basicRateLimit: 28400,      // Taxable income up to this amount at basic rate
    higherRate: 0.40,
    higherRateLimit: null,      // No upper limit (no additional rate yet)
    additionalRate: null,
    additionalRateThreshold: null
  },
  2001: {
    personalAllowance: 4535,
    basicRate: 0.22,
    basicRateLimit: 29400,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2002: {
    personalAllowance: 4615,
    basicRate: 0.22,
    basicRateLimit: 29900,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2003: {
    personalAllowance: 4615,
    basicRate: 0.22,
    basicRateLimit: 30500,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2004: {
    personalAllowance: 4745,
    basicRate: 0.22,
    basicRateLimit: 31400,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2005: {
    personalAllowance: 4895,
    basicRate: 0.22,
    basicRateLimit: 32400,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2006: {
    personalAllowance: 5035,
    basicRate: 0.22,
    basicRateLimit: 33300,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2007: {
    personalAllowance: 5225,
    basicRate: 0.22,
    basicRateLimit: 34600,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2008: {
    // Basic rate reduced from 22% to 20%
    personalAllowance: 5435,
    basicRate: 0.20,
    basicRateLimit: 36000,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2009: {
    personalAllowance: 6475,
    basicRate: 0.20,
    basicRateLimit: 37400,
    higherRate: 0.40,
    higherRateLimit: null,
    additionalRate: null,
    additionalRateThreshold: null
  },
  2010: {
    // Additional rate introduced at 50%, personal allowance taper introduced
    personalAllowance: 6475,
    personalAllowanceTaperThreshold: 100000, // PA reduced by £1 for every £2 over this
    basicRate: 0.20,
    basicRateLimit: 37400,
    higherRate: 0.40,
    higherRateLimit: 150000,    // Higher rate up to £150,000
    additionalRate: 0.50,
    additionalRateThreshold: 150000
  },
  2011: {
    personalAllowance: 7475,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 35000,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.50,
    additionalRateThreshold: 150000
  },
  2012: {
    personalAllowance: 8105,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 34370,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.50,
    additionalRateThreshold: 150000
  },
  2013: {
    // Additional rate reduced to 45%
    personalAllowance: 9440,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 32010,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2014: {
    personalAllowance: 10000,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 31865,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2015: {
    personalAllowance: 10600,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 31785,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2016: {
    personalAllowance: 11000,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 32000,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2017: {
    personalAllowance: 11500,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 33500,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2018: {
    personalAllowance: 11850,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 34500,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2019: {
    personalAllowance: 12500,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37500,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2020: {
    personalAllowance: 12500,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37500,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2021: {
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2022: {
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 150000,
    additionalRate: 0.45,
    additionalRateThreshold: 150000
  },
  2023: {
    // Additional rate threshold reduced to £125,140
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 125140,
    additionalRate: 0.45,
    additionalRateThreshold: 125140
  },
  2024: {
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 125140,
    additionalRate: 0.45,
    additionalRateThreshold: 125140
  },
  2025: {
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 125140,
    additionalRate: 0.45,
    additionalRateThreshold: 125140
  },
  2026: {
    // Frozen allowances continue
    personalAllowance: 12570,
    personalAllowanceTaperThreshold: 100000,
    basicRate: 0.20,
    basicRateLimit: 37700,
    higherRate: 0.40,
    higherRateLimit: 125140,
    additionalRate: 0.45,
    additionalRateThreshold: 125140
  }
};

/**
 * Get tax data for a specific year
 * @param {number} year - The year to get tax data for
 * @returns {Object} Tax data for the year
 * @throws {Error} If year is not in the dataset
 */
export function getTaxData(year) {
  if (!(year in ukTaxData)) {
    throw new Error(`UK tax data not available for year ${year}`);
  }
  return ukTaxData[year];
}

/**
 * Get personal allowance for a specific year
 * @param {number} year - The year
 * @returns {number} Personal allowance amount
 */
export function getPersonalAllowance(year) {
  return getTaxData(year).personalAllowance;
}

/**
 * Check if additional rate exists for a year
 * @param {number} year - The year
 * @returns {boolean} True if additional rate applies
 */
export function hasAdditionalRate(year) {
  const data = getTaxData(year);
  return data.additionalRate !== null;
}

/**
 * Get all available years
 * @returns {number[]} Array of years with data
 */
export function getAvailableYears() {
  return Object.keys(ukTaxData).map(Number).sort((a, b) => a - b);
}

export default ukTaxData;
