"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Plus, Package, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { ProductForm } from "@/components/product-form";

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  recurringPlan?: {
    name: string;
    billingPeriod: string;
  };
  variants: Array<{
    id: string;
    attribute: string;
    value: string;
  }>;
  createdAt: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchProducts();
    }
  }, [authLoading, user]);

  const fetchProducts = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/admin/products", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    }
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");

      // First, create recurring plan if needed
      let recurringPlanId = null;
      if (formData.recurring) {
        const planResponse = await fetch("/api/admin/recurring-plans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData.recurring),
        });

        if (!planResponse.ok) {
          const planError = await planResponse.json();
          throw new Error(planError.error || "Failed to create recurring plan");
        }

        const planData = await planResponse.json();
        recurringPlanId = planData.recurringPlan.id;
      }

      // Create product
      const productResponse = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...formData.product,
          recurringPlanId,
        }),
      });

      if (!productResponse.ok) {
        const productError = await productResponse.json();
        throw new Error(productError.error || "Failed to create product");
      }

      const productData = await productResponse.json();
      const productId = productData.product.id;

      // Create variants
      if (formData.variants.length > 0) {
        for (const variant of formData.variants) {
          const variantResponse = await fetch("/api/admin/variants", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              productId,
              ...variant,
            }),
          });

          if (!variantResponse.ok) {
            const variantError = await variantResponse.json();
            throw new Error(
              variantError.error || "Failed to create variant"
            );
          }
        }
      }

      // Refresh products list
      await fetchProducts();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
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
                Create and manage your products
              </p>
            </div>
          </div>

          {showForm && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowForm(false)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Form View */}
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Create New Product</CardTitle>
              <CardDescription>
                Fill in the details below to create a new product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductForm onSubmit={handleSubmit} loading={loading} />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Products List View */}
            <div className="mb-6 flex justify-end">
              <Button className="gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Create New Product
              </Button>
            </div>

            {products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No products yet
                  </h3>
                  <p className="mb-6 text-center text-muted-foreground">
                    Create your first product to get started
                  </p>
                  <Button onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border bg-white shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sales Price</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Recurring Plan</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {product.type}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{Number(product.salesPrice).toFixed(2)}</TableCell>
                        <TableCell>₹{Number(product.costPrice).toFixed(2)}</TableCell>
                        <TableCell>
                          {product.variants.length > 0 ? (
                            <Badge variant="outline">
                              {product.variants.length} variant
                              {product.variants.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.recurringPlan ? (
                            <div className="text-sm">
                              <p className="font-medium">
                                {product.recurringPlan.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.recurringPlan.billingPeriod}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(product.createdAt).toLocaleDateString()}
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
