"use client";

import { useState } from "react";
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
import { useSettingsStore } from "@/lib/store/settings-store";
import {
  formatCurrency,
  todayISO,
  dollarsToCents,
  calculateLineItemAmount,
  calculateInvoiceTotals,
} from "@/lib/format";
import type { LineItem, LineItemType } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

function emptyLineItem(): LineItem {
  return {
    id: nanoid(),
    type: "service",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    amount: 0,
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const createInvoice = useInvoiceStore((s) => s.createInvoice);
  const profile = useSettingsStore((s) => s.profile);

  const today = todayISO();
  const defaultDue = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(profile.defaultPaymentTerms);

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const items = [...prev];
      const item = { ...items[index], [field]: value };
      // Recalculate amount
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
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const discountCents = dollarsToCents(Number(discount) || 0);
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(lineItems, discountCents);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item");
      return;
    }
    const invoice = createInvoice({
      clientId,
      issueDate,
      dueDate,
      lineItems: lineItems.filter((li) => li.description.trim()),
      discount: discountCents,
      notes,
      terms,
      recurringTemplateId: "",
    });
    toast.success(`Invoice ${invoice.invoiceNumber} created`);
    router.push(`/invoices/${invoice.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create a new invoice" />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` (${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No clients yet.{" "}
                      <a href="/clients/new" className="underline">
                        Add one first
                      </a>
                      .
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(index, "description", e.target.value)
                              }
                              placeholder="Service or product description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={item.type}
                              onValueChange={(v) =>
                                updateLineItem(index, "type", v as LineItemType)
                              }
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="product">Product</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(index, "quantity", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice / 100 || ""}
                              onChange={(e) =>
                                updateLineItem(index, "unitPrice", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tax Rate (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.taxRate || ""}
                              onChange={(e) =>
                                updateLineItem(index, "taxRate", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-7 shrink-0"
                          onClick={() => removeLineItem(index)}
                        >
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
              <CardHeader>
                <CardTitle>Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thank you for your business..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Net 30"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
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
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-destructive">
                      -{formatCurrency(discountCents)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
                <div className="pt-4 space-y-2">
                  <Button type="submit" className="w-full">
                    Create Invoice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
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
