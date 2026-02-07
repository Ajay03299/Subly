"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Package,
  ArrowLeft,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { ProductForm } from "@/components/product-form";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  recurringPlans?: Array<{
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
  }>;
  variants: Array<{
    id: string;
    attribute: string;
    value: string;
    extraPrice: number;
  }>;
  createdAt: string;
}

/** Matches the payload from ProductForm (create only) */
interface CreateFormPayload {
  product: {
    name: string;
    type: string;
    salesPrice: number;
    costPrice: number;
  };
  variants: Array<{ attribute: string; value: string; extraPrice: number }>;
  recurring: {
    name: string;
    price: number;
    billingPeriod: string;
    minimumQuantity: number;
    startDate: string;
    endDate: string | null;
    autoClose: boolean;
    closeable: boolean;
    renewable: boolean;
    pausable: boolean;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ProductsPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<"list" | "create">("list");

  // Search & selection
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch products ────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchProducts();
    }
  }, [authLoading, user, fetchProducts]);

  /* ── Auto-dismiss success messages ──────────────────── */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ── Create handler ────────────────────────────────── */
  const handleCreate = async (formData: CreateFormPayload) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      // Create product first (without recurring plans)
      const productResponse = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData.product,
        }),
      });
      if (!prodRes.ok) {
        const e = await prodRes.json();
        throw new Error(e.error || "Failed to create product");
      }

      const productData = await productResponse.json();
      const productId = productData.product.id;

      // Create recurring plans
      if (formData.recurringPlans && formData.recurringPlans.length > 0) {
        for (const plan of formData.recurringPlans) {
          const planResponse = await fetch("/api/admin/recurring-plans", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              productId,
              ...plan,
            }),
          });

          if (!planResponse.ok) {
            const planError = await planResponse.json();
            throw new Error(planError.error || "Failed to create recurring plan");
          }
        }
      }

      // 3. Create variants (form sends all as variants array)
      for (const v of formData.variants) {
        const vRes = await fetch("/api/admin/variants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId, ...v }),
        });
        if (!vRes.ok) {
          const e = await vRes.json();
          throw new Error(e.error || "Failed to create variant");
        }
      }

      await fetchProducts();
      setView("list");
      setSuccess("Product created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete handler ────────────────────────────────── */
  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to delete");
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setConfirmDelete(null);
      setSuccess("Product deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
      setConfirmDelete(null);
    }
  };

  /* ── Bulk delete ───────────────────────────────────── */
  const handleBulkDelete = async () => {
    for (const id of selected) {
      await handleDelete(id);
    }
    setSelected(new Set());
  };

  /* ── Selection helpers ─────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  /* ── Filtered products ─────────────────────────────── */
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.type.toLowerCase().includes(s) ||
      p.recurringPlan?.name?.toLowerCase().includes(s)
    );
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Header ────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Product Management
              </h1>
              <p className="text-muted-foreground">
                {view === "list"
                  ? `${products.length} product${products.length !== 1 ? "s" : ""}`
                  : "Create a new product"}
              </p>
            </div>
          </div>

          {view !== "list" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setView("list");
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
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
                <CardTitle>Delete Product</CardTitle>
                <CardDescription>
                  Are you sure? This will permanently delete the product and all
                  its variants. This action cannot be undone.
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

        {/* ── Create Form View ─────────────────────────── */}
        {view === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Product</CardTitle>
              <CardDescription>
                Fill in all details below. Fields marked * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductForm onSubmit={handleCreate} loading={loading} />
            </CardContent>
          </Card>
        )}

        {/* ── List View ─────────────────────────────────── */}
        {view === "list" && (
          <>
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {selected.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selected.size})
                  </Button>
                )}
                <Button
                  className="gap-2"
                  onClick={() => {
                    setView("create");
                    setError(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Product
                </Button>
              </div>
            </div>

            {/* Table / empty state */}
            {fetching ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="mb-4 h-14 w-14 text-muted-foreground/40" />
                  {products.length === 0 ? (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No products yet
                      </h3>
                      <p className="mb-6 text-center text-muted-foreground">
                        Create your first product to get started
                      </p>
                      <Button
                        onClick={() => setView("create")}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create Product
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-2 text-lg font-semibold">
                        No results
                      </h3>
                      <p className="text-muted-foreground">
                        No products match &quot;{search}&quot;
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
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-primary"
                          checked={
                            selected.size === filteredProducts.length &&
                            filteredProducts.length > 0
                          }
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Sales Price</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Recurring Plan</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-24 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-primary"
                            checked={selected.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {product.type === "SERVICE"
                              ? "Service"
                              : product.type === "CONSUMABLE"
                                ? "Consumable"
                                : "Storable"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ₹{Number(product.salesPrice).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ₹{Number(product.costPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {product.variants.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.variants.slice(0, 3).map((v) => (
                                <Badge
                                  key={v.id}
                                  variant="outline"
                                  className="text-[11px]"
                                >
                                  {v.attribute}: {v.value}
                                  {Number(v.extraPrice) > 0 &&
                                    ` +₹${Number(v.extraPrice)}`}
                                </Badge>
                              ))}
                              {product.variants.length > 3 && (
                                <Badge variant="outline" className="text-[11px]">
                                  +{product.variants.length - 3} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.recurringPlans && product.recurringPlans.length > 0 ? (
                            <div className="space-y-1">
                              {product.recurringPlans.map((plan) => (
                                <div key={plan.id} className="text-sm">
                                  <p className="font-medium">{plan.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {plan.billingPeriod}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(product.id)}
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
