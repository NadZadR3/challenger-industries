"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useClientStore } from "@/lib/store/client-store";
import { formatCurrency, formatDate } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { Plus, MoreHorizontal, FileText, Eye, Pencil, Trash2, Ban } from "lucide-react";
import type { InvoiceStatus } from "@/lib/types";
import { useState } from "react";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function InvoicesPage() {
  const hydrated = useHydrated();
  const invoices = useInvoiceStore((s) => s.invoices);
  const cancelInvoice = useInvoiceStore((s) => s.cancelInvoice);
  const deleteAndRenumber = useInvoiceStore((s) => s.deleteAndRenumber);
  const deleteInvoice = useInvoiceStore((s) => s.deleteInvoice);
  const clients = useClientStore((s) => s.clients);
  const router = useRouter();
  const [tab, setTab] = useState("all");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string; status: string } | null>(null);

  function requestDelete(id: string, invoiceNumber: string, status: string) {
    if (!invoiceNumber) {
      // Draft with no number — delete immediately, no dialog needed
      deleteInvoice(id);
      return;
    }
    setDeleteTarget({ id, number: invoiceNumber, status });
  }

  function confirmCancel() {
    if (!deleteTarget) return;
    cancelInvoice(deleteTarget.id);
    setDeleteTarget(null);
  }

  function confirmDeleteAndRenumber() {
    if (!deleteTarget) return;
    deleteAndRenumber(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const filtered =
    tab === "all" ? invoices : invoices.filter((inv) => inv.status === tab);

  const sorted = filtered
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Manage your invoices">
        <Link href="/invoices/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Link>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({invoices.filter((i) => i.status === "draft").length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({invoices.filter((i) => i.status === "sent").length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({invoices.filter((i) => i.status === "paid").length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({invoices.filter((i) => i.status === "overdue").length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({invoices.filter((i) => i.status === "cancelled").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium">No invoices found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "all"
                ? "Create your first invoice to get started."
                : `No ${tab} invoices.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Invoice</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((inv) => {
                const client = clients.find((c) => c.id === inv.clientId);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {inv.invoiceNumber || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{client?.name || "—"}</TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[inv.status]}
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/invoices/${inv.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/invoices/${inv.id}/edit`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => requestDelete(inv.id, inv.invoiceNumber, inv.status)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Cancel / Delete dialog — only shown for finalized invoices */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice {deleteTarget?.number}</DialogTitle>
            <DialogDescription>
              Choose how to handle this invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {deleteTarget?.status !== "cancelled" && (
              <button
                onClick={confirmCancel}
                className="w-full flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Ban className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium">Cancel Invoice</p>
                  <p className="text-sm text-muted-foreground">
                    Mark as cancelled. The invoice number ({deleteTarget?.number}) stays in the records
                    and the PDF will show &ldquo;CANCELLED&rdquo;.
                  </p>
                </div>
              </button>
            )}
            <button
              onClick={confirmDeleteAndRenumber}
              className="w-full flex items-start gap-3 rounded-lg border border-destructive/30 p-4 text-left hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Delete Permanently</p>
                <p className="text-sm text-muted-foreground">
                  Remove the invoice completely and renumber all remaining invoices
                  in the same financial year to keep the sequence intact.
                </p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
