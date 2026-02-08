"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Eye,
  Edit,
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
  description?: string | null;
  tagId?: string | null;
  taxId?: string | null;
  tag?: { id: string; name: string } | null;
  tax?: { id: string; name: string; rate: number } | null;
  images?: Array<{ id: string; url: string; alt?: string | null }>;
  recurringPlanInfos?: Array<{
    id: string;
    price: number;
    startDate: string;
    endDate?: string | null;
    recurringPlan: {
      id: string;
      billingPeriod: string;
      autoClose: boolean;
      closeable: boolean;
      renewable: boolean;
      pausable: boolean;
    };
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
    description?: string | null;
    tagId?: string | null;
    taxId?: string | null;
    images?: Array<{ url: string; alt?: string }>;
  };
  variants: Array<{ attribute: string; value: string; extraPrice: number }>;
  recurringPlanInfos: Array<{
    recurringPlanId: string;
    price: number;
    startDate: string;
    endDate?: string;
  }>;
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
  const [view, setView] = useState<"list" | "create" | "view" | "edit">("list");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

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

  /* ── Fetch single product ──────────────────────────── */
  const fetchProduct = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch product");
      const data = await res.json();
      setActiveProduct(data.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  /* ── Create handler ────────────────────────────────── */
  const handleCreate = async (formData: CreateFormPayload) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      // Create product along with variants and recurring plan infos
      const prodRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!prodRes.ok) {
        const e = await prodRes.json();
        throw new Error(e.error || "Failed to create product");
      }

      await fetchProducts();
      setView("list");
      setActiveProduct(null);
      setSuccess("Product created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  /* ── Update handler ────────────────────────────────── */
  const handleUpdate = async (formData: CreateFormPayload) => {
    if (!activeProduct) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      const updateRes = await fetch(`/api/admin/products/${activeProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!updateRes.ok) {
        const e = await updateRes.json();
        throw new Error(e.error || "Failed to update product");
      }

      await fetchProducts();
      setView("list");
      setActiveProduct(null);
      setSuccess("Product updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
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
      p.type.toLowerCase().includes(s)
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
                  : view === "create"
                    ? "Create a new product"
                    : view === "edit"
                      ? "Edit product"
                      : "View product"}
              </p>
            </div>
          </div>

          {view !== "list" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setView("list");
                setActiveProduct(null);
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

        {/* ── Edit Form View ────────────────────────────── */}
        {view === "edit" && activeProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Product</CardTitle>
              <CardDescription>
                Update product details below. Fields marked * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductForm
                onSubmit={handleUpdate}
                loading={loading}
                initialData={activeProduct}
              />
            </CardContent>
          </Card>
        )}

        {/* ── View Details ──────────────────────────────── */}
        {view === "view" && activeProduct && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Details</CardTitle>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setView("edit")}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Product Name</Label>
                    <p className="text-lg font-medium">{activeProduct.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {activeProduct.type === "SERVICE"
                          ? "Service"
                          : activeProduct.type === "CONSUMABLE"
                            ? "Consumable"
                            : "Storable"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sales Price</Label>
                    <p className="text-lg font-medium">
                      ₹{Number(activeProduct.salesPrice).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cost Price</Label>
                    <p className="text-lg font-medium">
                      ₹{Number(activeProduct.costPrice).toFixed(2)}
                    </p>
                  </div>
                  {activeProduct.description && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1">{activeProduct.description}</p>
                    </div>
                  )}
                  {activeProduct.tag && (
                    <div>
                      <Label className="text-muted-foreground">Tag</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{activeProduct.tag.name}</Badge>
                      </div>
                    </div>
                  )}
                  {activeProduct.tax && (
                    <div>
                      <Label className="text-muted-foreground">Tax</Label>
                      <p className="mt-1">
                        {activeProduct.tax.name} ({activeProduct.tax.rate}%)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            {activeProduct.variants && activeProduct.variants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Variants ({activeProduct.variants.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeProduct.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <span className="font-medium">{variant.attribute}:</span>{" "}
                          {variant.value}
                        </div>
                        <Badge variant="outline">
                          +₹{Number(variant.extraPrice).toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recurring Plans */}
            {activeProduct.recurringPlanInfos &&
              activeProduct.recurringPlanInfos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Recurring Plans ({activeProduct.recurringPlanInfos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeProduct.recurringPlanInfos.map((info) => (
                        <div
                          key={info.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="space-y-1">
                            <Badge variant="outline">
                              {info.recurringPlan.billingPeriod}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              From: {new Date(info.startDate).toLocaleDateString()}
                              {info.endDate &&
                                ` - Until: ${new Date(info.endDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{Number(info.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Images */}
            {activeProduct.images && activeProduct.images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Images ({activeProduct.images.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {activeProduct.images.map((image) => (
                      <div key={image.id} className="space-y-2">
                        <img
                          src={image.url}
                          alt={image.alt || "Product image"}
                          className="h-48 w-full rounded-lg border object-cover"
                        />
                        {image.alt && (
                          <p className="text-sm text-muted-foreground">{image.alt}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                      <TableHead className="w-32 text-center">
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
                              {product.variants.slice(0, 2).map((v) => (
                                <Badge
                                  key={v.id}
                                  variant="outline"
                                  className="text-[11px]"
                                >
                                  {v.attribute}: {v.value}
                                </Badge>
                              ))}
                              {product.variants.length > 2 && (
                                <Badge variant="secondary" className="text-[11px]">
                                  +{product.variants.length - 2} variants
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.recurringPlanInfos && product.recurringPlanInfos.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.recurringPlanInfos.slice(0, 1).map((info) => (
                                <Badge key={info.id} variant="outline" className="text-[11px]">
                                  {info.recurringPlan.billingPeriod}
                                </Badge>
                              ))}
                              {product.recurringPlanInfos.length > 1 && (
                                <Badge variant="secondary" className="text-[11px]">
                                  +{product.recurringPlanInfos.length - 1} plans
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={async () => {
                                await fetchProduct(product.id);
                                setView("view");
                              }}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={async () => {
                                await fetchProduct(product.id);
                                setView("edit");
                              }}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
