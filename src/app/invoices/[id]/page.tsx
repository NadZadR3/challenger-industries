"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useClientStore } from "@/lib/store/client-store";
import { usePaymentStore } from "@/lib/store/payment-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { formatCurrency, formatDate, formatDateIndia } from "@/lib/format";
import {
  groupLineItemsByGSTRate,
  getStateName,
  amountInWords,
} from "@/lib/gst";
import {
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  FileText,
  Landmark,
  Printer,
  MessageCircle,
  Download,
  Mail,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import type { InvoiceStatus, DscSignatureInfo } from "@/lib/types";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { shareToClient, shareToAccountant, shareWithPdf } from "@/lib/whatsapp";
import { signPdf } from "@/lib/dsc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentDialog } from "@/components/payment-dialog";
import { generateInvoicePdf } from "@/lib/generate-pdf";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const hydrated = useHydrated();
  const { id } = use(params);
  const router = useRouter();
  const invoice = useInvoiceStore((s) => s.getInvoice(id));
  const updateStatus = useInvoiceStore((s) => s.updateStatus);
  const client = useClientStore((s) =>
    invoice ? s.getClient(invoice.clientId) : undefined
  );
  const allPayments = usePaymentStore((s) => s.payments);
  const payments = allPayments.filter((p) => p.invoiceId === id);
  const profile = useSettingsStore((s) => s.profile);

  const [pdfLoading, setPdfLoading] = useState(false);

  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice || !profile) return;
    setPdfLoading(true);
    try {
      const blob = await generateInvoicePdf(invoice, client, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(
        `Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setPdfLoading(false);
    }
  }, [invoice, client, profile]);

  const handleEmailInvoice = useCallback(() => {
    if (!invoice || !client) return;
    const subject = encodeURIComponent(
      `Invoice ${invoice.invoiceNumber} from ${profile.name}`
    );
    const body = encodeURIComponent(
      `Dear ${client.name},\n\nPlease find attached Invoice ${invoice.invoiceNumber} dated ${formatDateIndia(invoice.issueDate)} for ${formatCurrency(invoice.total)}.\n\nDue Date: ${formatDateIndia(invoice.dueDate)}\n\nPlease make payment at your earliest convenience.\n\nRegards,\n${profile.name}`
    );
    const mailto = `mailto:${client.email}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
    toast.success("Opening email client");
  }, [invoice, client, profile]);

  // ── DSC signing ────────────────────────────────────────────────────
  const updateInvoice = useInvoiceStore((s) => s.updateInvoice);
  const [dscSigning, setDscSigning] = useState(false);

  const handleDscSign = useCallback(async () => {
    if (!invoice || !profile.dscCertAlias) {
      toast.error("No DSC certificate configured — check Settings → Signature & Stamp");
      return;
    }
    setDscSigning(true);
    try {
      const blob = await generateInvoicePdf(invoice, client, profile);
      const { signedInfo } = await signPdf(blob, profile.dscCertAlias, profile.dscBridgePort || 27372);
      updateInvoice(invoice.id, { dscSignature: signedInfo });
      toast.success(`Digitally signed by ${signedInfo.certHolder}`);
    } catch (err) {
      console.error("DSC signing failed:", err);
      toast.error(
        `DSC signing failed: ${err instanceof Error ? err.message : "Unknown error"}. Ensure your USB token is plugged in and the signing software is running.`
      );
    } finally {
      setDscSigning(false);
    }
  }, [invoice, client, profile, updateInvoice]);

  // Extract IEC from registrations (to show below GSTN)
  const iecReg = profile.registrations.find(
    (r) => r.label.toUpperCase() === "IEC" && r.value
  );
  const otherRegistrations = profile.registrations.filter(
    (r) => r.label && r.value && r.label.toUpperCase() !== "IEC"
  );

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-medium">Invoice not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  function markSent() {
    updateStatus(id, "sent");
    toast.success("Invoice marked as sent");
  }

  function markPaid() {
    updateStatus(id, "paid");
    toast.success("Invoice marked as paid");
  }

  function markCancelled() {
    updateStatus(id, "cancelled");
    toast.success("Invoice cancelled");
  }

  // Shared function to render the full invoice body (used for screen + print copies)
  function renderInvoiceBody(copyLabel?: string) {
    if (!invoice) return null;
    const gstType = invoice.gstType ?? "intrastate";
    const gstGroups = groupLineItemsByGSTRate(invoice.lineItems, gstType);
    const hasBankDetails = profile.bankDetails?.bankName && profile.bankDetails?.accountNumber;

    return (
      <>
        {/* Copy label + GSTN/IEC — top right */}
        <div className="flex items-start justify-between mb-4">
          {/* Logo — top left */}
          {profile.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt={profile.name}
              className="h-12 w-auto max-w-[220px] object-contain"
            />
          )}
          {!profile.logo && <div />}

          {/* Copy label + GSTN + IEC — stacked, right-aligned */}
          <div className="text-right space-y-1">
            {copyLabel && (
              <div className="hidden print-copy-label">
                <span className="text-[9px] font-bold italic">{copyLabel}</span>
              </div>
            )}
            {profile.taxId && (
              <div className="inline-flex items-center gap-1.5 rounded border border-primary/20 bg-primary/5 px-2.5 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">GSTN:</span>
                <span className="font-mono text-xs font-semibold">{profile.taxId}</span>
              </div>
            )}
            {iecReg && (
              <div className="text-[10px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider">IEC:</span>{" "}
                <span className="font-mono">{iecReg.value}</span>
              </div>
            )}
          </div>
        </div>

        {/* Company info + INVOICE No. row */}
        <div className="flex justify-between mb-6 gap-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {profile.name || "Your Business"}
            </h2>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed space-y-0.5">
              {profile.address.street && (
                <p className="whitespace-nowrap">
                  {profile.address.street},{" "}
                  {profile.address.city}
                  {profile.address.zip ? ` - ${profile.address.zip}` : ""}
                </p>
              )}
              {profile.address2?.street && (
                <p className="whitespace-nowrap">
                  {profile.address2.street},{" "}
                  {profile.address2.city}
                  {profile.address2.zip ? ` - ${profile.address2.zip}` : ""}
                </p>
              )}
            </div>
            {(profile.email || profile.phone) && (
              <div className="mt-1 text-xs text-muted-foreground flex gap-3">
                {profile.email && <span>{profile.email}</span>}
                {profile.phone && <span>{profile.phone}</span>}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <h3 className="text-2xl font-bold tracking-tight text-primary/80">
              INVOICE No.
            </h3>
            <p className="font-mono text-sm mt-1 font-semibold">
              {invoice.invoiceNumber}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${statusColors[invoice.status]} no-print`}
            >
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Registration Numbers Banner — FSSAI, FDA etc. (GSTN + IEC shown above) */}
        {otherRegistrations.length > 0 && (
          <div className="mb-6 rounded-lg bg-muted/40 border px-4 py-2.5">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {otherRegistrations.map((r) => (
                <div key={r.id} className="text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                    {r.label}:
                  </span>{" "}
                  <span className="font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reverse Charge Notice */}
        {invoice.reverseCharge && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Tax is payable on reverse charge basis
            </p>
          </div>
        )}

        {/* Tax Invoice heading */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] border-b border-t py-1.5">
            Tax Invoice
          </h3>
        </div>

        {/* Invoice meta: Date, Place of Supply, Tax Type */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-4">
          <div>
            <span className="text-muted-foreground">Date: </span>
            <span className="font-medium font-mono">{formatDateIndia(invoice.issueDate)}</span>
          </div>
          {invoice.placeOfSupply && (
            <div>
              <span className="text-muted-foreground">Place of Supply: </span>
              <span className="font-medium">{getStateName(invoice.placeOfSupply)} ({invoice.placeOfSupply})</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Tax Type: </span>
            <span className="font-medium font-mono">
              {gstType === "intrastate" ? "CGST + SGST" : "IGST"}
            </span>
          </div>
        </div>

        {/* Bill To + Ship To */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
              Bill To
            </p>
            {client ? (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">{client.name}</p>
                {client.taxId && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">GSTIN:</span>{" "}
                    <span className="font-mono">{client.taxId}</span>
                  </p>
                )}
                {client.address.street && <p className="text-xs">{client.address.street}</p>}
                {client.address.city && (
                  <p className="text-xs">
                    {client.address.city}
                    {client.address.state ? `, ${client.address.state}` : ""}{" "}
                    {client.address.zip}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unknown client</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
              Ship To
            </p>
            {invoice.shipToAddress?.street ? (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">{invoice.shipToName || client?.name}</p>
                <p className="text-xs">{invoice.shipToAddress.street}</p>
                {invoice.shipToAddress.city && (
                  <p className="text-xs">
                    {invoice.shipToAddress.city}
                    {invoice.shipToAddress.state ? `, ${invoice.shipToAddress.state}` : ""}{" "}
                    {invoice.shipToAddress.zip}
                  </p>
                )}
              </div>
            ) : client ? (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">{client.name}</p>
                {client.address.street && <p className="text-xs">{client.address.street}</p>}
                {client.address.city && (
                  <p className="text-xs">
                    {client.address.city}
                    {client.address.state ? `, ${client.address.state}` : ""}{" "}
                    {client.address.zip}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Same as Bill To</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold text-center">HSN/SAC</TableHead>
                <TableHead className="text-right font-semibold">Qty</TableHead>
                <TableHead className="text-right font-semibold">Unit Price</TableHead>
                <TableHead className="text-right font-semibold">GST</TableHead>
                <TableHead className="text-right font-semibold">Taxable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.description}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {item.hsnSacCode || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                    {item.quantity} PCS
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {item.taxRate > 0 ? (
                      <span>
                        {gstType === "intrastate"
                          ? `${item.taxRate / 2}+${item.taxRate / 2}%`
                          : `${item.taxRate}%`}
                      </span>
                    ) : (
                      <span className="text-foreground">Nil</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Transport & E-Way Bill */}
        {(invoice.transporter || invoice.ewayBill) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {invoice.transporter && invoice.transporter.name && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Transporter Details
                  </p>
                </div>
                <div className="text-[10px] space-y-0.5">
                  <p className="font-medium">{invoice.transporter.name}</p>
                  {invoice.transporter.transporterId && (
                    <p className="text-muted-foreground">
                      GSTIN: <span className="font-mono">{invoice.transporter.transporterId}</span>
                    </p>
                  )}
                  {invoice.transporter.docNumber && (
                    <p className="text-muted-foreground">
                      GR/LR No: <span className="font-mono">{invoice.transporter.docNumber}</span>
                      {invoice.transporter.docDate && (
                        <span> — {formatDateIndia(invoice.transporter.docDate)}</span>
                      )}
                    </p>
                  )}
                  <div className="flex gap-3 text-muted-foreground">
                    {invoice.transporter.vehicleNumber && (
                      <span>Vehicle: <span className="font-mono uppercase">{invoice.transporter.vehicleNumber}</span></span>
                    )}
                    {invoice.transporter.mode && (
                      <span className="capitalize">Mode: {invoice.transporter.mode}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {invoice.ewayBill && invoice.ewayBill.ewayBillNumber && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    E-Way Bill
                  </p>
                </div>
                <div className="text-[10px] space-y-0.5">
                  <p className="font-medium font-mono text-sm">{invoice.ewayBill.ewayBillNumber}</p>
                  <div className="flex gap-4 text-muted-foreground">
                    {invoice.ewayBill.ewayBillDate && (
                      <span>Generated: {formatDateIndia(invoice.ewayBill.ewayBillDate)}</span>
                    )}
                    {invoice.ewayBill.validUntil && (
                      <span>Valid until: {formatDateIndia(invoice.ewayBill.validUntil)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bank Details (left) + Totals (right) */}
        <div className="mt-4 grid grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            {hasBankDetails && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                  Bank Details
                </p>
                <div className="text-[10px] leading-snug space-y-0.5">
                  <p className="font-semibold">{profile.bankDetails!.accountHolder || profile.name}</p>
                  <p>{profile.bankDetails!.bankName}{profile.bankDetails!.branch ? `, ${profile.bankDetails!.branch}` : ""}</p>
                  <p><span className="text-muted-foreground">A/c:</span> <span className="font-mono">{profile.bankDetails!.accountNumber}</span></p>
                  <p><span className="text-muted-foreground">IFSC:</span> <span className="font-mono">{profile.bankDetails!.ifscCode}</span></p>
                  {profile.bankDetails!.upiId && (
                    <p><span className="text-muted-foreground">UPI:</span> <span className="font-mono">{profile.bankDetails!.upiId}</span></p>
                  )}
                </div>
              </div>
            )}
            {invoice.notes && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Notes</p>
                <p className="text-[10px] leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-lg bg-muted/30 border p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Value</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {gstGroups.length > 0 && (
              <div className="space-y-1 rounded border bg-background/50 px-2 py-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  GST Breakdown
                </p>
                {gstGroups.map((g) =>
                  g.rate === 0 ? (
                    <div key={g.rate} className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">0% GST (Nil/Exempt)</span>
                      <span className="font-mono text-muted-foreground">—</span>
                    </div>
                  ) : gstType === "intrastate" ? (
                    <div key={g.rate} className="space-y-0.5">
                      <p className="italic text-[9px] text-muted-foreground">
                        @ {g.rate}% on {formatCurrency(g.taxableAmount)}
                      </p>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">CGST @ {g.rate / 2}%</span>
                        <span className="font-mono">{formatCurrency(g.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">SGST @ {g.rate / 2}%</span>
                        <span className="font-mono">{formatCurrency(g.sgst)}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={g.rate} className="space-y-0.5">
                      <p className="italic text-[9px] text-muted-foreground">
                        @ {g.rate}% on {formatCurrency(g.taxableAmount)}
                      </p>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">IGST @ {g.rate}%</span>
                        <span className="font-mono">{formatCurrency(g.igst)}</span>
                      </div>
                    </div>
                  )
                )}
                <div className="flex justify-between text-[10px] font-semibold pt-0.5 border-t">
                  <span>Total GST</span>
                  <span className="font-mono">{formatCurrency(invoice.taxTotal)}</span>
                </div>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono text-destructive">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold pt-0.5">
              <span>Total Amount</span>
              <span className="font-mono">{formatCurrency(invoice.total)}</span>
            </div>
            <p className="text-[9px] text-muted-foreground italic leading-snug">
              {amountInWords(invoice.total)}
            </p>
            {invoice.taxTotal > 0 && (
              <p className="text-[9px] text-muted-foreground italic leading-snug">
                GST: {amountInWords(invoice.taxTotal)}
              </p>
            )}
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono text-emerald-400">-{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Balance Due</span>
                  <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
                </div>
              </>
            )}
            {invoice.reverseCharge && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 pt-0.5 border-t">
                * Tax is payable on reverse charge basis
              </p>
            )}
          </div>
        </div>

        {/* Footer — declaration + signatory */}
        <div className="mt-4 border-t pt-3">
          <div className="flex justify-between items-end">
            <div className="max-w-[260px]">
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Certified that the particulars given above are true and correct.
              </p>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Payment should be made at the presentation of the invoice.
              </p>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Subject to Delhi Jurisdiction Only.
              </p>
            </div>
            <div className="text-center min-w-[150px]">
              {profile.stampImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.stampImage} alt="Company stamp" className="mx-auto h-28 w-auto object-contain mb-0.5" />
              )}

              {/* DSC digital signature display */}
              {invoice.dscSignature ? (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 mb-1">
                  <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                    Digitally Signed
                  </p>
                  <p className="text-[8px] text-muted-foreground leading-snug">
                    {invoice.dscSignature.certHolder}
                  </p>
                  <p className="text-[8px] text-muted-foreground leading-snug">
                    CA: {invoice.dscSignature.issuingCA}
                  </p>
                  <p className="text-[8px] text-muted-foreground leading-snug">
                    Date: {formatDateIndia(invoice.dscSignature.signedAt)}
                  </p>
                  <p className="text-[7px] font-mono text-muted-foreground/70 mt-0.5 break-all">
                    {invoice.dscSignature.signatureHash.slice(0, 32)}…
                  </p>
                </div>
              ) : (profile.signatureMode ?? "manual") === "image" && profile.signatureImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.signatureImage} alt="Signature" className="mx-auto h-20 w-auto object-contain" />
              ) : (profile.signatureMode ?? "manual") === "dsc" ? (
                <div className="flex flex-col items-center gap-1 py-2" data-print-hide>
                  <button
                    type="button"
                    onClick={handleDscSign}
                    disabled={dscSigning}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {dscSigning ? (
                      <>Signing…</>
                    ) : (
                      <>Sign with DSC</>
                    )}
                  </button>
                  <p className="text-[8px] text-muted-foreground">USB token required</p>
                </div>
              ) : (
                <div className="h-20 border-b border-dashed border-muted-foreground/30 mb-0.5" />
              )}

              <p className="text-[10px] font-semibold mt-0.5">
                {profile.authorizedSignatory || profile.name}
              </p>
              <p className="text-[9px] text-muted-foreground">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div data-print-hide>
      <PageHeader title={invoice.invoiceNumber}>
        <Badge variant="outline" className={statusColors[invoice.status]}>
          {invoice.status}
        </Badge>
        <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}>
          <Printer className="mr-2 h-3 w-3" />
          Print
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="no-print"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
        >
          <Download className="mr-2 h-3 w-3" />
          {pdfLoading ? "Generating…" : "PDF"}
        </Button>
        {client?.email && (
          <Button size="sm" variant="outline" className="no-print" onClick={handleEmailInvoice}>
            <Mail className="mr-2 h-3 w-3" />
            Email
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " no-print cursor-pointer"} disabled={whatsappLoading}>
              <MessageCircle className="mr-2 h-3 w-3" />
              {whatsappLoading ? "Preparing…" : "WhatsApp"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                setWhatsappLoading(true);
                try {
                  const blob = await generateInvoicePdf(invoice, client, profile);
                  await shareWithPdf(invoice, client, profile, blob, "client");
                  toast.success("Invoice shared via WhatsApp");
                } catch (err) {
                  console.error("WhatsApp PDF share failed:", err);
                  shareToClient(invoice, client, profile);
                  toast.info("PDF sharing not supported — sent text summary instead");
                } finally {
                  setWhatsappLoading(false);
                }
              }}
            >
              Send to Client
              {client?.phone && (
                <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                setWhatsappLoading(true);
                try {
                  const blob = await generateInvoicePdf(invoice, client, profile);
                  await shareWithPdf(invoice, client, profile, blob, "accountant");
                  toast.success("Invoice shared via WhatsApp");
                } catch (err) {
                  console.error("WhatsApp PDF share failed:", err);
                  shareToAccountant(invoice, client, profile);
                  toast.info("PDF sharing not supported — sent text summary instead");
                } finally {
                  setWhatsappLoading(false);
                }
              }}
            >
              Send to Accountant
              {profile.accountantName && (
                <span className="ml-2 text-xs text-muted-foreground">{profile.accountantName}</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href={`/invoices/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Pencil className="mr-2 h-3 w-3" />
          Edit
        </Link>
        {invoice.status === "draft" && (
          <Button size="sm" onClick={markSent}>
            <Send className="mr-2 h-3 w-3" />
            Mark Sent
          </Button>
        )}
        {(invoice.status === "sent" || invoice.status === "overdue") && (
          <Button size="sm" onClick={markPaid}>
            <CheckCircle className="mr-2 h-3 w-3" />
            Mark Paid
          </Button>
        )}
        {invoice.status !== "cancelled" && invoice.status !== "paid" && (
          <Button size="sm" variant="destructive" onClick={markCancelled}>
            <XCircle className="mr-2 h-3 w-3" />
            Cancel
          </Button>
        )}
      </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice — screen view (Original Copy label shown in print) */}
        <div className="lg:col-span-2 print-full-width" data-print-invoice>
          <Card className="overflow-hidden print-invoice-copy">
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40 print-hide-accent" />
            <CardContent className="p-8">
              {renderInvoiceBody("Original Copy for Buyer")}
            </CardContent>
          </Card>

          {/* Duplicate copy — hidden on screen, shown in print as page 2 */}
          <div className="hidden print-duplicate-copy">
            <div className="print-invoice-copy">
              <div className="p-8">
                {renderInvoiceBody("Duplicate Copy for Transporter")}
              </div>
            </div>
          </div>
        </div>
        {/* Sidebar info */}
        <div className="space-y-6" data-print-hide>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Summary</CardTitle>
              {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                <PaymentDialog invoiceId={id} balanceDue={invoice.balanceDue} />
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-mono font-medium">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Balance Due</span>
                <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </CardContent>
          </Card>

          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.date)} · {p.method.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
