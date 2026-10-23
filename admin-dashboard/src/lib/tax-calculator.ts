/**
 * Tax Calculator for PavDental
 *
 * Currently implements flat-rate UK VAT (Value Added Tax)
 * Future: Support for regional tax rules, tax exemptions, etc.
 */

export interface TaxCalculationResult {
  taxAmount: number;
  taxRate: number;
  taxableAmount: number;
  currency: string;
}

export interface TaxRule {
  country: string;
  rate: number; // Percentage (e.g., 20 for 20%)
  exemptCategories?: string[];
}

// Current tax rules (UK VAT is included in retail prices for most dental products)
const TAX_RULES: Record<string, TaxRule> = {
  GB: {
    country: "GB",
    rate: 20, // 20% VAT standard rate
    exemptCategories: ["medical_devices", "prescription"],
  },
  US: {
    country: "US",
    rate: 0, // No VAT in US, sales tax varies by state
  },
  EU: {
    country: "EU",
    rate: 20, // Standard EU VAT rate
  },
};

/**
 * Calculate tax for a given amount
 *
 * @param amount - The pre-tax amount
 * @param countryCode - ISO country code (default: GB)
 * @param category - Product category for exemption checks
 * @returns Tax calculation result
 */
export function calculateTax(amount: number, countryCode = "GB", category?: string): TaxCalculationResult {
  if (amount <= 0) {
    return {
      taxAmount: 0,
      taxRate: 0,
      taxableAmount: 0,
      currency: "GBP",
    };
  }

  const rule = TAX_RULES[countryCode] || TAX_RULES.GB;

  // Check if category is exempt
  if (category && rule.exemptCategories?.includes(category)) {
    return {
      taxAmount: 0,
      taxRate: 0,
      taxableAmount: amount,
      currency: countryCode === "GB" ? "GBP" : "GBP",
    };
  }

  const taxRate = rule.rate;
  const taxAmount = Math.round(((amount * taxRate) / 100) * 100) / 100;

  return {
    taxAmount,
    taxRate,
    taxableAmount: amount,
    currency: countryCode === "GB" ? "GBP" : "GBP",
  };
}

/**
 * Calculate tax for cart items
 *
 * @param items - Array of cart items with amount and optional category
 * @param countryCode - ISO country code (default: GB)
 * @returns Total tax calculation result
 */
export function calculateCartTax(
  items: Array<{ amount: number; category?: string }>,
  countryCode = "GB",
): TaxCalculationResult {
  let totalTaxableAmount = 0;
  let totalTaxAmount = 0;

  for (const item of items) {
    const result = calculateTax(item.amount, countryCode, item.category);
    totalTaxableAmount += result.taxableAmount;
    totalTaxAmount += result.taxAmount;
  }

  const rule = TAX_RULES[countryCode] || TAX_RULES.GB;

  return {
    taxAmount: Math.round(totalTaxAmount * 100) / 100,
    taxRate: rule.rate,
    taxableAmount: Math.round(totalTaxableAmount * 100) / 100,
    currency: countryCode === "GB" ? "GBP" : "GBP",
  };
}

/**
 * Get available tax rules
 */
export function getTaxRules(): Record<string, TaxRule> {
  return { ...TAX_RULES };
}

/**
 * Add a custom tax rule (for future use)
 */
export function addTaxRule(countryCode: string, rule: TaxRule): void {
  TAX_RULES[countryCode] = rule;
}
