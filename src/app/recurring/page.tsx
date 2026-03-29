"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useRecurringStore } from "@/lib/store/recurring-store";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  formatCurrency,
  formatDate,
  dollarsToCents,
  todayISO,
} from "@/lib/format";
import type { RecurrenceInterval, LineItem } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  Plus,
  Repeat,
  MoreHorizontal,
  Trash2,
  Pause,
  Play,
  Zap,
  Calendar,
} from "lucide-react";

const INTERVALS: { value: RecurrenceInterval; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringPage() {
  const hydrated = useHydrated();
  const templates = useRecurringStore((s) => s.templates);
  const addTemplate = useRecurringStore((s) => s.addTemplate);
  const deleteTemplate = useRecurringStore((s) => s.deleteTemplate);
  const toggleActive = useRecurringStore((s) => s.toggleActive);
  const clients = useClientStore((s) => s.clients);
  const createInvoice = useInvoiceStore((s) => s.createInvoice);
  const profile = useSettingsStore((s) => s.profile);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [interval, setInterval] = useState<RecurrenceInterval>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: nanoid(),
      type: "product",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: profile.defaultTaxRate,
      amount: 0,
    },
  ]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: nanoid(),
        type: "product",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: profile.defaultTaxRate,
        amount: 0,
      },
    ]);
  }

  function updateLineItem(id: string, field: string, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.amount = Math.round(updated.quantity * updated.unitPrice);
        }
        return updated;
      })
    );
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    const items = lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        ...li,
        unitPrice: dollarsToCents(li.unitPrice),
        amount: dollarsToCents(li.unitPrice) * li.quantity,
      }));
    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    addTemplate({
      clientId,
      lineItems: items,
      interval,
      startDate,
      endDate: endDate || undefined,
      notes,
    });
    toast.success("Recurring template created");
    setDialogOpen(false);
    resetForm();
  }

  function resetForm() {
    setClientId("");
    setInterval("monthly");
    setStartDate(todayISO());
    setEndDate("");
    setNotes("");
    setLineItems([
      {
        id: nanoid(),
        type: "product",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: profile.defaultTaxRate,
        amount: 0,
      },
    ]);
  }

  function generateNow(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const client = clients.find((c) => c.id === template.clientId);
    const stateCode = client?.address.state
      ? undefined
      : profile.supplierStateCode;

    createInvoice({
      clientId: template.clientId,
      issueDate: todayISO(),
      dueDate: todayISO(), // user can edit after
      lineItems: template.lineItems,
      discount: 0,
      notes: template.notes,
      terms: template.terms,
      recurringTemplateId: template.id,
      gstType: profile.defaultGSTType,
      placeOfSupply: stateCode,
      reverseCharge: false,
    });
    toast.success("Invoice generated from template");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Invoices"
        description={`${templates.length} template${templates.length !== 1 ? "s" : ""}`}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recurring Template</DialogTitle>
              <DialogDescription>
                Set up a template to generate invoices on a schedule.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={(v) => v && setClientId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={interval} onValueChange={(v) => v && setInterval(v as RecurrenceInterval)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rec-start">Start Date</Label>
                  <Input
                    id="rec-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-end">End Date (optional)</Label>
                  <Input
                    id="rec-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Price</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">GST %</Label>}
                      <Input
                        type="number"
                        min="0"
                        value={item.taxRate}
                        onChange={(e) => updateLineItem(item.id, "taxRate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">&nbsp;</Label>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rec-notes">Notes</Label>
                <Textarea
                  id="rec-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes included on generated invoices"
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Repeat className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">No recurring templates</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
              Create a recurring template to automatically generate invoices on a schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Next Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const client = clients.find((c) => c.id === t.clientId);
                  const total = t.lineItems.reduce((sum, li) => sum + li.amount, 0);
                  const tax = t.lineItems.reduce(
                    (sum, li) => sum + Math.round(li.amount * (li.taxRate / 100)),
                    0
                  );
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {client?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="capitalize">{t.interval}</TableCell>
                      <TableCell>{t.lineItems.length} item{t.lineItems.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(total + tax)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.nextGenerationDate ? formatDate(t.nextGenerationDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }
                        >
                          {t.isActive ? "Active" : "Paused"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateNow(t.id)}>
                              <Zap className="mr-2 h-4 w-4" />
                              Generate Invoice Now
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(t.id)}>
                              {t.isActive ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Resume
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                deleteTemplate(t.id);
                                toast.success("Template deleted");
                              }}
                              className="text-destructive"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
