/**
 * Indian GST (Goods and Services Tax) helpers
 * ─────────────────────────────────────────────
 * Rules:
 *   Intra-state supply  → CGST (½ rate) + SGST (½ rate)
 *   Inter-state supply  → IGST (full rate)
 *   Tax type is determined by: supplier state code vs place of supply state code
 */

import type { LineItem } from "./types";

// ── GST Type ──────────────────────────────────────────────────────────

export type GSTType = "intrastate" | "interstate";

// ── GST Rate Slabs ────────────────────────────────────────────────────

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GSTRateSlab = (typeof GST_RATES)[number];

// ── Indian States (GST State Codes) ──────────────────────────────────

export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
] as const;

export type IndianStateCode = (typeof INDIAN_STATES)[number]["code"];

export function getStateName(code: string): string {
  return INDIAN_STATES.find((s) => s.code === code)?.name ?? code;
}

// ── UQC (Unit Quantity Codes) ─────────────────────────────────────────

export const UQC_CODES = [
  "NOS",  // Numbers
  "KGS",  // Kilograms
  "MTR",  // Metres
  "LTR",  // Litres
  "SQM",  // Square Metres
  "CBM",  // Cubic Metres
  "PCS",  // Pieces
  "BOX",  // Box
  "PKT",  // Packet
  "SET",  // Set
  "BTL",  // Bottle
  "BAG",  // Bag
  "CAN",  // Can
  "DZN",  // Dozen
  "GMS",  // Grams
  "MLS",  // Millilitres
  "TBS",  // Tablets
  "CAP",  // Capsules
  "OTH",  // Others
] as const;

// ── GST Type Resolution ───────────────────────────────────────────────

/**
 * Derive GST type by comparing supplier's state code to place of supply code.
 * Challenger Industries GSTIN starts with "07" → Delhi.
 */
export function resolveGSTType(
  supplierStateCode: string,
  placeOfSupplyCode: string
): GSTType {
  const supplier = supplierStateCode.slice(0, 2).padStart(2, "0");
  const pos = placeOfSupplyCode.slice(0, 2).padStart(2, "0");
  return supplier === pos ? "intrastate" : "interstate";
}

/** Extract state code from GSTIN (first 2 characters). */
export function stateCodeFromGSTIN(gstin: string): string {
  return gstin ? gstin.substring(0, 2) : "07";
}

// ── GST Breakdown Calculation ─────────────────────────────────────────

export interface GSTBreakdown {
  cgst: number; // cents
  sgst: number; // cents
  igst: number; // cents
}

/**
 * Split a total tax amount into CGST/SGST (intra-state) or IGST (inter-state).
 */
export function calculateGSTBreakdown(
  taxTotalCents: number,
  gstType: GSTType
): GSTBreakdown {
  if (gstType === "intrastate") {
    const half = Math.round(taxTotalCents / 2);
    return { cgst: half, sgst: taxTotalCents - half, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: taxTotalCents };
}

// ── Per-Rate GST Groups (for line-by-line breakdown display) ──────────

export interface GSTRateGroup {
  rate: number;         // total GST rate, e.g. 18
  taxableAmount: number; // sum of line item amounts at this rate (cents)
  taxAmount: number;    // total tax at this rate (cents)
  cgst: number;
  sgst: number;
  igst: number;
}

/**
 * Group line items by their GST rate and compute the tax split.
 * Used to render the itemised tax table on invoices.
 */
export function groupLineItemsByGSTRate(
  lineItems: LineItem[],
  gstType: GSTType
): GSTRateGroup[] {
  const map = new Map<number, { taxable: number; tax: number }>();

  for (const item of lineItems) {
    const existing = map.get(item.taxRate) ?? { taxable: 0, tax: 0 };
    const tax = Math.round(item.amount * (item.taxRate / 100));
    map.set(item.taxRate, {
      taxable: existing.taxable + item.amount,
      tax: existing.tax + tax,
    });
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([rate, { taxable, tax }]) => {
      const { cgst, sgst, igst } = calculateGSTBreakdown(tax, gstType);
      return {
        rate,
        taxableAmount: taxable,
        taxAmount: tax,
        cgst,
        sgst,
        igst,
      };
    });
}

// ── Amount in Words (Indian English) ─────────────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty",
  "Sixty", "Seventy", "Eighty", "Ninety",
];

function toWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
  if (n < 1_000)
    return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + toWords(n % 100) : ""}`;
  if (n < 1_00_000)
    return `${toWords(Math.floor(n / 1_000))} Thousand${n % 1_000 ? " " + toWords(n % 1_000) : ""}`;
  if (n < 1_00_00_000)
    return `${toWords(Math.floor(n / 1_00_000))} Lakh${n % 1_00_000 ? " " + toWords(n % 1_00_000) : ""}`;
  return `${toWords(Math.floor(n / 1_00_00_000))} Crore${n % 1_00_00_000 ? " " + toWords(n % 1_00_00_000) : ""}`;
}

/**
 * Convert a cents value to Indian English words.
 * e.g. 150099 → "Rupees One Lakh Five Hundred and Ninety-Nine Paise Only"
 * Required on GST tax invoices (Rule 46, CGST Rules 2017).
 */
export function amountInWords(cents: number): string {
  if (cents <= 0) return "Rupees Zero Only";
  const rupees = Math.floor(cents / 100);
  const paise = Math.round(cents % 100);
  const rupeePart = rupees > 0 ? `Rupees ${toWords(rupees)}` : "";
  const paisePart = paise > 0 ? `${toWords(paise)} Paise` : "";
  const body = [rupeePart, paisePart].filter(Boolean).join(" and ");
  return `${body} Only`;
}
