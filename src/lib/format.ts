import { format, parseISO, isValid } from "date-fns";

/**
 * Format cents to a display currency string.
 * Uses en-IN locale for INR (Indian number system — lakhs/crores).
 * e.g. 150099 → "₹1,500.99"
 */
export function formatCurrency(cents: number, currency = "INR"): string {
  const amount = cents / 100;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format cents for PDF rendering (Helvetica doesn't support ₹ glyph).
 * Replaces ₹ with "Rs." so the symbol renders correctly in @react-pdf.
 * e.g. 150099 → "Rs.1,500.99"
 */
export function formatCurrencyPdf(cents: number, currency = "INR"): string {
  const amount = cents / 100;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 2,
  }).format(amount);
  const symbol = currency === "INR" ? "Rs." : "$";
  return `${symbol}${formatted}`;
}

/**
 * Format an ISO date string for display.
 * e.g. "2026-03-20" → "Mar 20, 2026"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = parseISO(isoDate);
  if (!isValid(date)) return isoDate;
  return format(date, "MMM d, yyyy");
}

/**
 * Format an ISO date string as a short date.
 * e.g. "2026-03-20" → "03/20/2026"
 */
export function formatDateShort(isoDate: string): string {
  if (!isoDate) return "";
  const date = parseISO(isoDate);
  if (!isValid(date)) return isoDate;
  return format(date, "MM/dd/yyyy");
}

/**
 * Format an ISO date string in Indian format (DD/MM/YYYY).
 * Used on GST tax invoices as required by Indian law.
 * e.g. "2026-03-20" → "20/03/2026"
 */
export function formatDateIndia(isoDate: string): string {
  if (!isoDate) return "";
  const date = parseISO(isoDate);
  if (!isValid(date)) return isoDate;
  return format(date, "dd/MM/yyyy");
}

/**
 * Get today's date as ISO string (YYYY-MM-DD).
 */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Convert a dollar amount (user input) to cents.
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for form display.
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Get the Indian financial year string for a given date.
 * FY runs April 1 → March 31.
 * e.g. March 2026 → "2025-26", April 2026 → "2026-27"
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: 0=Jan, 3=Apr
  const year = date.getFullYear();
  if (month >= 3) {
    // April onwards → current year - next year
    return `${year}-${String(year + 1).slice(2)}`;
  }
  // Jan–Mar → previous year - current year
  return `${year - 1}-${String(year).slice(2)}`;
}

/**
 * Generate an invoice number using Indian financial year format.
 * e.g. generateInvoiceNumber("INV", 1) → "2025-26/001"
 * The prefix is NOT used in the number — the FY is the prefix.
 */
export function generateInvoiceNumber(
  _prefix: string,
  sequence: number
): string {
  const fy = getFinancialYear();
  const padded = String(sequence).padStart(3, "0");
  return `${fy}/${padded}`;
}

/**
 * Calculate line item amount (quantity * unitPrice in cents).
 */
export function calculateLineItemAmount(
  quantity: number,
  unitPriceCents: number
): number {
  return Math.round(quantity * unitPriceCents);
}

/**
 * Calculate tax for a line item.
 */
export function calculateLineItemTax(
  amountCents: number,
  taxRate: number
): number {
  return Math.round(amountCents * (taxRate / 100));
}

/**
 * Calculate invoice totals from line items and discount.
 */
export function calculateInvoiceTotals(
  lineItems: { amount: number; taxRate: number }[],
  discountCents: number
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxTotal = lineItems.reduce(
    (sum, item) => sum + calculateLineItemTax(item.amount, item.taxRate),
    0
  );
  const total = subtotal + taxTotal - discountCents;
  return { subtotal, taxTotal, total: Math.max(0, total) };
}
