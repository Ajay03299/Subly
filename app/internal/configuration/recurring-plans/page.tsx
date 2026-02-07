"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Save,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  FileText,
  Users,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlanProduct {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  variants?: Array<{
    id: string;
    attribute: string;
    value: string;
    extraPrice: number;
  }>;
}

interface PlanSubscription {
  id: string;
  subscriptionNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user?: { email: string };
}

interface RecurringPlan {
  id: string;
  billingPeriod: string;
  autoClose: boolean;
  closeable: boolean;
  renewable: boolean;
  pausable: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  products?: PlanProduct[];
  subscriptions?: PlanSubscription[];
}

interface ProductOption {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
}

const BILLING_PERIODS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

function statusColor(s: string) {
  switch (s) {
    case "ACTIVE":
      return "default";
    case "DRAFT":
      return "secondary";
    case "QUOTATION":
      return "outline";
    case "CLOSED":
      return "destructive";
    default:
      return "secondary";
  }
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function RecurringPlansPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const getToken = useCallback(
    () => localStorage.getItem("accessToken") ?? "",
    []
  );

  /* ── state ──────────────────────────────────────────── */
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // view: "list" | plan id | "create"
  const [view, setView] = useState<string>("list");
  const [activePlan, setActivePlan] = useState<RecurringPlan | null>(null);

  /* ── form state ─────────────────────────────────────── */

  const [formBillingPeriod, setFormBillingPeriod] = useState("MONTHLY");
  const [formAutoClose, setFormAutoClose] = useState(false);
  const [formCloseable, setFormCloseable] = useState(true);
  const [formRenewable, setFormRenewable] = useState(true);
  const [formPausable, setFormPausable] = useState(false);
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEndDate, setFormEndDate] = useState("");

  /* ── fetch plans ────────────────────────────────────── */
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/recurring-plans", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /* ── fetch single plan ──────────────────────────────── */
  const fetchPlan = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/recurring-plans/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Failed to fetch plan");
        const data = await res.json();
        setActivePlan(data.plan);
        populateForm(data.plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  /* ── fetch products for dropdown ────────────────────── */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(
        (data.products || []).map((p: ProductOption) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          salesPrice: p.salesPrice,
        }))
      );
    } catch {
      // silent
    }
  }, [getToken]);

  /* ── populate form from plan ────────────────────────── */
  function populateForm(plan: RecurringPlan) {
    setFormBillingPeriod(plan.billingPeriod);
    setFormAutoClose(plan.autoClose);
    setFormCloseable(plan.closeable);
    setFormRenewable(plan.renewable);
    setFormPausable(plan.pausable);
    setFormStartDate(
      plan.startDate ? new Date(plan.startDate).toISOString().split("T")[0] : ""
    );
    setFormEndDate(
      plan.endDate ? new Date(plan.endDate).toISOString().split("T")[0] : ""
    );
  }

  function resetForm() {
    setFormBillingPeriod("MONTHLY");
    setFormAutoClose(false);
    setFormCloseable(true);
    setFormRenewable(true);
    setFormPausable(false);
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
  }

  /* ── initial fetch ──────────────────────────────────── */
  useEffect(() => {
    if (!authLoading) {
      fetchPlans();
      fetchProducts();
    }
  }, [authLoading, fetchPlans, fetchProducts]);

  /* ── navigate to detail ─────────────────────────────── */
  function openPlan(id: string) {
    setView(id);
    setError(null);
    setSuccess(null);
    fetchPlan(id);
  }

  function openCreate() {
    setView("create");
    setActivePlan(null);
    resetForm();
    setError(null);
    setSuccess(null);
  }

  function goBack() {
    setView("list");
    setActivePlan(null);
    setError(null);
    setSuccess(null);
    fetchPlans();
  }

  /* ── save (create / update) ─────────────────────────── */
  async function handleSave() {
    const payload = {
      billingPeriod: formBillingPeriod,
      autoClose: formAutoClose,
      closeable: formCloseable,
      renewable: formRenewable,
      pausable: formPausable,
      startDate: formStartDate || new Date().toISOString(),
      endDate: formEndDate || null,
    };

    try {
      setSaving(true);
      setError(null);

      const isEdit = view !== "create";
      const url = isEdit
        ? `/api/admin/recurring-plans/${view}`
        : "/api/admin/recurring-plans";

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to save");
      }

      const data = await res.json();
      setSuccess(isEdit ? "Plan updated" : "Plan created");

      if (!isEdit) {
        // Navigate to the new plan
        const newPlan = data.recurringPlan || data.plan;
        if (newPlan?.id) {
          openPlan(newPlan.id);
        } else {
          goBack();
        }
      } else {
        // Refresh plan details
        fetchPlan(view);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ── delete ─────────────────────────────────────────── */
  async function handleDelete() {
    if (!activePlan) return;
    if (!confirm("Delete this recurring plan? This cannot be undone.")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/recurring-plans/${activePlan.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to delete");
      }

      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  /* ── loading / auth gate ────────────────────────────── */
  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── filtered list ──────────────────────────────────── */
  const filtered = plans.filter(
    (p) =>
      p.billingPeriod.toLowerCase().includes(search.toLowerCase()) ||
      p.products?.some((prod) => prod.name.toLowerCase().includes(search.toLowerCase()))
  );

  const isDetail = view !== "list" && view !== "create";
  const isCreate = view === "create";

  /* ════════════════════════════════════════════════════════ */
  /*  DETAIL / CREATE VIEW                                    */
  /* ════════════════════════════════════════════════════════ */
  if (isDetail || isCreate) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isCreate
                ? "New Recurring Plan"
                : "Recurring Plan"}
            </h1>
            {!isCreate && activePlan && (
              <p className="text-sm text-muted-foreground">
                {activePlan.products && activePlan.products.length > 0
                  ? `${activePlan.products.length} product${activePlan.products.length !== 1 ? 's' : ''}`
                  : 'No products'} &middot;{" "}
                {BILLING_PERIODS.find(
                  (b) => b.value === activePlan.billingPeriod
                )?.label || activePlan.billingPeriod}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            {success}
          </div>
        )}

        {loading && !isCreate ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Form ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                {/* Billing Period */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Billing Period</label>
                  <Select
                    value={formBillingPeriod}
                    onValueChange={setFormBillingPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIODS.map((bp) => (
                        <SelectItem key={bp.value} value={bp.value}>
                          {bp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    End Date{" "}
                    <span className="text-xs text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>

                {/* ── Checkboxes ────────────────────────── */}
                <div className="sm:col-span-2">
                  <label className="mb-3 block text-sm font-medium">
                    Plan Options
                  </label>
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    {(
                      [
                        ["closeable", "Closeable", formCloseable, setFormCloseable],
                        ["renewable", "Renewable", formRenewable, setFormRenewable],
                        ["pausable", "Pausable", formPausable, setFormPausable],
                        [
                          "autoClose",
                          "Auto Close",
                          formAutoClose,
                          setFormAutoClose,
                        ],
                      ] as const
                    ).map(([key, label, value, setter]) => (
                      <button
                        key={key}
                        type="button"
                        className="flex items-center gap-2 text-sm"
                        onClick={() => (setter as (v: boolean) => void)(!value)}
                      >
                        {value ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Action Buttons ─────────────────────────── */}
            <div className="flex items-center gap-3">
              <Button
                className="gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isCreate ? "Create Plan" : "Save Changes"}
              </Button>

              {isDetail && (
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>

            {/* ── Product Info ────────────────────────────── */}
            {isDetail && activePlan?.products && activePlan.products.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    Products ({activePlan.products.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">Product Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePlan.products.map((product) => (
                        <>
                          {/* Main product row */}
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.type}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              —
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{Number(product.salesPrice).toFixed(2)} /{" "}
                              {BILLING_PERIODS.find(
                                (b) => b.value === activePlan.billingPeriod
                              )?.label.toLowerCase() || "period"}
                            </TableCell>
                          </TableRow>
                          {/* Variant rows */}
                          {product.variants?.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="text-muted-foreground pl-8">
                                {product.name}
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {v.attribute}: {v.value}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{(Number(product.salesPrice) + Number(v.extraPrice)).toFixed(2)} /{" "}
                                {BILLING_PERIODS.find(
                                  (b) => b.value === activePlan.billingPeriod
                                )?.label.toLowerCase() || "period"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {isDetail && (!activePlan?.products || activePlan.products.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No products are associated with this plan yet.
                </CardContent>
              </Card>
            )}

            {/* ── Subscriptions using this plan ───────────── */}
            {isDetail &&
              activePlan?.subscriptions &&
              activePlan.subscriptions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Subscriptions ({activePlan.subscriptions.length})
                    </CardTitle>
                    <CardDescription>
                      Subscriptions currently using this recurring plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activePlan.subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                              <Link
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Could navigate to subscription detail
                                }}
                                className="text-primary hover:underline"
                              >
                                {sub.subscriptionNo}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {sub.user?.email || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColor(sub.status) as "default" | "secondary" | "outline" | "destructive"}>
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              ₹{Number(sub.totalAmount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

            {isDetail &&
              activePlan?.subscriptions?.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No subscriptions are using this plan yet.
                  </CardContent>
                </Card>
              )}
          </>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════ */
  /*  LIST VIEW                                               */
  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/internal/configuration">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <RefreshCw className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Recurring Plans
            </h1>
            <p className="text-muted-foreground">
              {plans.length} plan{plans.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>

        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search plans..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {search
              ? "No plans match your search."
              : "No recurring plans yet. Create one to get started."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Products</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead className="text-center">Options</TableHead>
                <TableHead className="text-center">Subs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => openPlan(plan.id)}
                >
                  <TableCell className="font-medium">
                    {plan.products && plan.products.length > 0 
                      ? plan.products.map(p => p.name).join(", ")
                      : "No products"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {BILLING_PERIODS.find((b) => b.value === plan.billingPeriod)
                        ?.label || plan.billingPeriod}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      {plan.closeable && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Close
                        </Badge>
                      )}
                      {plan.renewable && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Renew
                        </Badge>
                      )}
                      {plan.pausable && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Pause
                        </Badge>
                      )}
                      {plan.autoClose && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Auto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.subscriptions?.length || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
