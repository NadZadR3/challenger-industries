"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  calculateLineItemAmount,
  calculateInvoiceTotals,
} from "@/lib/format";
import type { LineItem, LineItemType } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const hydrated = useHydrated();
  const { id } = use(params);
  const router = useRouter();
  const invoice = useInvoiceStore((s) => s.getInvoice(id));
  const updateInvoice = useInvoiceStore((s) => s.updateInvoice);
  const clients = useClientStore((s) => s.clients);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (invoice) {
      setClientId(invoice.clientId);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setLineItems(invoice.lineItems);
      setDiscount(String(centsToDollars(invoice.discount)));
      setNotes(invoice.notes);
      setTerms(invoice.terms);
    }
  }, [invoice]);

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

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const items = [...prev];
      const item = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(value) : item.quantity;
        const price = field === "unitPrice" ? dollarsToCents(Number(value)) : item.unitPrice;
        item.quantity = qty;
        item.unitPrice = price;
        item.amount = calculateLineItemAmount(qty, price);
      }
      if (field === "taxRate") {
        item.taxRate = Number(value);
      }
      items[index] = item;
      return items;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: nanoid(), type: "service", description: "", quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 },
    ]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const discountCents = dollarsToCents(Number(discount) || 0);
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(lineItems, discountCents);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateInvoice(id, {
      clientId,
      issueDate,
      dueDate,
      lineItems: lineItems.filter((li) => li.description.trim()),
      discount: discountCents,
      notes,
      terms,
    });
    toast.success("Invoice updated");
    router.push(`/invoices/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Invoice" description={invoice.invoiceNumber} />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-1 h-3 w-3" />Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Qty</Label>
                            <Input type="number" min="0" step="0.01" value={item.quantity}
                              onChange={(e) => updateLineItem(index, "quantity", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price ($)</Label>
                            <Input type="number" min="0" step="0.01" value={centsToDollars(item.unitPrice) || ""}
                              onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Tax (%)</Label>
                            <Input type="number" min="0" step="0.01" value={item.taxRate || ""}
                              onChange={(e) => updateLineItem(index, "taxRate", e.target.value)} />
                          </div>
                        </div>
                      </div>
                      {lineItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="mt-7 shrink-0"
                          onClick={() => removeLineItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Line total: {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={terms} onChange={(e) => setTerms(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6">
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">{formatCurrency(taxTotal)}</span>
                </div>
                <div className="space-y-2">
                  <Label>Discount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={discount}
                    onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
                <div className="pt-4 space-y-2">
                  <Button type="submit" className="w-full">Save Changes</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
