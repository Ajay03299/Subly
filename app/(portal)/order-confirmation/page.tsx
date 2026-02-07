"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Download,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function OrderConfirmationPage() {
  const {
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    discountApplied,
    discountAmount,
    clearCart,
  } = useCart();

  // Generate a mock order number
  const orderNumber = useMemo(
    () => `S${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`,
    []
  );
  const orderDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Snapshot items before clearing
  const orderItems = useMemo(() => [...items], [items]);
  const orderSubtotal = subtotal;
  const orderTax = taxAmount;
  const orderTotal = total;
  const orderDiscount = discountAmount;
  const hadDiscount = discountApplied;

  // Clear cart after rendering (order placed)
  useEffect(() => {
    if (items.length > 0) {
      // small delay so snapshot is captured
      const t = setTimeout(() => clearCart(), 100);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (orderItems.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold">No order to show</h2>
        <p className="text-muted-foreground">
          Looks like you haven&apos;t placed an order yet.
        </p>
        <Button asChild>
          <Link href="/">Go to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Success header ───────────────────────────────── */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-chart-2/10">
          <CheckCircle2 className="h-9 w-9 text-chart-2" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Thank you for your order!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your payment has been processed successfully.
        </p>
      </div>

      {/* ── Order info card ──────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Order {orderNumber}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {orderDate}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Package className="h-3 w-3" />
            Confirmed
          </Badge>
        </CardHeader>
        <CardContent>
          {/* Items table */}
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Product</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item) => {
                  const base =
                    item.plan === "Monthly"
                      ? item.product.monthlyPrice
                      : item.product.yearlyPrice;
                  const extra = item.selectedVariant?.extraPrice ?? 0;
                  const lineTotal = (base + extra) * item.quantity;

                  return (
                    <TableRow key={item.product.id}>
                      <TableCell>
                        <p className="font-medium">{item.product.name}</p>
                        {item.selectedVariant && (
                          <p className="text-xs text-muted-foreground">
                            {item.selectedVariant.attribute}:{" "}
                            {item.selectedVariant.value}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{lineTotal.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{orderSubtotal.toLocaleString()}</span>
            </div>
            {hadDiscount && (
              <div className="flex justify-between text-chart-2">
                <span>Discount</span>
                <span>−₹{orderDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Taxes ({(taxRate * 100).toFixed(0)}%)
              </span>
              <span>
                ₹
                {orderTax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>
                ₹
                {orderTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Order PDF
        </Button>
        <Button className="gap-2" asChild>
          <Link href="/">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
