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
import { Badge } from "@/components/ui/badge";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useCatalogStore } from "@/lib/store/catalog-store";
import {
  formatCurrency,
  todayISO,
  dollarsToCents,
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
import { useHydrated } from "@/lib/use-hydrated";
import type { LineItem, LineItemType, TransporterDetails, EWayBillDetails, Address } from "@/lib/types";
import { Plus, Trash2, Info, Truck } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

function emptyLineItem(): LineItem {
  return {
    id: nanoid(),
    type: "product",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 18, // default 18% GST
    hsnSacCode: "",
    unit: "NOS",
    amount: 0,
  };
}

export default function NewInvoicePage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const createInvoice = useInvoiceStore((s) => s.createInvoice);
  const finalizeInvoice = useInvoiceStore((s) => s.finalizeInvoice);
  const profile = useSettingsStore((s) => s.profile);
  const catalogItems = useCatalogStore((s) => s.items);

  const today = todayISO();
  const defaultDue = format(addDays(new Date(), 30), "yyyy-MM-dd");

  // Derive supplier state code from GSTIN (first 2 chars)
  const supplierCode = stateCodeFromGSTIN(profile.taxId || profile.supplierStateCode || "07");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(profile.defaultPaymentTerms);
  const [placeOfSupply, setPlaceOfSupply] = useState(supplierCode);
  const [gstType, setGstType] = useState<GSTType>(
    profile.defaultGSTType ?? "intrastate"
  );
  const [reverseCharge, setReverseCharge] = useState(false);

  // Transporter & E-Way Bill
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
  const emptyAddress: Address = { street: "", city: "", state: "", zip: "", country: "India" };
  const [differentShipTo, setDifferentShipTo] = useState(false);
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState<Address>(emptyAddress);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
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

  function applyFromCatalog(index: number, catalogId: string) {
    const item = catalogItems.find((c) => c.id === catalogId);
    if (!item) return;
    setLineItems((prev) => {
      const items = [...prev];
      const li = { ...items[index] };
      li.type = item.type;
      li.description = item.description;
      li.hsnSacCode = item.hsnSacCode;
      li.unit = item.unit;
      li.unitPrice = item.unitPrice;
      li.taxRate = item.taxRate;
      li.amount = calculateLineItemAmount(li.quantity, item.unitPrice);
      items[index] = li;
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
  const gstGroups = groupLineItemsByGSTRate(lineItems, gstType);

  function buildInvoiceData() {
    const hasTransporter = showTransport && transporter.name.trim();
    const hasEWayBill = showTransport && ewayBill.ewayBillNumber.trim();
    return {
      clientId,
      issueDate,
      dueDate,
      lineItems: lineItems.filter((li) => li.description.trim()),
      discount: discountCents,
      notes,
      terms,
      recurringTemplateId: "",
      gstType,
      placeOfSupply,
      reverseCharge,
      transporter: hasTransporter ? transporter : undefined,
      ewayBill: hasEWayBill ? ewayBill : undefined,
      shipToName: differentShipTo && shipToName.trim() ? shipToName : undefined,
      shipToAddress: differentShipTo && shipToAddress.street.trim() ? shipToAddress : undefined,
    };
  }

  function validate() {
    if (!clientId) { toast.error("Please select a client"); return false; }
    if (lineItems.every((li) => !li.description.trim())) { toast.error("Add at least one line item"); return false; }
    return true;
  }

  function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const invoice = createInvoice(buildInvoiceData());
    toast.success("Draft saved");
    router.push(`/invoices/${invoice.id}`);
  }

  function handleFinalize(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const invoice = createInvoice(buildInvoiceData());
    finalizeInvoice(invoice.id);
    // Re-read to get the assigned number
    toast.success("Invoice finalized");
    router.push(`/invoices/${invoice.id}`);
  }

  const posState = INDIAN_STATES.find((s) => s.code === placeOfSupply);

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create a new GST tax invoice" />

      <form onSubmit={handleSaveDraft}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Invoice Details */}
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No clients yet.{" "}
                      <a href="/clients/new" className="underline">Add one first</a>.
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
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
                              Supplier: Delhi (07) → {posState?.name} ({placeOfSupply})
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
                    id="reverseCharge"
                    type="checkbox"
                    checked={reverseCharge}
                    onChange={(e) => setReverseCharge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-500"
                  />
                  <div>
                    <label htmlFor="reverseCharge" className="text-sm font-medium cursor-pointer">
                      Reverse Charge Mechanism (RCM)
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check if tax is payable on reverse charge basis by the recipient (Section 9(3) / 9(4))
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
                  E-Way Bill is generated on{" "}
                  <span className="font-mono text-[10px]">ewaybillgst.gov.in</span>
                </p>
              </CardHeader>
              {showTransport && (
                <CardContent className="space-y-5">
                  {/* ── Transporter Details ── */}
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

                  {/* ── E-Way Bill ── */}
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
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        {/* Catalog selector */}
                        {catalogItems.length > 0 && (
                          <div className="space-y-2">
                            <Label>Select from Catalog</Label>
                            <Select
                              value=""
                              onValueChange={(v) => v && applyFromCatalog(index, v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a saved product or service…" />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogItems.filter((c) => c.type === "product").length > 0 && (
                                  <>
                                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Products</p>
                                    {catalogItems.filter((c) => c.type === "product").map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.description} — {formatCurrency(c.unitPrice)}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {catalogItems.filter((c) => c.type === "service").length > 0 && (
                                  <>
                                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Services</p>
                                    {catalogItems.filter((c) => c.type === "service").map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.description} — {formatCurrency(c.unitPrice)}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {/* Row 1: Description + Type */}
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(index, "description", e.target.value)
                              }
                              placeholder="Goods or service description"
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
                                <SelectItem value="product">Product</SelectItem>
                                <SelectItem value="service">Service</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Row 2: HSN/SAC + Unit */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>
                              {item.type === "product" ? "HSN Code" : "SAC Code"}
                            </Label>
                            <Input
                              value={item.hsnSacCode ?? ""}
                              onChange={(e) =>
                                updateLineItem(index, "hsnSacCode", e.target.value)
                              }
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
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
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
                            <Label>Unit Price (₹)</Label>
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
                            <Label>GST Rate</Label>
                            <Select
                              value={String(item.taxRate)}
                              onValueChange={(v) =>
                                v !== null && updateLineItem(index, "taxRate", Number(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map((r) => (
                                  <SelectItem key={r} value={String(r)}>
                                    {r}%
                                    {r === 0 ? " (Exempt/Nil)" : ""}
                                    {r === 5 ? " (Essentials)" : ""}
                                    {r === 12 ? " (Standard)" : ""}
                                    {r === 18 ? " (Standard)" : ""}
                                    {r === 28 ? " (Luxury)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2 mt-1">
                      <span>
                        Taxable: {formatCurrency(item.amount)}
                        {item.taxRate > 0 && (
                          <span className="ml-2 text-xs">
                            {gstType === "intrastate"
                              ? `CGST ${item.taxRate / 2}% + SGST ${item.taxRate / 2}%`
                              : `IGST ${item.taxRate}%`}
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-foreground">
                        Line total:{" "}
                        {formatCurrency(
                          item.amount + Math.round(item.amount * (item.taxRate / 100))
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes & Terms */}
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

          {/* ── Right: Summary ── */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Value</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

                {/* Per-rate GST breakdown */}
                {gstGroups.length > 0 && (
                  <div className="space-y-2 rounded-lg bg-muted/30 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tax Breakdown
                    </p>
                    {gstGroups.map((g) => (
                      <div key={g.rate} className="space-y-1">
                        {g.rate === 0 ? (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0% GST (Nil/Exempt)</span>
                            <span className="font-mono">₹0.00</span>
                          </div>
                        ) : gstType === "intrastate" ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                CGST @{g.rate / 2}%
                              </span>
                              <span className="font-mono">{formatCurrency(g.cgst)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                SGST @{g.rate / 2}%
                              </span>
                              <span className="font-mono">{formatCurrency(g.sgst)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              IGST @{g.rate}%
                            </span>
                            <span className="font-mono">{formatCurrency(g.igst)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-medium pt-1 border-t">
                      <span>Total Tax</span>
                      <span className="font-mono">{formatCurrency(taxTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Discount */}
                <div className="space-y-2">
                  <Label>Discount (₹)</Label>
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

                {reverseCharge && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                    * Tax payable on reverse charge basis
                  </p>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleFinalize}
                  >
                    Finalize Invoice
                  </Button>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                  >
                    Save as Draft
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
