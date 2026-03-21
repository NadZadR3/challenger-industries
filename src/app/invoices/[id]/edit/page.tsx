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
import { Badge } from "@/components/ui/badge";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  calculateLineItemAmount,
  calculateInvoiceTotals,
} from "@/lib/format";
import {
  INDIAN_STATES,
  GST_RATES,
  UQC_CODES,
  groupLineItemsByGSTRate,
  resolveGSTType,
  stateCodeFromGSTIN,
} from "@/lib/gst";
import type { GSTType } from "@/lib/gst";
import type { LineItem, LineItemType, TransporterDetails, EWayBillDetails, Address } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { Plus, Trash2, Info, Truck } from "lucide-react";
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
  const profile = useSettingsStore((s) => s.profile);

  const supplierCode = stateCodeFromGSTIN(profile.taxId || profile.supplierStateCode || "07");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(supplierCode);
  const [gstType, setGstType] = useState<GSTType>("intrastate");
  const [reverseCharge, setReverseCharge] = useState(false);

  const emptyTransporter: TransporterDetails = {
    name: "", transporterId: "", docNumber: "", docDate: "",
    vehicleNumber: "", vehicleType: "regular", mode: "road",
  };
  const emptyEWayBill: EWayBillDetails = {
    ewayBillNumber: "", ewayBillDate: "", validUntil: "",
  };
  const [showTransport, setShowTransport] = useState(false);
  const [transporter, setTransporter] = useState<TransporterDetails>(emptyTransporter);
  const [ewayBill, setEWayBill] = useState<EWayBillDetails>(emptyEWayBill);

  function updateTransporter(field: keyof TransporterDetails, value: string) {
    setTransporter((prev) => ({ ...prev, [field]: value }));
  }
  function updateEWayBill(field: keyof EWayBillDetails, value: string) {
    setEWayBill((prev) => ({ ...prev, [field]: value }));
  }

  // Ship To
  const emptyAddr: Address = { street: "", city: "", state: "", zip: "", country: "India" };
  const [differentShipTo, setDifferentShipTo] = useState(false);
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState<Address>(emptyAddr);

  useEffect(() => {
    if (invoice) {
      setClientId(invoice.clientId);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setLineItems(invoice.lineItems);
      setDiscount(String(centsToDollars(invoice.discount)));
      setNotes(invoice.notes);
      setTerms(invoice.terms);
      setPlaceOfSupply(invoice.placeOfSupply ?? supplierCode);
      setGstType(invoice.gstType ?? "intrastate");
      setReverseCharge(invoice.reverseCharge ?? false);
      if (invoice.transporter) {
        setTransporter(invoice.transporter);
        setShowTransport(true);
      }
      if (invoice.ewayBill) {
        setEWayBill(invoice.ewayBill);
        setShowTransport(true);
      }
      if (invoice.shipToAddress?.street) {
        setDifferentShipTo(true);
        setShipToName(invoice.shipToName ?? "");
        setShipToAddress(invoice.shipToAddress);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function handlePlaceOfSupplyChange(code: string) {
    setPlaceOfSupply(code);
    setGstType(resolveGSTType(supplierCode, code));
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
      if (field === "taxRate") item.taxRate = Number(value);
      items[index] = item;
      return items;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: nanoid(),
        type: "service",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        hsnSacCode: "",
        unit: "NOS",
        amount: 0,
      },
    ]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const discountCents = dollarsToCents(Number(discount) || 0);
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(lineItems, discountCents);
  const gstGroups = groupLineItemsByGSTRate(lineItems, gstType);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasTransporter = showTransport && transporter.name.trim();
    const hasEWayBill = showTransport && ewayBill.ewayBillNumber.trim();

    updateInvoice(id, {
      clientId,
      issueDate,
      dueDate,
      lineItems: lineItems.filter((li) => li.description.trim()),
      discount: discountCents,
      notes,
      terms,
      gstType,
      placeOfSupply,
      reverseCharge,
      transporter: hasTransporter ? transporter : undefined,
      ewayBill: hasEWayBill ? ewayBill : undefined,
      shipToName: differentShipTo && shipToName.trim() ? shipToName : undefined,
      shipToAddress: differentShipTo && shipToAddress.street.trim() ? shipToAddress : undefined,
    });
    toast.success("Invoice updated");
    router.push(`/invoices/${id}`);
  }

  const posState = INDIAN_STATES.find((s) => s.code === placeOfSupply);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Invoice" description={invoice.invoiceNumber} />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            {/* Invoice Details */}
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

            {/* GST Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  GST Details
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {gstType === "intrastate" ? "CGST + SGST" : "IGST"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Place of Supply</Label>
                    <Select value={placeOfSupply} onValueChange={(v) => v && handlePlaceOfSupplyChange(v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.code} — {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Supply Type</Label>
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                      {gstType === "intrastate" ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          <div>
                            <p className="text-sm font-medium">Intra-State</p>
                            <p className="text-xs text-muted-foreground">
                              Delhi (07) → {posState?.name} ({placeOfSupply})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Inter-State</p>
                            <p className="text-xs text-muted-foreground">
                              Delhi (07) → {posState?.name} ({placeOfSupply})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-amber-500/5 px-3 py-2.5">
                  <input
                    id="reverseCharge-edit"
                    type="checkbox"
                    checked={reverseCharge}
                    onChange={(e) => setReverseCharge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-500"
                  />
                  <div>
                    <label htmlFor="reverseCharge-edit" className="text-sm font-medium cursor-pointer">
                      Reverse Charge Mechanism (RCM)
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check if tax is payable on reverse charge basis by the recipient
                    </p>
                  </div>
                </div>
                {reverseCharge && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Invoice will state: <strong>&quot;Tax is payable on reverse charge basis&quot;</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transport & E-Way Bill */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transport & E-Way Bill
                  </CardTitle>
                  <Button
                    type="button"
                    variant={showTransport ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowTransport(!showTransport)}
                  >
                    {showTransport ? "Hide" : "Add Details"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for inter-state movement of goods worth &gt; ₹50,000.
                </p>
              </CardHeader>
              {showTransport && (
                <CardContent className="space-y-5">
                  {/* Transporter Details */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Transporter Details
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Transporter Name</Label>
                        <Input
                          value={transporter.name}
                          onChange={(e) => updateTransporter("name", e.target.value)}
                          placeholder="e.g. Blue Dart Express"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Transporter GSTIN</Label>
                        <Input
                          value={transporter.transporterId}
                          onChange={(e) => updateTransporter("transporterId", e.target.value)}
                          placeholder="15-digit GSTIN"
                          className="font-mono"
                          maxLength={15}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>GR / LR / Consignment No.</Label>
                        <Input
                          value={transporter.docNumber}
                          onChange={(e) => updateTransporter("docNumber", e.target.value)}
                          placeholder="Transport doc number"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Transport Doc Date</Label>
                        <Input
                          type="date"
                          value={transporter.docDate}
                          onChange={(e) => updateTransporter("docDate", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Vehicle Number</Label>
                        <Input
                          value={transporter.vehicleNumber}
                          onChange={(e) => updateTransporter("vehicleNumber", e.target.value)}
                          placeholder="e.g. DL 01 AB 1234"
                          className="font-mono uppercase"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mode</Label>
                        <Select
                          value={transporter.mode ?? "road"}
                          onValueChange={(v) => v && updateTransporter("mode", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="road">Road</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
                            <SelectItem value="ship">Ship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Type</Label>
                        <Select
                          value={transporter.vehicleType ?? "regular"}
                          onValueChange={(v) => v && updateTransporter("vehicleType", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="over_dimensional_cargo">Over Dimensional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* E-Way Bill */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      E-Way Bill
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>E-Way Bill Number</Label>
                        <Input
                          value={ewayBill.ewayBillNumber}
                          onChange={(e) => updateEWayBill("ewayBillNumber", e.target.value)}
                          placeholder="12-digit EBN"
                          className="font-mono"
                          maxLength={12}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Generated On</Label>
                        <Input
                          type="date"
                          value={ewayBill.ewayBillDate}
                          onChange={(e) => updateEWayBill("ewayBillDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valid Until</Label>
                        <Input
                          type="date"
                          value={ewayBill.validUntil}
                          onChange={(e) => updateEWayBill("validUntil", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Line Items */}
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
                        {/* Row 1: Description */}
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          />
                        </div>
                        {/* Row 2: HSN/SAC + Unit */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{item.type === "product" ? "HSN Code" : "SAC Code"}</Label>
                            <Input
                              value={item.hsnSacCode ?? ""}
                              onChange={(e) => updateLineItem(index, "hsnSacCode", e.target.value)}
                              placeholder={item.type === "product" ? "e.g. 0901" : "e.g. 998314"}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit (UQC)</Label>
                            <Select
                              value={item.unit ?? "NOS"}
                              onValueChange={(v) => v && updateLineItem(index, "unit", v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UQC_CODES.map((u) => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Row 3: Qty + Price + GST Rate */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Qty</Label>
                            <Input type="number" min="0" step="0.01" value={item.quantity}
                              onChange={(e) => updateLineItem(index, "quantity", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price (₹)</Label>
                            <Input type="number" min="0" step="0.01" value={centsToDollars(item.unitPrice) || ""}
                              onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>GST Rate</Label>
                            <Select
                              value={String(item.taxRate)}
                              onValueChange={(v) => v !== null && updateLineItem(index, "taxRate", Number(v))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map((r) => (
                                  <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2 mt-1">
                      <span className="text-xs">
                        {gstType === "intrastate"
                          ? `CGST ${item.taxRate / 2}% + SGST ${item.taxRate / 2}%`
                          : `IGST ${item.taxRate}%`}
                      </span>
                      <span className="font-medium text-foreground">
                        Line total: {formatCurrency(item.amount + Math.round(item.amount * (item.taxRate / 100)))}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes & Terms */}
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

          {/* ── Right: Summary ── */}
          <div>
            <Card className="sticky top-6">
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Value</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

                {gstGroups.length > 0 && (
                  <div className="space-y-2 rounded-lg bg-muted/30 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tax Breakdown
                    </p>
                    {gstGroups.map((g) =>
                      g.rate === 0 ? null : gstType === "intrastate" ? (
                        <div key={g.rate} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CGST @{g.rate / 2}%</span>
                            <span className="font-mono">{formatCurrency(g.cgst)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">SGST @{g.rate / 2}%</span>
                            <span className="font-mono">{formatCurrency(g.sgst)}</span>
                          </div>
                        </div>
                      ) : (
                        <div key={g.rate} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">IGST @{g.rate}%</span>
                          <span className="font-mono">{formatCurrency(g.igst)}</span>
                        </div>
                      )
                    )}
                    <div className="flex justify-between text-xs font-medium pt-1 border-t">
                      <span>Total Tax</span>
                      <span className="font-mono">{formatCurrency(taxTotal)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Discount (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={discount}
                    onChange={(e) => setDiscount(e.target.value)} />
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-destructive">-{formatCurrency(discountCents)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
                {reverseCharge && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    * Tax payable on reverse charge basis
                  </p>
                )}
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
