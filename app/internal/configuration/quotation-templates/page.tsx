"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileText,
  ArrowLeft,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
}

interface RecurringPlan {
  id: string;
  billingPeriod: string;
}

interface TemplateLine {
  productId: string;
  productName?: string;
  quantity: number;
}

interface QuotationTemplate {
  id: string;
  name: string;
  validityDays: number;
  recurringPlanId?: string | null;
  recurringPlan?: RecurringPlan | null;
  lines: Array<{
    id: string;
    productId: string;
    product: Product;
    quantity: number;
  }>;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuotationTemplatesPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<"list" | "create">("list");

  // Form state
  const [name, setName] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [recurringPlanId, setRecurringPlanId] = useState("");
  const [lines, setLines] = useState<TemplateLine[]>([]);
  
  // New line state
  const [newLineProductId, setNewLineProductId] = useState("");
  const [newLineQuantity, setNewLineQuantity] = useState("1");

  // Search & selection
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch templates ────────────────────────────────── */
  const fetchTemplates = useCallback(async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/admin/quotation-templates", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setFetching(false);
    }
  }, []);

  /* ── Fetch products ─────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // silent
    }
  }, []);

  /* ── Fetch recurring plans ──────────────────────────── */
  const fetchRecurringPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/recurring-plans", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRecurringPlans(data.plans || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchTemplates();
      fetchProducts();
      fetchRecurringPlans();
    }
  }, [authLoading, user, fetchTemplates, fetchProducts, fetchRecurringPlans]);

  /* ── Auto-dismiss success messages ──────────────────── */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ── Add line ───────────────────────────────────────── */
  const addLine = () => {
    if (!newLineProductId) {
      setError("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === newLineProductId);
    if (!product) return;

    setLines([
      ...lines,
      {
        productId: product.id,
        productName: product.name,
        quantity: parseInt(newLineQuantity) || 1,
      },
    ]);

    setNewLineProductId("");
    setNewLineQuantity("1");
    setError(null);
  };

  /* ── Remove line ────────────────────────────────────── */
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  /* ── Reset form ─────────────────────────────────────── */
  const resetForm = () => {
    setName("");
    setValidityDays("30");
    setRecurringPlanId("");
    setLines([]);
    setNewLineProductId("");
    setNewLineQuantity("1");
    setError(null);
  };

  /* ── Create template ────────────────────────────────── */
  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    if (!recurringPlanId) {
      setError("Please select a recurring plan");
      return;
    }

    if (lines.length === 0) {
      setError("Please add at least one product");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/quotation-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          validityDays: parseInt(validityDays) || 30,
          recurringPlanId: recurringPlanId || null,
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to create template");
      }

      await fetchTemplates();
      setView("list");
      resetForm();
      setSuccess("Template created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete template ────────────────────────────────── */
  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/quotation-templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to delete");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
      setSuccess("Template deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
      setConfirmDelete(null);
    }
  };

  /* ── Filtered templates ─────────────────────────────── */
  const filteredTemplates = templates.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.name.toLowerCase().includes(s);
  });

  /* ── Auth gates ────────────────────────────────────── */
  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Access Denied</p>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Quotation Templates
              </h1>
              <p className="mt-1 text-muted-foreground">
                Create and manage quotation templates for subscriptions
              </p>
            </div>
          </div>

          {view !== "list" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setView("list");
                resetForm();
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Templates
            </Button>
          )}
        </div>

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

        {/* ── Delete confirmation modal ─────────────────── */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Delete Template</CardTitle>
                <CardDescription>
                  Are you sure you want to delete this template? This action
                  cannot be undone.
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

        {/* ── Create View ───────────────────────────────── */}
        {view === "create" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>
                  Create a reusable template for quick subscription creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Standard Package"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validityDays">Validity (Days)</Label>
                    <Input
                      id="validityDays"
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      placeholder="30"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recurringPlanId">
                      Recurring Plan
                    </Label>
                    <Select
                      value={recurringPlanId}
                      onValueChange={setRecurringPlanId}
                    >
                      <SelectTrigger id="recurringPlanId">
                        <SelectValue placeholder="Select a recurring plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No recurring plan</SelectItem>
                        {recurringPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.billingPeriod}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>
                  Add products to this template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add product row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select
                      value={newLineProductId}
                      onValueChange={setNewLineProductId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — ₹{Number(p.salesPrice).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      value={newLineQuantity}
                      onChange={(e) => setNewLineQuantity(e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <Button onClick={addLine} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {/* Lines list */}
                {lines.length > 0 && (
                  <div className="space-y-2">
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <span className="font-medium">{line.productName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            × {line.quantity}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setView("list");
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        )}

        {/* ── List View ─────────────────────────────────── */}
        {view === "list" && (
          <>
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Button
                className="gap-2"
                onClick={() => {
                  setView("create");
                  setError(null);
                }}
              >
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>

            {/* Table / empty state */}
            {fetching ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="mb-4 h-14 w-14 text-muted-foreground/40" />
                  {templates.length === 0 ? (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No templates yet
                      </h3>
                      <p className="mb-6 text-center text-muted-foreground">
                        Create your first quotation template to speed up
                        subscription creation
                      </p>
                      <Button
                        onClick={() => setView("create")}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create Template
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No results
                      </h3>
                      <p className="text-muted-foreground">
                        No templates match &quot;{search}&quot;
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
                      <TableHead>Template Name</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Recurring Plan</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-24 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow
                        key={template.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">
                          {template.name}
                        </TableCell>
                        <TableCell>
                          {template.lines.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {template.lines.slice(0, 2).map((line) => (
                                <Badge
                                  key={line.id}
                                  variant="outline"
                                  className="text-[11px]"
                                >
                                  {line.product.name} ×{line.quantity}
                                </Badge>
                              ))}
                              {template.lines.length > 2 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[11px]"
                                >
                                  +{template.lines.length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.recurringPlan ? (
                            <Badge variant="outline">
                              {template.recurringPlan.billingPeriod}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.validityDays} days
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(template.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
