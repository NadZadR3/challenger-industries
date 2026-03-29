import type { Invoice, Client, BusinessProfile } from "./types";
import { formatCurrency, formatDateIndia } from "./format";
import { getStateName } from "./gst";

/**
 * Sanitise a phone number for the wa.me API.
 * Strips spaces, dashes, parens, and leading '+'.
 * e.g. "+91 98765 43210" → "919876543210"
 */
function sanitisePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, "");
}

/**
 * Build a plain-text invoice summary suitable for WhatsApp.
 */
function buildInvoiceMessage(
  invoice: Invoice,
  client: Client | undefined,
  profile: BusinessProfile,
): string {
  const lines: string[] = [];

  lines.push(`*${profile.name || "Invoice"}*`);
  lines.push(`Invoice No: *${invoice.invoiceNumber}*`);
  lines.push(`Date: ${formatDateIndia(invoice.issueDate)}`);
  lines.push(`Due: ${formatDateIndia(invoice.dueDate)}`);
  lines.push("");

  if (client) {
    lines.push(`*Bill To:* ${client.name}`);
    if (client.taxId) lines.push(`GSTIN: ${client.taxId}`);
    lines.push("");
  }

  if (invoice.placeOfSupply) {
    lines.push(
      `Place of Supply: ${getStateName(invoice.placeOfSupply)} (${invoice.placeOfSupply})`,
    );
  }

  const gstLabel =
    invoice.gstType === "interstate" ? "IGST" : "CGST + SGST";
  lines.push(`Tax Type: ${gstLabel}`);
  lines.push("");

  // Line items
  lines.push("*Items:*");
  for (const item of invoice.lineItems) {
    const amt = formatCurrency(item.amount);
    lines.push(
      `• ${item.description} — ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${amt}`,
    );
  }
  lines.push("");

  // Totals
  lines.push(`Taxable: ${formatCurrency(invoice.subtotal)}`);
  lines.push(`GST: ${formatCurrency(invoice.taxTotal)}`);
  if (invoice.discount > 0) {
    lines.push(`Discount: -${formatCurrency(invoice.discount)}`);
  }
  lines.push(`*Total: ${formatCurrency(invoice.total)}*`);

  if (invoice.amountPaid > 0) {
    lines.push(`Paid: ${formatCurrency(invoice.amountPaid)}`);
    lines.push(`*Balance Due: ${formatCurrency(invoice.balanceDue)}*`);
  }

  // Bank details
  if (profile.bankDetails?.bankName && profile.bankDetails?.accountNumber) {
    lines.push("");
    lines.push("*Bank Details:*");
    lines.push(
      `${profile.bankDetails.accountHolder || profile.name}`,
    );
    lines.push(
      `${profile.bankDetails.bankName}${profile.bankDetails.branch ? `, ${profile.bankDetails.branch}` : ""}`,
    );
    lines.push(`A/c: ${profile.bankDetails.accountNumber}`);
    lines.push(`IFSC: ${profile.bankDetails.ifscCode}`);
    if (profile.bankDetails.upiId) {
      lines.push(`UPI: ${profile.bankDetails.upiId}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build a shorter message for the accountant — focuses on amounts and status.
 */
function buildAccountantMessage(
  invoice: Invoice,
  client: Client | undefined,
  profile: BusinessProfile,
): string {
  const lines: string[] = [];

  lines.push(`*Invoice ${invoice.invoiceNumber}*`);
  lines.push(`Client: ${client?.name ?? "Unknown"}`);
  lines.push(`Date: ${formatDateIndia(invoice.issueDate)}`);
  lines.push(`Status: ${invoice.status.toUpperCase()}`);
  lines.push("");
  lines.push(`Taxable: ${formatCurrency(invoice.subtotal)}`);
  lines.push(`GST: ${formatCurrency(invoice.taxTotal)}`);
  lines.push(`*Total: ${formatCurrency(invoice.total)}*`);

  if (invoice.amountPaid > 0) {
    lines.push(`Paid: ${formatCurrency(invoice.amountPaid)}`);
    lines.push(`*Balance: ${formatCurrency(invoice.balanceDue)}*`);
  }

  const gstLabel =
    invoice.gstType === "interstate" ? "IGST" : "CGST+SGST";
  lines.push("");
  lines.push(`Tax: ${gstLabel}`);
  if (invoice.placeOfSupply) {
    lines.push(
      `Place of Supply: ${getStateName(invoice.placeOfSupply)} (${invoice.placeOfSupply})`,
    );
  }

  lines.push("");
  lines.push(`— ${profile.name}`);

  return lines.join("\n");
}

/**
 * Open WhatsApp with a pre-filled invoice message for the client.
 * Uses the client's phone number.
 */
export function shareToClient(
  invoice: Invoice,
  client: Client | undefined,
  profile: BusinessProfile,
): void {
  const message = buildInvoiceMessage(invoice, client, profile);
  const encoded = encodeURIComponent(message);
  const phone = client?.phone ? sanitisePhone(client.phone) : "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Open WhatsApp with an accountant-focused invoice summary.
 */
export function shareToAccountant(
  invoice: Invoice,
  client: Client | undefined,
  profile: BusinessProfile,
): void {
  const message = buildAccountantMessage(invoice, client, profile);
  const encoded = encodeURIComponent(message);
  const phone = profile.accountantPhone
    ? sanitisePhone(profile.accountantPhone)
    : "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
