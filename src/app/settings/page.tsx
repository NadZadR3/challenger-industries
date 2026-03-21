"use client";

import { nanoid } from "nanoid";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { RegistrationNumber } from "@/lib/types";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import {
  Building,
  MapPin,
  FileText,
  Database,
  Plus,
  Trash2,
  ShieldCheck,
  Download,
  Upload,
  Save,
  ImageIcon,
  Landmark,
  PenLine,
} from "lucide-react";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const profile = useSettingsStore((s) => s.profile);
  const updateProfile = useSettingsStore((s) => s.updateProfile);

  const [form, setForm] = useState(profile);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAddress(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  }

  function updateAddress2(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      address2: { ...(prev.address2 ?? { street: "", city: "", state: "", zip: "", country: "India" }), [field]: value },
    }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((prev) => ({ ...prev, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function handleImageUpload(field: "signatureImage" | "stampImage") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setForm((prev) => ({ ...prev, [field]: dataUrl }));
      };
      reader.readAsDataURL(file);
    };
  }

  function updateBankDetails(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      bankDetails: {
        ...(prev.bankDetails ?? {
          accountHolder: "", bankName: "", branch: "", accountNumber: "",
          ifscCode: "", accountType: "current" as const, swiftCode: "", upiId: "",
        }),
        [field]: value,
      },
    }));
  }

  function addRegistration() {
    setForm((prev) => ({
      ...prev,
      registrations: [
        ...prev.registrations,
        { id: nanoid(), label: "", value: "" },
      ],
    }));
  }

  function updateRegistration(id: string, field: keyof RegistrationNumber, value: string) {
    setForm((prev) => ({
      ...prev,
      registrations: prev.registrations.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
  }

  function removeRegistration(id: string) {
    setForm((prev) => ({
      ...prev,
      registrations: prev.registrations.filter((r) => r.id !== id),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfile(form);
    toast.success("Settings saved");
  }

  function handleExport() {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("challenger-")) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `challenger-industries-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith("challenger-") && typeof value === "string") {
            localStorage.setItem(key, value);
          }
        }
        toast.success("Data imported — please refresh the page");
      } catch {
        toast.error("Invalid backup file");
      }
    };
    input.click();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your business profile and preferences"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Business Info ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Appears on your invoices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Challenger Industries"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="billing@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">GSTN / Tax ID</Label>
                  <Input
                    id="taxId"
                    value={form.taxId}
                    onChange={(e) => update("taxId", e.target.value)}
                    placeholder="07XXXXXXXXXX1ZX"
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Primary Address</CardTitle>
                  <CardDescription>Main office — printed on invoice header</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={form.address.street}
                  onChange={(e) => updateAddress("street", e.target.value)}
                  placeholder="2988, Shah Ganj, Ajmeri Gate"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">PIN Code</Label>
                  <Input
                    id="zip"
                    value={form.address.zip}
                    onChange={(e) => updateAddress("zip", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Second Address + Logo ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Second Address</CardTitle>
                  <CardDescription>Warehouse / branch — also printed on invoice</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street2">Street Address</Label>
                <Input
                  id="street2"
                  value={form.address2?.street ?? ""}
                  onChange={(e) => updateAddress2("street", e.target.value)}
                  placeholder="C-6/1, Street No. 9, Wazirabad Village"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city2">City</Label>
                  <Input
                    id="city2"
                    value={form.address2?.city ?? ""}
                    onChange={(e) => updateAddress2("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip2">PIN Code</Label>
                  <Input
                    id="zip2"
                    value={form.address2?.zip ?? ""}
                    onChange={(e) => updateAddress2("zip", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <ImageIcon className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle>Company Logo</CardTitle>
                  <CardDescription>Displayed on invoice header (PNG, JPG, SVG)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.logo ? (
                <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logo}
                    alt="Company logo"
                    className="h-16 max-w-[180px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, logo: "" }))}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div>
                    <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">No logo uploaded</p>
                  </div>
                </div>
              )}
              <label htmlFor="logo-upload">
                <div className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {form.logo ? "Change Logo" : "Upload Logo"}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* ── Registration Numbers ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Registration & License Numbers</CardTitle>
                  <CardDescription>
                    FDA, GST, FSSAI, CIN, MSME, Import/Export codes, and other regulatory registrations.
                    These appear on your invoices.
                  </CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRegistration}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {form.registrations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No registration numbers added yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your FDA, GST, FSSAI, or other registration numbers to display them on invoices.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={addRegistration}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Registration Number
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {form.registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="grid flex-1 gap-3 sm:grid-cols-[200px_1fr]">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Label (e.g. FSSAI, GST)
                        </Label>
                        <Input
                          value={reg.label}
                          onChange={(e) =>
                            updateRegistration(reg.id, "label", e.target.value)
                          }
                          placeholder="FSSAI"
                          className="font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Registration Number
                        </Label>
                        <Input
                          value={reg.value}
                          onChange={(e) =>
                            updateRegistration(reg.id, "value", e.target.value)
                          }
                          placeholder="12345678901234"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-5 shrink-0"
                      onClick={() => removeRegistration(reg.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Common labels: FSSAI, GSTIN, FDA Lic., CIN, MSME/Udyam, IEC, Drug Lic., PAN
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Bank Account Details ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                <Landmark className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                  Printed on invoices so customers can remit payment directly.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input
                  id="accountHolder"
                  value={form.bankDetails?.accountHolder ?? ""}
                  onChange={(e) => updateBankDetails("accountHolder", e.target.value)}
                  placeholder="Challenger Industries"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={form.bankDetails?.bankName ?? ""}
                  onChange={(e) => updateBankDetails("bankName", e.target.value)}
                  placeholder="e.g. State Bank of India"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={form.bankDetails?.accountNumber ?? ""}
                  onChange={(e) => updateBankDetails("accountNumber", e.target.value)}
                  placeholder="Account number"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={form.bankDetails?.ifscCode ?? ""}
                  onChange={(e) => updateBankDetails("ifscCode", e.target.value)}
                  placeholder="e.g. SBIN0001234"
                  className="font-mono uppercase"
                  maxLength={11}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={form.bankDetails?.branch ?? ""}
                  onChange={(e) => updateBankDetails("branch", e.target.value)}
                  placeholder="e.g. Ajmeri Gate, Delhi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select
                  value={form.bankDetails?.accountType ?? "current"}
                  onValueChange={(v) => v && updateBankDetails("accountType", v)}
                >
                  <SelectTrigger id="accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="swiftCode">SWIFT Code</Label>
                <Input
                  id="swiftCode"
                  value={form.bankDetails?.swiftCode ?? ""}
                  onChange={(e) => updateBankDetails("swiftCode", e.target.value)}
                  placeholder="e.g. SBININBB"
                  className="font-mono uppercase"
                  maxLength={11}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                value={form.bankDetails?.upiId ?? ""}
                onChange={(e) => updateBankDetails("upiId", e.target.value)}
                placeholder="e.g. company@bank"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Optional — shown on invoice if provided, for quick UPI payments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Signature & Stamp ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                <PenLine className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <CardTitle>Signature & Stamp</CardTitle>
                <CardDescription>
                  Uploaded images appear in the Authorized Signatory section on invoices.
                  Leave blank to get a dotted line for manual signing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="authorizedSignatory">Authorized Signatory Name</Label>
              <Input
                id="authorizedSignatory"
                value={form.authorizedSignatory ?? ""}
                onChange={(e) => update("authorizedSignatory", e.target.value)}
                placeholder={form.name || "Signatory name"}
              />
              <p className="text-xs text-muted-foreground">
                Falls back to company name if left empty.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Signature upload */}
              <div className="space-y-2">
                <Label>Signature Image</Label>
                {form.signatureImage ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.signatureImage}
                      alt="Signature"
                      className="h-12 max-w-[140px] object-contain"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, signatureImage: "" }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">No signature uploaded</p>
                  </div>
                )}
                <label htmlFor="signature-upload">
                  <div className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {form.signatureImage ? "Change" : "Upload Signature"}
                  </div>
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload("signatureImage")}
                  />
                </label>
              </div>

              {/* Stamp upload */}
              <div className="space-y-2">
                <Label>Company Stamp / Seal</Label>
                {form.stampImage ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.stampImage}
                      alt="Company stamp"
                      className="h-16 max-w-[140px] object-contain"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, stampImage: "" }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">No stamp uploaded</p>
                  </div>
                )}
                <label htmlFor="stamp-upload">
                  <div className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {form.stampImage ? "Change" : "Upload Stamp"}
                  </div>
                  <input
                    id="stamp-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload("stampImage")}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Defaults + Data Management ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Invoice Defaults</CardTitle>
                  <CardDescription>Applied to new invoices automatically</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input
                    id="invoicePrefix"
                    value={form.invoicePrefix}
                    onChange={(e) => update("invoicePrefix", e.target.value)}
                    placeholder="INV"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextInvoiceNumber">Next Invoice #</Label>
                  <Input
                    id="nextInvoiceNumber"
                    type="number"
                    min="1"
                    value={form.nextInvoiceNumber}
                    onChange={(e) =>
                      update("nextInvoiceNumber", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.defaultTaxRate}
                    onChange={(e) =>
                      update("defaultTaxRate", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultPaymentTerms">Payment Terms</Label>
                  <Input
                    id="defaultPaymentTerms"
                    value={form.defaultPaymentTerms}
                    onChange={(e) => update("defaultPaymentTerms", e.target.value)}
                    placeholder="Net 30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  placeholder="USD"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Database className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Back up or restore your data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button type="button" variant="outline" onClick={handleImport}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </Button>
              </div>
              <Separator />
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All data is stored in your browser&apos;s localStorage. Export regularly
                  to back up your invoices, clients, and settings. Importing will
                  overwrite existing data after a page refresh.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <Button type="submit" size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save All Settings
          </Button>
          <p className="text-sm text-muted-foreground">
            Changes are saved to your browser.
          </p>
        </div>
      </form>
    </div>
  );
}
