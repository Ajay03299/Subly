"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { SubscriptionForm } from "@/components/subscription-form";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubStatus = "DRAFT" | "QUOTATION" | "CONFIRMED" | "ACTIVE" | "CLOSED";

interface Subscription {
  id: string;
  subscriptionNo: string;
  userId: string;
  user: { id: string; email: string };
  recurringPlanId: string | null;
  recurringPlan: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
  } | null;
  paymentTerms: string | null;
  status: SubStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lines: Array<{
    id: string;
    productId: string;
    product: { id: string; name: string; salesPrice: number };
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    totalAmount: number;
    issueDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Status badge styling                                               */
/* ------------------------------------------------------------------ */

function statusVariant(status: SubStatus) {
  switch (status) {
    case "ACTIVE":
    case "CONFIRMED":
      return "default" as const;
    case "QUOTATION":
      return "secondary" as const;
    case "DRAFT":
      return "outline" as const;
    case "CLOSED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function statusLabel(status: SubStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "QUOTATION":
      return "Quotation Sent";
    case "CONFIRMED":
      return "Confirmed";
    case "ACTIVE":
      return "Active";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN", "INTERNAL_USER"],
    redirectTo: "/internal",
  });

  // Data state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View state: "list" | "create" | subscription id
  const [view, setView] = useState<string>("list");
  const [activeSubscription, setActiveSubscription] =
    useState<Subscription | null>(null);

  // List state
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<SubStatus | "ALL">("ALL");

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch subscriptions ────────────────────────────── */
  const fetchSubscriptions = useCallback(async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/admin/subscriptions", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscriptions"
      );
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSubscriptions();
    }
  }, [authLoading, user, fetchSubscriptions]);

  /* ── Auto-dismiss messages ──────────────────────────── */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ── Fetch single subscription ──────────────────────── */
  const fetchSubscription = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const data = await res.json();
      setActiveSubscription(data.subscription);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscription"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Open subscription form ─────────────────────────── */
  const openSubscription = (sub: Subscription) => {
    setActiveSubscription(sub);
    setView(sub.id);
    setError(null);
    fetchSubscription(sub.id);
  };

  /* ── Create handler ─────────────────────────────────── */
  const handleCreate = async (formData: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to create subscription");
      }
      const data = await res.json();
      await fetchSubscriptions();
      // Open the newly created subscription
      setActiveSubscription(data.subscription);
      setView(data.subscription.id);
      setSuccess("Subscription created successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create subscription"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Update / Save handler ──────────────────────────── */
  const handleSave = async (formData: any) => {
    if (!activeSubscription?.id) {
      // Creating new
      await handleCreate(formData);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions/${activeSubscription.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to update subscription");
      }
      const data = await res.json();
      setActiveSubscription(data.subscription);
      await fetchSubscriptions();
      setSuccess("Subscription saved successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update subscription"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Status change handler ──────────────────────────── */
  const handleStatusChange = async (newStatus: string) => {
    if (!activeSubscription?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions/${activeSubscription.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to update status");
      }
      const data = await res.json();
      setActiveSubscription(data.subscription);
      await fetchSubscriptions();
      setSuccess(`Status changed to ${statusLabel(newStatus as SubStatus)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Action handler (invoice, renew, upsell) ───────── */
  const handleAction = async (action: string) => {
    if (!activeSubscription?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions/${activeSubscription.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || `Failed to perform ${action}`);
      }
      const data = await res.json();

      if (action === "renew") {
        // Open the newly renewed subscription
        setActiveSubscription(data.subscription);
        setView(data.subscription.id);
        setSuccess("Subscription renewed — new order created");
      } else if (action === "upsell") {
        // Same as renew but for upsell
        setActiveSubscription(data.subscription);
        setView(data.subscription.id);
        setSuccess("Upsell order created");
      } else if (action === "create_invoice") {
        // Refresh current subscription to show new invoice
        await fetchSubscription(activeSubscription.id);
        setSuccess(`Invoice ${data.invoice?.invoiceNo} created`);
      }

      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed: ${action}`);
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete handler ─────────────────────────────────── */
  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to delete");
      }
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setConfirmDelete(null);
      setSuccess("Subscription deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete subscription"
      );
      setConfirmDelete(null);
    }
  };

  /* ── Bulk delete ────────────────────────────────────── */
  const handleBulkDelete = async () => {
    for (const id of selected) {
      await handleDelete(id);
    }
    setSelected(new Set());
  };

  /* ── Selection helpers ──────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Filtered subscriptions ─────────────────────────── */
  const filtered = subscriptions.filter((s) => {
    // Status filter
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;

    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.subscriptionNo.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q) ||
      s.recurringPlan?.name?.toLowerCase().includes(q) ||
      false
    );
  });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  };

  /* ── Next invoice computation for display ───────────── */
  function computeNextInvoice(sub: Subscription): string {
    if (!sub.recurringPlan) return "—";
    const period = sub.recurringPlan.billingPeriod;
    const base = new Date(sub.updatedAt || sub.createdAt);
    switch (period) {
      case "DAILY":
        base.setDate(base.getDate() + 1);
        break;
      case "WEEKLY":
        base.setDate(base.getDate() + 7);
        break;
      case "MONTHLY":
        base.setMonth(base.getMonth() + 1);
        break;
      case "YEARLY":
        base.setFullYear(base.getFullYear() + 1);
        break;
    }
    return base.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  /* ── Auth gates ─────────────────────────────────────── */
  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Messages ──────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive dark:bg-destructive/10">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              className="ml-auto text-xs underline"
              onClick={() => setError(null)}
            >
              dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-chart-2/30 bg-chart-2/5 p-4 text-sm text-chart-2 dark:bg-chart-2/10">
            {success}
          </div>
        )}

        {/* ── Delete confirmation ────────────────────────── */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Delete Subscription</CardTitle>
                <CardDescription>
                  Are you sure? This will permanently delete this subscription
                  and all its order lines. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(confirmDelete)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  FORM VIEW (Create / Edit)                        */}
        {/* ══════════════════════════════════════════════════ */}
        {view !== "list" ? (
          <>
            {/* Back button */}
            <div className="mb-6">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setView("list");
                  setActiveSubscription(null);
                  setError(null);
                  fetchSubscriptions();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Subscriptions
              </Button>
            </div>

            <SubscriptionForm
              subscription={view === "create" ? null : activeSubscription}
              onSave={handleSave}
              onStatusChange={handleStatusChange}
              onAction={handleAction}
              onBack={() => {
                setView("list");
                setActiveSubscription(null);
              }}
              loading={loading}
            />
          </>
        ) : (
          /* ════════════════════════════════════════════════ */
          /*  LIST VIEW                                      */
          /* ════════════════════════════════════════════════ */
          <>
            {/* ── Header ─────────────────────────────────── */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Subscriptions
                  </h1>
                  <p className="text-muted-foreground">
                    {subscriptions.length} subscription
                    {subscriptions.length !== 1 ? "s" : ""} total
                  </p>
                </div>
              </div>

              <Button
                className="gap-2"
                onClick={() => {
                  setView("create");
                  setActiveSubscription(null);
                  setError(null);
                }}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>

            {/* ── Toolbar ────────────────────────────────── */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete ({selected.size})
                  </Button>
                )}

                {/* Status filter tabs */}
                <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
                  {(
                    ["ALL", "DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"] as const
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        statusFilter === s
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s === "ALL"
                        ? "All"
                        : s === "QUOTATION"
                          ? "Quotation"
                          : s === "CONFIRMED"
                            ? "Confirmed"
                            : s === "ACTIVE"
                              ? "Active"
                              : s === "CLOSED"
                                ? "Closed"
                                : "Draft"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  className="h-9 pl-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* ── Table ──────────────────────────────────── */}
            {fetching ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="mb-4 h-14 w-14 text-muted-foreground/40" />
                  {subscriptions.length === 0 ? (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No subscriptions yet
                      </h3>
                      <p className="mb-6 text-center text-muted-foreground">
                        Create your first subscription to get started
                      </p>
                      <Button
                        onClick={() => {
                          setView("create");
                          setError(null);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Subscription
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No results
                      </h3>
                      <p className="text-muted-foreground">
                        No subscriptions match your search or filter
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10">
                        <button onClick={toggleSelectAll} className="p-0.5">
                          {selected.size === filtered.length &&
                          filtered.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Next Invoice</TableHead>
                      <TableHead className="text-right">Recurring</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/30",
                          selected.has(sub.id) && "bg-muted/30"
                        )}
                        onClick={() => openSubscription(sub)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleSelect(sub.id)}
                            className="p-0.5"
                          >
                            {selected.has(sub.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {sub.subscriptionNo}
                        </TableCell>
                        <TableCell>{sub.user.email}</TableCell>
                        <TableCell>{computeNextInvoice(sub)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ₹{Number(sub.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {sub.recurringPlan
                              ? `${sub.recurringPlan.name} (${sub.recurringPlan.billingPeriod.toLowerCase()})`
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(sub.status)}>
                            {statusLabel(sub.status)}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(sub.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ── Footer info ────────────────────────────── */}
            {!fetching && filtered.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Showing {filtered.length} of {subscriptions.length}{" "}
                subscriptions
                {selected.size > 0 && (
                  <> &middot; {selected.size} selected</>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
