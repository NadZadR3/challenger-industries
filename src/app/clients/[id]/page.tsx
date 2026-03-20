"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { formatCurrency, formatDate } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, MapPin, Building, DollarSign, FileText } from "lucide-react";
import type { InvoiceStatus } from "@/lib/types";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const client = useClientStore((s) => s.getClient(id));
  const invoices = useInvoiceStore((s) => s.getClientInvoices(id));

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-medium">Client not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const totalBilled = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="space-y-6">
      <PageHeader title={client.name} description={client.company || undefined}>
        <Link href={`/clients/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Contact Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {client.email && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Company</p>
                    <p className="text-sm">{client.company}</p>
                  </div>
                </div>
              )}
              {client.address.street && (
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
                    <div className="text-sm">
                      <p>{client.address.street}</p>
                      <p>
                        {client.address.city}
                        {client.address.state ? `, ${client.address.state}` : ""}{" "}
                        {client.address.zip}
                      </p>
                      {client.address.country && <p>{client.address.country}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 rounded-lg bg-muted/30 border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm leading-relaxed">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle>Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Billed</span>
              <span className="font-mono font-medium">{formatCurrency(totalBilled)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-mono font-medium text-emerald-400">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className={`font-mono font-medium ${outstanding > 0 ? "text-amber-400" : ""}`}>
                {formatCurrency(outstanding)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoices</span>
              <span className="font-medium">{invoices.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle>Invoices</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No invoices for this client yet.
              </p>
              <Link
                href="/invoices/new"
                className={`mt-3 inline-flex ${buttonVariants({ variant: "outline", size: "sm" })}`}
              >
                Create Invoice
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(inv.issueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium">
                        {formatCurrency(inv.total)}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[inv.status]}`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
