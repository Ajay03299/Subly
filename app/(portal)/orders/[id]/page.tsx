"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Download,
  RefreshCw,
  X,
  FileText,
  MapPin,
  Calendar,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
import { generateOrderPdf } from "@/lib/generate-pdf";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subscription {
  id: string;
  subscriptionNo: string;
  status: string;
  userId: string;
  user: { id: string; email: string };
  recurringPlanId: string | null;
  recurringPlan: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
    startDate: string;
    endDate: string | null;
  } | null;
  paymentTerms: string | null;
  discountCode: string | null;
  discountAmount: number;
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
  invoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    totalAmount: number;
    issueDate: string;
    dueDate: string | null;
    payments: Array<{ id: string; amount: number; paymentDate: string }>;
  }>;
  payments: Array<{ id: string; amount: number; paymentDate: string }>;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: string) {
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

function statusVariant(status: string) {
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [taxNames, setTaxNames] = useState<Record<number, string>>({});

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch tax names ────────────────────────────────── */
  useEffect(() => {
    const fetchTaxNames = async () => {
      try {
        const res = await fetch("/api/portal/tax/all", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          const names: Record<number, string> = {};
          data.taxes?.forEach((tax: { rate: number; name: string }) => {
            names[Number(tax.rate)] = tax.name;
          });
          setTaxNames(names);
        }
      } catch {
        // Silent fail
      }
    };
    fetchTaxNames();
  }, []);

  /* ── Fetch order ────────────────────────────────────── */
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/subscriptions/${orderId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setOrder(null);
          return;
        }
        throw new Error("Failed to fetch order");
      }
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

  /* ── Auto-dismiss success ───────────────────────────── */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ── Handle Renew ───────────────────────────────────── */
  const handleRenew = async () => {
    if (!order) return;
    setRenewLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/subscriptions/${order.id}/renew`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to renew subscription");
      }
      const data = await res.json();
      setSuccess(
        `Subscription renewed! New order ${data.subscription.subscriptionNo} created.`
      );
      // Navigate to the new order
      setTimeout(() => {
        router.push(`/orders/${data.subscription.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew");
    } finally {
      setRenewLoading(false);
    }
  };

  /* ── Handle Download ────────────────────────────────── */
  const handleDownload = () => {
    if (!order) return;

    const computedSubtotal = Number(order.subtotal);
    const computedDiscount = Number(order.discountAmount || 0);
    const afterDiscount = Math.max(computedSubtotal - computedDiscount, 0);
    const taxRatio = computedSubtotal > 0 ? afterDiscount / computedSubtotal : 1;

    // Group taxes by bracket for PDF
    const taxGroups = new Map<string, { rate: number; name: string; amount: number }>();
    order.lines.forEach((line) => {
      const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
      if (rate > 0) {
        const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
        const key = line.tax?.id || `rate-${rate}`;
        const name = line.tax?.name || taxNames[rate] || `Tax (${rate.toFixed(0)}%)`;
        const existing = taxGroups.get(key);
        if (existing) {
          existing.amount += lineTaxAmount;
        } else {
          taxGroups.set(key, {
            rate,
            name,
            amount: lineTaxAmount,
          });
        }
      }
    });

    generateOrderPdf({
      subscriptionNo: order.subscriptionNo,
      status: statusLabel(order.status),
      customerEmail: order.user.email,
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
      discountAmount: Number(order.discountAmount),
      subtotal: Number(order.subtotal),
      taxBreakdown: Array.from(taxGroups.values()).map((t) => ({
        ...t,
        amount: t.amount * taxRatio,
      })),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
    });
  };

  /* ── Loading / Not found ────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/orders">Back to My Orders</Link>
        </Button>
      </div>
    );
  }

  /* ── Can renew? ─────────────────────────────────────── */
  const canRenew = ["CONFIRMED", "ACTIVE", "CLOSED"].includes(order.status);

  /* ── Compute totals ─────────────────────────────────── */
  const subtotal = Number(order.subtotal);
  const taxAmount = Number(order.taxAmount);
  const total = Number(order.totalAmount);

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Messages */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
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
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order / {order.subscriptionNo}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={statusVariant(order.status)}>
              {statusLabel(order.status)}
            </Badge>
            <span>·</span>
            <span>
              {new Date(order.createdAt).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          {canRenew && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleRenew}
              disabled={renewLoading}
            >
              {renewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Renew
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/orders")}
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Your Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Your Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Plan: </span>
              <span className="font-medium">
                {order.recurringPlan
                  ? `₹${Number(order.recurringPlan.price).toLocaleString()}/${order.recurringPlan.billingPeriod?.toLowerCase()}`
                  : "No recurring plan"}
              </span>
            </div>
            {order.recurringPlan && (
              <>
                <div>
                  <span className="text-muted-foreground">Billing: </span>
                  <span>
                    {formatCurrency(Number(order.recurringPlan.price))} /{" "}
                    {order.recurringPlan.billingPeriod.toLowerCase()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date: </span>
                  <span>
                    {new Date(
                      order.recurringPlan.startDate
                    ).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {order.recurringPlan.endDate && (
                  <div>
                    <span className="text-muted-foreground">End Date: </span>
                    <span>
                      {new Date(
                        order.recurringPlan.endDate
                      ).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
              </>
            )}
            <div>
              <span className="text-muted-foreground">Payment Terms: </span>
              <span>
                {order.paymentTerms === "IMMEDIATE"
                  ? "Immediate Payment"
                  : order.paymentTerms === "NET_15"
                    ? "Net 15 Days"
                    : order.paymentTerms === "NET_30"
                      ? "Net 30 Days"
                      : order.paymentTerms === "NET_45"
                        ? "Net 45 Days"
                        : order.paymentTerms === "NET_60"
                          ? "Net 60 Days"
                          : order.paymentTerms === "DUE_ON_RECEIPT"
                            ? "Due on Receipt"
                            : order.paymentTerms || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Invoicing and Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Invoicing and Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{order.user.email}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Invoices */}
      {order.invoices.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.invoices.map((inv) => {
                const isPaid =
                  inv.status === "PAID" ||
                  (inv.payments && inv.payments.length > 0);
                return (
                  <Link
                    key={inv.id}
                    href={`/orders/${order.id}/invoice/${inv.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{inv.invoiceNo}</span>
                      <span className="text-muted-foreground">
                        {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(inv.totalAmount))}
                      </span>
                      <Badge
                        variant={
                          isPaid
                            ? "default"
                            : inv.status === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {isPaid ? "Paid" : inv.status}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No products in this order.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Taxes</TableHead>
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

              <div className="mt-4 flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
                <div className="flex w-52 justify-between">
                  <span className="text-muted-foreground">Untaxed Amount</span>
                  <span className="tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex w-52 justify-between text-green-600">
                    <span>Discount {order.discountCode && `(${order.discountCode})`}</span>
                    <span className="tabular-nums">
                      −{formatCurrency(Number(order.discountAmount))}
                    </span>
                  </div>
                )}
                {(() => {
                  const taxRatio = subtotal > 0 ? (subtotal - Number(order.discountAmount || 0)) / subtotal : 1;
                  const taxGroups = new Map<string, { name: string; rate: number; amount: number }>();
                  order.lines.forEach((line) => {
                    const rate = Number(line.tax?.rate ?? line.taxRate ?? 0);
                    if (rate > 0) {
                      const lineTaxAmount = Number(line.unitPrice) * line.quantity * (rate / 100);
                      const key = line.tax?.id || `rate-${rate}`;
                      const name = line.tax?.name || taxNames[rate] || `Tax (${rate.toFixed(0)}%)`;
                      const existing = taxGroups.get(key);
                      if (existing) {
                        existing.amount += lineTaxAmount;
                      } else {
                        taxGroups.set(key, { name, rate, amount: lineTaxAmount });
                      }
                    }
                  });

                  return Array.from(taxGroups.values()).map((tax) => (
                    <div key={tax.name} className="flex w-52 justify-between">
                      <span className="text-muted-foreground">{tax.name}</span>
                      <span className="tabular-nums">
                        {formatCurrency(tax.amount * taxRatio)}
                      </span>
                    </div>
                  ));
                })()}
                <div className="flex w-52 justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="link" className="px-0" asChild>
          <Link href="/orders">← Back to My Orders</Link>
        </Button>
      </div>
    </div>
  );
}
