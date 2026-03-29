"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { useClientStore } from "@/lib/store/client-store";
import { usePaymentStore } from "@/lib/store/payment-store";
import { formatCurrency, formatDate, centsToDollars } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { parseISO, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const PIE_COLORS = ["#71717a", "#3b82f6", "#10b981", "#ef4444", "#6b7280"];
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export default function DashboardPage() {
  const hydrated = useHydrated();
  const invoices = useInvoiceStore((s) => s.invoices);
  const clients = useClientStore((s) => s.clients);
  const payments = usePaymentStore((s) => s.payments);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.balanceDue, 0);
  const overdueAmount = invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.balanceDue, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const draftCount = invoices.filter((i) => i.status === "draft").length;

  // Revenue by month (last 6 months)
  const now = new Date();
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const label = format(monthDate, "MMM yy");
    const revenue = invoices
      .filter(
        (inv) =>
          inv.status === "paid" &&
          inv.issueDate &&
          isWithinInterval(parseISO(inv.issueDate), { start, end })
      )
      .reduce((sum, inv) => sum + inv.total, 0);
    return { month: label, revenue: centsToDollars(revenue) };
  });

  // Invoice status breakdown for pie chart
  const statusBreakdown = (["draft", "sent", "paid", "overdue", "cancelled"] as InvoiceStatus[])
    .map((status, idx) => ({
      name: STATUS_LABELS[status],
      value: invoices.filter((i) => i.status === status).length,
      color: PIE_COLORS[idx],
    }))
    .filter((s) => s.value > 0);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      description: `${invoices.filter((i) => i.status === "paid").length} paid invoices`,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "Outstanding",
      value: formatCurrency(outstanding),
      icon: Clock,
      description: `${invoices.filter((i) => i.status === "sent").length} awaiting payment`,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Overdue",
      value: overdueCount > 0 ? formatCurrency(overdueAmount) : formatCurrency(0),
      icon: AlertTriangle,
      description: overdueCount > 0 ? `${overdueCount} need${overdueCount === 1 ? "s" : ""} attention` : "All clear",
      iconBg: overdueCount > 0 ? "bg-red-500/10" : "bg-zinc-500/10",
      iconColor: overdueCount > 0 ? "text-red-500" : "text-zinc-500",
    },
    {
      title: "Drafts",
      value: draftCount.toString(),
      icon: FileText,
      description: `${invoices.length} total invoices`,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${clients.length} clients · ${invoices.length} invoices · ${payments.length} payments`}
      >
        <Link href="/invoices/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {invoices.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Revenue (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth}>
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
                      formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusBreakdown.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value) => (
                          <span style={{ color: "#a1a1aa" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No invoices to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices */}
        <div className="lg:col-span-2">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium">No invoices yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Create your first invoice to get started.
                </p>
                <Link href="/invoices/new" className={buttonVariants({ variant: "outline" })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Invoices</CardTitle>
                <Link
                  href="/invoices"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoices
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .slice(0, 6)
                    .map((inv) => {
                      const client = clients.find((c) => c.id === inv.clientId);
                      return (
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
                                {client?.name || "Unknown client"} · {formatDate(inv.issueDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium font-mono">
                                {formatCurrency(inv.total)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${statusColors[inv.status]}`}
                            >
                              {inv.status}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle>Quick Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Clients</span>
                  <span className="font-medium font-mono">{clients.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Invoices</span>
                  <span className="font-medium font-mono">{invoices.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Payments</span>
                  <span className="font-medium font-mono">{payments.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Invoice</span>
                  <span className="font-medium font-mono">
                    {invoices.length > 0
                      ? formatCurrency(
                          Math.round(invoices.reduce((s, i) => s + i.total, 0) / invoices.length)
                        )
                      : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {overdueCount > 0 && (
            <Card className="border-red-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <CardTitle className="text-red-400">Overdue Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoices
                  .filter((i) => i.status === "overdue")
                  .slice(0, 3)
                  .map((inv) => {
                    const client = clients.find((c) => c.id === inv.clientId);
                    return (
                      <Link
                        key={inv.id}
                        href={`/invoices/${inv.id}`}
                        className="flex justify-between text-sm rounded-lg p-2 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-mono text-xs">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{client?.name}</p>
                        </div>
                        <span className="font-mono text-red-400 font-medium">
                          {formatCurrency(inv.balanceDue)}
                        </span>
                      </Link>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
