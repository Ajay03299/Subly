"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  Package,
  FileText,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Activity,
  Search,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportData {
  overview: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    totalPayments: number;
    paymentCount: number;
    totalUsers: number;
    totalProducts: number;
    totalInvoices: number;
    overdueInvoiceCount: number;
  };
  subscriptionsByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  recentSubscriptions: Array<{
    id: string;
    subscriptionNo: string;
    customer: string;
    status: string;
    totalAmount: number;
    plan: string;
    billingPeriod: string;
    createdAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    customer: string;
    subscriptionNo: string;
    method: string;
    amount: number;
    paymentDate: string;
  }>;
  overdueInvoices: Array<{
    id: string;
    invoiceNo: string;
    customer: string;
    subscriptionNo: string;
    status: string;
    totalAmount: number;
    dueDate: string;
    issueDate: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  QUOTATION:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CONFIRMED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const SUB_STATUS_BAR_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  QUOTATION: "bg-blue-500",
  CONFIRMED: "bg-amber-500",
  ACTIVE: "bg-emerald-500",
  CLOSED: "bg-red-400",
};

const INV_STATUS_BAR_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  CONFIRMED: "bg-amber-500",
  PAID: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ReportingPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chartRange, setChartRange] = useState<"1m" | "6m" | "1y" | "10y">("1y");
  const [chartLoading, setChartLoading] = useState(false);
  const [animateChart, setAnimateChart] = useState(false);
  const chartAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN", "INTERNAL_USER"],
    redirectTo: "/",
  });

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* Full data fetch (initial load / manual refresh) */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reporting?range=${chartRange}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch reporting data");
      const json = await res.json();
      setData(json);
      // trigger bar animation
      setAnimateChart(false);
      if (chartAnimRef.current) clearTimeout(chartAnimRef.current);
      chartAnimRef.current = setTimeout(() => setAnimateChart(true), 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Chart-only fetch when range changes (no full-page reload) */
  const fetchChartData = useCallback(async (range: string) => {
    setChartLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reporting?range=${range}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) return;
      const json = await res.json();
      setData((prev) =>
        prev ? { ...prev, monthlyRevenue: json.monthlyRevenue } : json
      );
      // trigger bar animation
      setAnimateChart(false);
      if (chartAnimRef.current) clearTimeout(chartAnimRef.current);
      chartAnimRef.current = setTimeout(() => setAnimateChart(true), 30);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  /* When range changes, only re-fetch chart data */
  const handleRangeChange = useCallback(
    (range: "1m" | "6m" | "1y" | "10y") => {
      setChartRange(range);
      fetchChartData(range);
    },
    [fetchChartData]
  );

  /* ---- Filtered tables ---- */

  const filteredSubscriptions = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.recentSubscriptions;
    const q = search.toLowerCase();
    return data.recentSubscriptions.filter(
      (s) =>
        s.subscriptionNo.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.recentPayments;
    const q = search.toLowerCase();
    return data.recentPayments.filter(
      (p) =>
        p.subscriptionNo.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredOverdue = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.overdueInvoices;
    const q = search.toLowerCase();
    return data.overdueInvoices.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.subscriptionNo.toLowerCase().includes(q)
    );
  }, [data, search]);

  /* ---- Export CSV helper ---- */

  const exportCSV = useCallback(() => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Subscriptions", String(data.overview.totalSubscriptions)],
      ["Active Subscriptions", String(data.overview.activeSubscriptions)],
      ["Total Revenue", String(data.overview.totalRevenue)],
      ["Total Payments", String(data.overview.totalPayments)],
      ["Overdue Invoices", String(data.overview.overdueInvoiceCount)],
      ["Total Users", String(data.overview.totalUsers)],
      ["Total Products", String(data.overview.totalProducts)],
      [],
      ["Month", "Revenue", "Subscriptions"],
      ...data.monthlyRevenue.map((m) => [
        m.month,
        String(m.revenue),
        String(m.count),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporting-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  /* ---- Chart data (hooks must be before any early return) ---- */
  const maxRevenue = useMemo(
    () =>
      data
        ? Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1)
        : 1,
    [data]
  );
  const yTicks = useMemo(() => {
    const ticks = [0];
    if (maxRevenue > 0) {
      for (let i = 1; i <= 4; i++) {
        ticks.push((maxRevenue * i) / 4);
      }
    }
    return ticks;
  }, [maxRevenue]);

  /* ---- Loading / Error states ---- */

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading reporting data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-center text-sm text-destructive">{error}</p>
            <Button onClick={fetchData} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { overview, subscriptionsByStatus, invoicesByStatus, monthlyRevenue } =
    data;

  const totalSubsForBar = Math.max(overview.totalSubscriptions, 1);
  const totalInvsForBar = Math.max(overview.totalInvoices, 1);
  const CHART_HEIGHT = 320;
  const X_LABEL_HEIGHT = 28;
  const BAR_AREA_HEIGHT = CHART_HEIGHT - X_LABEL_HEIGHT;
  const MIN_BAR_HEIGHT = 6;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Analytics, revenue, and subscription insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={fetchData}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Subscriptions */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overview.activeSubscriptions}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {overview.totalSubscriptions} total subscriptions
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${(overview.activeSubscriptions / Math.max(overview.totalSubscriptions, 1)) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(overview.totalRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              From confirmed & active subscriptions
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payments Collected
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <CreditCard className="h-5 w-5 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(overview.totalPayments)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.paymentCount} payment
              {overview.paymentCount !== 1 ? "s" : ""} recorded
            </p>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Invoices
            </CardTitle>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${overview.overdueInvoiceCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${overview.overdueInvoiceCount > 0 ? "text-red-600" : "text-emerald-600"}`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${overview.overdueInvoiceCount > 0 ? "text-red-600" : ""}`}
            >
              {overview.overdueInvoiceCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.overdueInvoiceCount > 0
                ? "Action required — past due date"
                : "All invoices on track"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Secondary KPIs ──────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.totalProducts}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
              <FileText className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overview.totalInvoices}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ──────────────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue Bar Chart — Y-axis, range selector, full-width chart */}
        <Card className="flex min-h-[420px] flex-col">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Revenue
              </CardTitle>
              <CardDescription>
                Select a time range to view revenue over time
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {chartLoading && (
                <RefreshCcw className="mr-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {(
                [
                  { value: "1m" as const, label: "1 Month" },
                  { value: "6m" as const, label: "6 Months" },
                  { value: "1y" as const, label: "1 Year" },
                  { value: "10y" as const, label: "1 Decade" },
                ] as const
              ).map(({ value, label }) => (
                <Button
                  key={value}
                  variant={chartRange === value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  disabled={chartLoading}
                  onClick={() => handleRangeChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-4">
            <div
              className="flex flex-1 items-stretch gap-3"
              style={{ minHeight: CHART_HEIGHT + 8 }}
            >
              {/* Y-axis */}
              <div
                className="flex flex-col justify-between py-1 text-right text-[10px] text-muted-foreground tabular-nums"
                style={{ width: 52, height: CHART_HEIGHT }}
              >
                {[...yTicks].reverse().map((tick, i) => (
                  <span key={i}>{formatCurrency(tick)}</span>
                ))}
              </div>
              {/* Chart area */}
              <div className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
                <div
                  className="flex items-end gap-1.5 pb-0"
                  style={{ height: BAR_AREA_HEIGHT }}
                >
                  {monthlyRevenue.map((m, index) => {
                    const targetHeight = Math.max(
                      (m.revenue / maxRevenue) * BAR_AREA_HEIGHT,
                      MIN_BAR_HEIGHT
                    );
                    return (
                      <div
                        key={`${m.month}-${index}`}
                        className="group relative flex flex-1 flex-col items-center justify-end"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap"
                        >
                          <p className="font-semibold">
                            {formatCurrency(m.revenue)}
                          </p>
                          <p className="text-muted-foreground">
                            {m.count} subscription{m.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div
                          className="w-full rounded-t-sm bg-primary/80 bg-primary"
                          style={{
                            height: animateChart ? targetHeight : MIN_BAR_HEIGHT,
                            transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.04}s`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div
                  className="mt-1.5 flex items-center gap-1.5"
                  style={{ height: X_LABEL_HEIGHT }}
                >
                  {monthlyRevenue.map((m, i) => (
                    <span
                      key={i}
                      className="flex-1 truncate text-center text-[10px] text-muted-foreground"
                      title={m.month}
                    >
                      {m.month.startsWith("Week ")
                        ? `W${m.month.split(" ")[1] ?? i + 1}`
                        : m.month.split(" ")[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Subscription Breakdown
            </CardTitle>
            <CardDescription>By current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(subscriptionsByStatus).map(([status, count]) => {
                const pct = (count / totalSubsForBar) * 100;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{status}</span>
                      <span className="text-muted-foreground">
                        {count}{" "}
                        <span className="text-xs">
                          ({pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${SUB_STATUS_BAR_COLORS[status] || "bg-primary"}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invoice Status Sub-section */}
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                Invoice Status
              </h4>
              <div className="space-y-3">
                {Object.entries(invoicesByStatus).map(([status, count]) => {
                  const pct = (count / totalInvsForBar) * 100;
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{status}</span>
                        <span className="text-muted-foreground">
                          {count}{" "}
                          <span className="text-xs">
                            ({pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${INV_STATUS_BAR_COLORS[status] || "bg-primary"}`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Data Tables (Tabs) ──────────────────────────── */}
      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Recent Subscriptions
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Recent Payments
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue Invoices
            {overview.overdueInvoiceCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 h-5 min-w-5 px-1 text-[10px]"
              >
                {overview.overdueInvoiceCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- Recent Subscriptions ---- */}
        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">
                          {s.subscriptionNo.slice(0, 10)}...
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {s.customer}
                        </TableCell>
                        <TableCell className="text-sm">{s.plan}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {s.billingPeriod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(s.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(s.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Recent Payments ---- */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {p.customer}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.subscriptionNo.slice(0, 10)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.method.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.paymentDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Overdue Invoices ---- */}
        <TabsContent value="overdue">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverdue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {overview.overdueInvoiceCount === 0
                          ? "No overdue invoices — all clear!"
                          : "No matching overdue invoices"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOverdue.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">
                          {inv.invoiceNo.slice(0, 10)}...
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {inv.customer}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {inv.subscriptionNo.slice(0, 10)}...
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <ArrowDownRight className="h-3 w-3" />
                            {daysOverdue(inv.dueDate)}d
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
