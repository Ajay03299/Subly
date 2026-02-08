"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Download,
  Package,
  Loader2,
  FileText,
  AlertCircle,
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
import { generateOrderPdf } from "@/lib/generate-pdf";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subscription {
  id: string;
  subscriptionNo: string;
  status: string;
  userId: string;
  user?: { id: string; email: string };
  recurringPlan?: {
    name: string;
    price: number;
    billingPeriod: string;
    startDate: string;
    endDate: string | null;
  } | null;
  paymentTerms: string | null;
  discountCode?: string | null;
  discountAmount?: number;
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
    tax?: { id: string; name: string; rate: number } | null;
  }>;
  createdAt: string;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ------------------------------------------------------------------ */
/*  Inner component (uses useSearchParams)                             */
/* ------------------------------------------------------------------ */

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const { clearCart } = useCart();

  const [order, setOrder] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartCleared, setCartCleared] = useState(false);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch the real order ───────────────────────────── */
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/portal/subscriptions/${orderId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* ── Clear cart once after order loads ───────────────── */
  useEffect(() => {
    if (order && !cartCleared) {
      clearCart();
      setCartCleared(true);
    }
  }, [order, cartCleared, clearCart]);

  /* ── Handle PDF download ────────────────────────────── */
  const handleDownload = () => {
    if (!order) return;

    const computedSubtotal = Number(order.subtotal);
    const computedDiscount = Number(order.discountAmount || 0);
    const afterDiscount = Math.max(computedSubtotal - computedDiscount, 0);
    const taxRatio = computedSubtotal > 0 ? afterDiscount / computedSubtotal : 1;

    const taxGroups = new Map<string, { rate: number; name: string; amount: number }>();
    // order.lines.forEach((line) => {
    //   const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
    //   if (rate <= 0) return;
    //   const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
    //   const key = line.tax?.id || `rate-${rate}`;
    //   const name = line.tax?.name || `Tax (${rate.toFixed(0)}%)`;
    //   const existing = taxGroups.get(key);
    //   if (existing) {
    //     existing.amount += lineTaxAmount;
    //   } else {
    //     taxGroups.set(key, { rate, name, amount: lineTaxAmount });
    //   }
    // });

    // for(const line of order.lines){
    //     const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
    //     if (rate <= 0) return;
    //     const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
    //     const key = line.tax?.id || `rate-${rate}`;
    //     const name = line.tax?.name || `Tax (${rate.toFixed(0)}%)`;
    //     const existing = taxGroups.get(key);
    //     if (existing) {
    //         existing.amount += lineTaxAmount;
    //     } else {
    //         taxGroups.set(key, { rate, name, amount: lineTaxAmount });
    //     }
    // }

    const length = order.lines.length;
    const count = 0;
    while(count < length){
        const line = order.lines[count];
        const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
        if (rate <= 0) return;
        const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
        const key = line.tax?.id || `rate-${rate}`;
        const name = line.tax?.name || `Tax (${rate.toFixed(0)}%)`;
        const existing = taxGroups.get(key);
        if (existing) {
            existing.amount += lineTaxAmount;
        } else {
            taxGroups.set(key, { rate, name, amount: lineTaxAmount });
        }
    }

    const adjustedTaxBreakdown = Array.from(taxGroups.values()).map((tax) => ({
      ...tax,
      amount: tax.amount * taxRatio,
    }));

    generateOrderPdf({
      subscriptionNo: order.subscriptionNo,
      status: order.status,
      customerEmail: order.user?.email || "",
      planName: order.recurringPlan ? `₹${Number(order.recurringPlan.price).toLocaleString()}/${order.recurringPlan.billingPeriod?.toLowerCase()}` : undefined,
      startDate: order.recurringPlan?.startDate,
      endDate: order.recurringPlan?.endDate,
      createdAt: order.createdAt,
      lines: order.lines.map((l) => ({
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        amount: Number(l.amount),
      })),
      discountCode: order.discountCode || undefined,
      discountAmount: Number(order.discountAmount || 0),
      subtotal: Number(order.subtotal),
      taxBreakdown: adjustedTaxBreakdown,
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
    });
  };

  /* ── No order ID in URL ─────────────────────────────── */
  if (!orderId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold">No order to show</h2>
        <p className="text-muted-foreground">
          Looks like you haven&apos;t placed an order yet.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">Go to Shop</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/orders">My Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Loading ────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your order...</p>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────── */
  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive/60" />
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground">
          {error || "Could not load your order."}
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/orders">Go to My Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Computed ───────────────────────────────────────── */
  const subtotal = Number(order.subtotal);
  const discountAmount = Number(order.discountAmount || 0);
  const taxAmount = Number(order.taxAmount);
  const total = Number(order.totalAmount);

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
            <CardTitle className="text-lg">
              Order {order.subscriptionNo}
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Badge variant="default" className="gap-1">
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
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.product.name}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {line.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(Number(line.unitPrice))}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.tax
                        ? `${line.tax.name} (${Number(line.tax.rate)}%)`
                        : Number(line.taxRate) > 0
                          ? `${Number(line.taxRate)}%`
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(line.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount {order.discountCode && `(${order.discountCode})`}
                </span>
                <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {(() => {
              const taxRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
              const taxGroups = new Map<string, { name: string; amount: number }>();
              order.lines.forEach((line) => {
                const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
                if (rate <= 0) return;
                const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
                const key = line.tax?.id || `rate-${rate}`;
                const name = line.tax?.name || `Tax (${rate.toFixed(0)}%)`;
                const existing = taxGroups.get(key);
                if (existing) {
                  existing.amount += lineTaxAmount;
                } else {
                  taxGroups.set(key, { name, amount: lineTaxAmount });
                }
              });

              return Array.from(taxGroups.values()).map((tax) => (
                <div key={tax.name} className="flex justify-between">
                  <span className="text-muted-foreground">{tax.name}</span>
                  <span className="tabular-nums">
                    {formatCurrency(tax.amount * taxRatio)}
                  </span>
                </div>
              ));
            })()}
            <hr className="border-border" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" className="gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download Order PDF
        </Button>
        <Button className="gap-2" asChild>
          <Link href={`/orders/${order.id}`}>
            <FileText className="h-4 w-4" />
            View Order Details
          </Link>
        </Button>
        <Button variant="ghost" className="gap-2" asChild>
          <Link href="/orders">
            My Orders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 text-center">
        <Button variant="link" asChild>
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with Suspense for useSearchParams                     */
/* ------------------------------------------------------------------ */

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
