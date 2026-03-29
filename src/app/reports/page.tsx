"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency, formatDate, centsToDollars } from "@/lib/format";
import { groupLineItemsByGSTRate } from "@/lib/gst";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  parseISO,
  format,
  differenceInDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isValid,
} from "date-fns";
import {
  BarChart3,
  Clock,
  Receipt,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Invoice, Client } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

export default function ReportsPage() {
  const hydrated = useHydrated();
  const invoices = useInvoiceStore((s) => s.invoices);
  const clients = useClientStore((s) => s.clients);
  const payments = usePaymentStore((s) => s.payments);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = subMonths(new Date(), 12);
    return format(d, "yyyy-MM-dd");
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (!inv.issueDate) return false;
    return inv.issueDate >= dateFrom && inv.issueDate <= dateTo;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Revenue summaries, aging, and tax reports"
      />

      {/* Date range filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} in range
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">
            <TrendingUp className="mr-1.5 h-3 w-3" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="aging">
            <Clock className="mr-1.5 h-3 w-3" />
            Aging
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Receipt className="mr-1.5 h-3 w-3" />
            Tax (GST)
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="mr-1.5 h-3 w-3" />
            Clients
          </TabsTrigger>
        </TabsList>

        {/* ── Revenue Report ─────────────────────────── */}
        <TabsContent value="revenue">
          <RevenueReport invoices={filteredInvoices} dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        {/* ── Aging Report ────────────────────────────── */}
        <TabsContent value="aging">
          <AgingReport invoices={invoices} clients={clients} />
        </TabsContent>

        {/* ── Tax Report ──────────────────────────────── */}
        <TabsContent value="tax">
          <TaxReport invoices={filteredInvoices} />
        </TabsContent>

        {/* ── Client Report ───────────────────────────── */}
        <TabsContent value="clients">
          <ClientReport invoices={filteredInvoices} clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Revenue Report ───────────────────────────────────────────

function RevenueReport({
  invoices,
  dateFrom,
  dateTo,
}: {
  invoices: Invoice[];
  dateFrom: string;
  dateTo: string;
}) {
  const totalBilled = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.balanceDue, 0);
  const totalTax = invoices.reduce((sum, i) => sum + i.taxTotal, 0);

  // Monthly revenue chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { billed: number; collected: number }> = {};
    for (const inv of invoices) {
      if (!inv.issueDate) continue;
      const key = inv.issueDate.substring(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { billed: 0, collected: 0 };
      months[key].billed += inv.total;
      if (inv.status === "paid") months[key].collected += inv.total;
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const d = parseISO(`${key}-01`);
        return {
          month: isValid(d) ? format(d, "MMM yy") : key,
          billed: centsToDollars(data.billed),
          collected: centsToDollars(data.collected),
        };
      });
  }, [invoices]);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Billed" value={formatCurrency(totalBilled)} icon={BarChart3} />
        <StatCard label="Collected" value={formatCurrency(totalPaid)} icon={TrendingUp} color="text-emerald-500" />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={Clock} color="text-blue-500" />
        <StatCard label="Total GST" value={formatCurrency(totalTax)} icon={Receipt} color="text-amber-500" />
      </div>

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                  />
                  <Bar dataKey="billed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Billed" />
                  <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Aging Report ─────────────────────────────────────────────

interface AgingBucket {
  label: string;
  count: number;
  amount: number;
}

function AgingReport({
  invoices,
  clients,
}: {
  invoices: Invoice[];
  clients: Client[];
}) {
  const today = new Date();
  const unpaid = invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue"
  );

  const buckets: AgingBucket[] = useMemo(() => {
    const b = [
      { label: "Current", count: 0, amount: 0, min: -Infinity, max: 0 },
      { label: "1-30 days", count: 0, amount: 0, min: 1, max: 30 },
      { label: "31-60 days", count: 0, amount: 0, min: 31, max: 60 },
      { label: "61-90 days", count: 0, amount: 0, min: 61, max: 90 },
      { label: "90+ days", count: 0, amount: 0, min: 91, max: Infinity },
    ];
    for (const inv of unpaid) {
      const dueDate = parseISO(inv.dueDate);
      const days = differenceInDays(today, dueDate);
      for (const bucket of b) {
        if (days >= bucket.min && days <= bucket.max) {
          bucket.count++;
          bucket.amount += inv.balanceDue;
          break;
        }
      }
    }
    return b;
  }, [unpaid]);

  const totalOverdue = unpaid.reduce((sum, i) => sum + i.balanceDue, 0);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOverdue)}
          icon={AlertTriangle}
          color="text-red-500"
        />
        <StatCard
          label="Unpaid Invoices"
          value={unpaid.length.toString()}
          icon={Clock}
          color="text-amber-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aging Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((b) => (
                <TableRow key={b.label}>
                  <TableCell className="font-medium">{b.label}</TableCell>
                  <TableCell className="text-right font-mono">{b.count}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(b.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">{unpaid.length}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalOverdue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {unpaid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaid
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((inv) => {
                    const client = clients.find((c) => c.id === inv.clientId);
                    const days = differenceInDays(today, parseISO(inv.dueDate));
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>{client?.name || "Unknown"}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {days > 0 ? (
                            <span className="text-red-400">{days}d</span>
                          ) : (
                            <span className="text-emerald-400">Current</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(inv.balanceDue)}
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

// ── Tax Report (GST) ─────────────────────────────────────────

function TaxReport({ invoices }: { invoices: Invoice[] }) {
  // Only include non-cancelled invoices
  const taxable = invoices.filter((i) => i.status !== "cancelled");

  const totals = useMemo(() => {
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    const rateMap = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();

    for (const inv of taxable) {
      const gstType = inv.gstType ?? "intrastate";
      const groups = groupLineItemsByGSTRate(inv.lineItems, gstType);
      for (const g of groups) {
        totalTaxable += g.taxableAmount;
        totalCgst += g.cgst;
        totalSgst += g.sgst;
        totalIgst += g.igst;
        totalTax += g.taxAmount;

        const existing = rateMap.get(g.rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        rateMap.set(g.rate, {
          taxable: existing.taxable + g.taxableAmount,
          cgst: existing.cgst + g.cgst,
          sgst: existing.sgst + g.sgst,
          igst: existing.igst + g.igst,
        });
      }
    }

    const byRate = Array.from(rateMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rate, data]) => ({ rate, ...data }));

    return { totalTaxable, totalCgst, totalSgst, totalIgst, totalTax, byRate };
  }, [taxable]);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Taxable Value" value={formatCurrency(totals.totalTaxable)} icon={Receipt} />
        <StatCard label="CGST Collected" value={formatCurrency(totals.totalCgst)} icon={Receipt} color="text-blue-500" />
        <StatCard label="SGST Collected" value={formatCurrency(totals.totalSgst)} icon={Receipt} color="text-indigo-500" />
        <StatCard label="IGST Collected" value={formatCurrency(totals.totalIgst)} icon={Receipt} color="text-purple-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Summary by Rate</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GST Rate</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.byRate.map((r) => (
                <TableRow key={r.rate}>
                  <TableCell className="font-medium">{r.rate}%</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(r.taxable)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(r.cgst)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(r.sgst)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(r.igst)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(r.cgst + r.sgst + r.igst)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalTaxable)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalCgst)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalSgst)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalIgst)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totals.totalTax)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Client Report ────────────────────────────────────────────

function ClientReport({
  invoices,
  clients,
}: {
  invoices: Invoice[];
  clients: Client[];
}) {
  const clientData = useMemo(() => {
    const map = new Map<
      string,
      { billed: number; paid: number; outstanding: number; count: number }
    >();
    for (const inv of invoices) {
      const existing = map.get(inv.clientId) ?? {
        billed: 0,
        paid: 0,
        outstanding: 0,
        count: 0,
      };
      existing.billed += inv.total;
      existing.count++;
      if (inv.status === "paid") {
        existing.paid += inv.total;
      } else if (inv.status === "sent" || inv.status === "overdue") {
        existing.outstanding += inv.balanceDue;
      }
      map.set(inv.clientId, existing);
    }

    return Array.from(map.entries())
      .map(([clientId, data]) => {
        const client = clients.find((c) => c.id === clientId);
        return {
          clientId,
          name: client?.name || "Unknown",
          ...data,
        };
      })
      .sort((a, b) => b.billed - a.billed);
  }, [invoices, clients]);

  const chartData = clientData.slice(0, 10).map((c) => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "…" : c.name,
    billed: centsToDollars(c.billed),
    paid: centsToDollars(c.paid),
  }));

  return (
    <div className="space-y-6 mt-4">
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#3f3f46" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                  />
                  <Bar dataKey="billed" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Billed" />
                  <Bar dataKey="paid" fill="#10b981" radius={[0, 4, 4, 0]} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientData.map((c) => (
                <TableRow key={c.clientId}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-mono">{c.count}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(c.billed)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">
                    {formatCurrency(c.paid)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {c.outstanding > 0 ? (
                      <span className="text-amber-400">{formatCurrency(c.outstanding)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {clientData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No invoices in this date range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared Stat Card ─────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          </div>
          <Icon className={`h-5 w-5 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}
