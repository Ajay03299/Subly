"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { useCart } from "@/lib/cart-context";
import { TaxBreakdown } from "@/components/tax-breakdown";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    removeItem,
    updateQuantity,
    refreshItemTaxes,
    subtotal,
    taxBreakdown,
    taxAmount,
    total,
    discountCode,
    setDiscountCode,
    discountApplied,
    applyDiscount,
    discountAmount,
    clearCart,
  } = useCart();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Cart tax breakdown:", taxBreakdown);
  }, [taxBreakdown]);

  useEffect(() => {
    console.log(
      "Cart item taxes:",
      items.map((i) => ({ id: i.product.id, tax: i.product.tax }))
    );
  }, [items]);

  useEffect(() => {
    refreshItemTaxes();
  }, [refreshItemTaxes]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setCheckoutError("Please log in to complete your purchase.");
        setCheckoutLoading(false);
        return;
      }

      // Build cart items payload for the checkout API
      const cartItems = items.map((item) => {
        const base =
          typeof item.plan === "string"
            ? item.plan === "Monthly"
              ? (item.product.monthlyPrice ?? Number(item.product.salesPrice) ?? 0)
              : (item.product.yearlyPrice ?? Number(item.product.salesPrice) ?? 0)
            : Number(item.plan?.price) || Number(item.product.salesPrice) || 0;
        const extra = item.selectedVariant?.extraPrice ?? 0;
        const unitPrice = base + extra;
        const planLabel =
          item.plan === null
            ? "ONE_TIME"
            : typeof item.plan === "string"
              ? item.plan
              : item.plan?.billingPeriod ?? "ONE_TIME";

        return {
          productId: item.product.id,
          productName: item.product.name,
          productType: item.product.type,
          salesPrice: item.product.salesPrice,
          costPrice: item.product.costPrice,
          unitPrice,
          quantity: item.quantity,
          plan: planLabel,
          variantInfo: item.selectedVariant
            ? `${item.selectedVariant.attribute}: ${item.selectedVariant.value}`
            : null,
        };
      });

      const res = await fetch("/api/portal/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems,
          subtotal,
          taxAmount,
          total,
          discountApplied,
          discountAmount,
          discountCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }

      const data = await res.json();
      const subscriptionId = data.subscription.id;

      // Navigate to confirmation page with the real order ID
      router.push(`/order-confirmation?orderId=${subscriptionId}`);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Failed to process checkout"
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="text-muted-foreground">
          Browse the shop and add products to get started.
        </p>
        <Button asChild>
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shopping Cart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 && "s"} in your cart
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Cart items ─────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[45%]">Product</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const planLabel =
                    item.plan === null
                      ? "One-time"
                      : typeof item.plan === "string"
                        ? item.plan
                        : item.plan?.name
                          ? `${item.plan.name} (${item.plan.billingPeriod?.toLowerCase()})`
                          : "One-time";
                  const planPrice =
                    typeof item.plan === "string"
                      ? item.plan === "Monthly"
                        ? (item.product.monthlyPrice ?? Number(item.product.salesPrice) ?? 0)
                        : (item.product.yearlyPrice ?? Number(item.product.salesPrice) ?? 0)
                      : Number(item.plan?.price) || Number(item.product.salesPrice) || 0;
                  const extra = item.selectedVariant?.extraPrice ?? 0;
                  const lineTotal = (planPrice + extra) * item.quantity;

                  return (
                    <TableRow key={item.product.id}>
                      {/* Product */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg font-bold text-primary">
                            {item.product.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/shop/${item.product.id}`}
                              className="font-medium hover:underline"
                            >
                              {item.product.name}
                            </Link>
                            {item.selectedVariant && (
                              <p className="text-xs text-muted-foreground">
                                {item.selectedVariant.attribute}:{" "}
                                {item.selectedVariant.value}
                                {item.selectedVariant.extraPrice > 0 &&
                                  ` (+₹${item.selectedVariant.extraPrice})`}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Plan */}
                      <TableCell>
                        <Badge variant="outline">{planLabel}</Badge>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="rounded p-1 hover:bg-muted"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            className="rounded p-1 hover:bg-muted"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right font-medium">
                        ₹{lineTotal.toLocaleString()}
                      </TableCell>

                      {/* Tax */}
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {item.product.tax
                          ? `${item.product.tax.name} (${Number(item.product.tax.rate)}%)`
                          : "—"}
                      </TableCell>

                      {/* Remove */}
                      <TableCell>
                        <button
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Order Summary ──────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discount code */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Discount Code
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    disabled={discountApplied}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={applyDiscount}
                    disabled={discountApplied || !discountCode}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Apply
                  </Button>
                </div>
                {discountApplied && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-chart-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    You have successfully applied the discount!
                  </p>
                )}
              </div>

              <hr className="border-border" />

              {/* Totals using TaxBreakdown component */}
              <TaxBreakdown
                subtotal={subtotal}
                discountAmount={discountAmount}
                taxAmount={taxAmount}
                taxBreakdown={taxBreakdown}
              />

              {/* Checkout error */}
              {checkoutError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {checkoutError}
                </div>
              )}

              {/* Checkout */}
              <Button
                size="lg"
                className="mt-2 w-full"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Checkout"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Terms and conditions apply
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
