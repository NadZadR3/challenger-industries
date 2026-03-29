"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientStore } from "@/lib/store/client-store";
import { useHydrated } from "@/lib/use-hydrated";
import { validateGSTIN } from "@/lib/gstin-validate";
import { toast } from "sonner";

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const hydrated = useHydrated();
  const { id } = use(params);
  const router = useRouter();
  const client = useClientStore((s) => s.getClient(id));
  const updateClient = useClientStore((s) => s.updateClient);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    taxId: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    notes: "",
  });
  const [gstinError, setGstinError] = useState("");

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        email: client.email,
        phone: client.phone,
        taxId: client.taxId || "",
        street: client.address.street,
        city: client.address.city,
        state: client.address.state,
        zip: client.address.zip,
        country: client.address.country,
        notes: client.notes,
      });
    }
  }, [client]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

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

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleGstinChange(value: string) {
    update("taxId", value.toUpperCase());
    if (value.trim()) {
      const result = validateGSTIN(value.trim());
      setGstinError(result.valid ? "" : result.error || "Invalid GSTIN");
    } else {
      setGstinError("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (form.taxId.trim()) {
      const result = validateGSTIN(form.taxId.trim());
      if (!result.valid) {
        toast.error(result.error || "Invalid GSTIN");
        return;
      }
    }
    updateClient(id, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      taxId: form.taxId.trim(),
      address: {
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        country: form.country.trim(),
      },
      notes: form.notes.trim(),
    });
    toast.success("Client updated");
    router.push(`/clients/${id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Client" description={client.name} />
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">GST / Tax ID</Label>
                <Input id="taxId" value={form.taxId} onChange={(e) => handleGstinChange(e.target.value)} className={`font-mono ${gstinError ? "border-destructive" : ""}`} maxLength={15} />
                {gstinError && <p className="text-xs text-destructive">{gstinError}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input id="street" value={form.street} onChange={(e) => update("street", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" value={form.zip} onChange={(e) => update("zip", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit">Save Changes</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
