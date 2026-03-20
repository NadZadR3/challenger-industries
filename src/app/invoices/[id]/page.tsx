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
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Pencil,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { InvoiceStatus } from "@/lib/types";
import { toast } from "sonner";

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
  const { id } = use(params);
  const router = useRouter();
  const invoice = useInvoiceStore((s) => s.getInvoice(id));
  const updateStatus = useInvoiceStore((s) => s.updateStatus);
  const client = useClientStore((s) =>
    invoice ? s.getClient(invoice.clientId) : undefined
  );
  const payments = usePaymentStore((s) => s.getInvoicePayments(id));
  const profile = useSettingsStore((s) => s.profile);

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

  return (
    <div className="space-y-6">
      <PageHeader title={invoice.invoiceNumber}>
        <Badge variant="outline" className={statusColors[invoice.status]}>
          {invoice.status}
        </Badge>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice preview */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {/* Accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-8">
              {/* Header — business info + INVOICE title */}
              <div className="flex justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {profile.name || "Your Business"}
                  </h2>
                  {profile.address.street && (
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      <p>{profile.address.street}</p>
                      <p>
                        {profile.address.city}
                        {profile.address.state ? `, ${profile.address.state}` : ""}{" "}
                        {profile.address.zip}
                      </p>
                    </div>
                  )}
                  {profile.email && (
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  )}
                  {profile.phone && (
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  )}
                  {profile.taxId && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Tax ID: {profile.taxId}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-bold tracking-tight text-primary/80">
                    INVOICE
                  </h3>
                  <p className="font-mono text-lg mt-1 font-semibold">
                    {invoice.invoiceNumber}
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-2 ${statusColors[invoice.status]}`}
                  >
                    {invoice.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Registration Numbers Banner */}
              {profile.registrations.length > 0 && (
                <div className="mb-8 rounded-lg bg-muted/40 border px-4 py-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {profile.registrations
                      .filter((r) => r.label && r.value)
                      .map((r) => (
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

              {/* Bill To + Invoice Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
                    Bill To
                  </p>
                  {client ? (
                    <div className="text-sm leading-relaxed">
                      <p className="font-semibold text-base">{client.name}</p>
                      {client.company && (
                        <p className="text-muted-foreground">{client.company}</p>
                      )}
                      {client.address.street && <p>{client.address.street}</p>}
                      {client.address.city && (
                        <p>
                          {client.address.city}
                          {client.address.state ? `, ${client.address.state}` : ""}{" "}
                          {client.address.zip}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-muted-foreground mt-1">{client.email}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unknown client</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
                    Invoice Details
                  </p>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Terms</span>
                      <span className="font-medium">{invoice.terms || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="text-right font-semibold">Qty</TableHead>
                      <TableHead className="text-right font-semibold">Unit Price</TableHead>
                      <TableHead className="text-right font-semibold">Tax</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-medium">{item.description}</span>
                          <Badge
                            variant="outline"
                            className="ml-2 text-[10px] px-1.5 py-0"
                          >
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.taxRate}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-2 rounded-lg bg-muted/30 border p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-mono">{formatCurrency(invoice.taxTotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-mono text-destructive">
                        -{formatCurrency(invoice.discount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(invoice.total)}</span>
                  </div>
                  {invoice.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-mono text-emerald-400">
                          -{formatCurrency(invoice.amountPaid)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Balance Due</span>
                        <span className="font-mono">
                          {formatCurrency(invoice.balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 border-t pt-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-1">
                    Notes
                  </p>
                  <p className="text-sm leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
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
