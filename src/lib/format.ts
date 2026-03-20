import { format, parseISO, isValid } from "date-fns";

/**
 * Format cents to a display currency string.
 * e.g. 15099 → "$150.99"
 */
export function formatCurrency(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(dollars);
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
 * Generate an invoice number from prefix, year, and sequence.
 * e.g. generateInvoiceNumber("INV", 42) → "INV-2026-0042"
 */
export function generateInvoiceNumber(
  prefix: string,
  sequence: number
): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
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
