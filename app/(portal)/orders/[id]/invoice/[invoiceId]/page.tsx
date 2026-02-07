"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Download,
  CreditCard,
  MapPin,
  FileText,
  Loader2,
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
import { generateInvoicePdf } from "@/lib/generate-pdf";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Invoice {
  id: string;
  invoiceNo: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  discountAmount?: number;
  discountCode?: string | null;
  subscription: {
    id: string;
    userId: string;
    subscriptionNo: string;
    discountCode?: string | null;
    discountAmount?: number;
  };
  lines: Array<{
    id: string;
    productId: string;
    product: { id: string; name: string };
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    amount: number;
    tax?: { id: string; name: string; rate: number } | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    paymentDate: string;
  }>;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvoiceDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  /* ── Fetch invoice ──────────────────────────────────── */
  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/portal/subscriptions/${orderId}/invoices/${invoiceId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!res.ok) {
        if (res.status === 404) {
          setInvoice(null);
          return;
        }
        throw new Error("Failed to fetch invoice");
      }
      const data = await res.json();
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [orderId, invoiceId]);

  // Also get user email from auth
  useEffect(() => {
    try {
      const token = getToken();
      if (token) {
        // Decode JWT to get email (base64 decode middle part)
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  /* ── Handle Download ────────────────────────────────── */
  const handleDownload = () => {
    if (!invoice) return;

    const isPaid =
      invoice.status === "PAID" || invoice.payments.length > 0;
    const paidPayment = invoice.payments.length > 0 ? invoice.payments[0] : null;

    const discountValue = Number(invoice.discountAmount || invoice.subscription.discountAmount || 0);
    const taxRatio = Number(invoice.subtotal) > 0 ? (Number(invoice.subtotal) - discountValue) / Number(invoice.subtotal) : 1;

    // Group taxes by rate or tax name for breakdown
    const taxGroups = new Map<string, { name: string; amount: number }>();
    invoice.lines.forEach((line) => {
      if (line.tax) {
        const key = line.tax.id;
        const existing = taxGroups.get(key);
        if (existing) {
          existing.amount += Number(line.taxAmount);
        } else {
          taxGroups.set(key, {
            name: `${line.tax.name} (${Number(line.tax.rate)}%)`,
            amount: Number(line.taxAmount),
          });
        }
      } else if (Number(line.taxAmount) > 0) {
        // Fallback: calculate rate from taxAmount and line total
        const lineSubtotal = Number(line.unitPrice) * line.quantity;
        const rate = lineSubtotal > 0 ? (Number(line.taxAmount) / lineSubtotal) * 100 : 0;
        const roundedRate = Math.round(rate * 100) / 100;
        const key = `rate-${roundedRate}`;
        const existing = taxGroups.get(key);
        const taxLabel = taxNames[roundedRate] || `Tax (${roundedRate.toFixed(0)}%)`;
        if (existing) {
          existing.amount += Number(line.taxAmount);
        } else {
          taxGroups.set(key, {
            name: taxLabel,
            amount: Number(line.taxAmount),
          });
        }
      }
    });

    generateInvoicePdf({
      invoiceNo: invoice.invoiceNo,
      subscriptionNo: invoice.subscription.subscriptionNo,
      status: invoice.status,
      customerEmail: userEmail,
      invoiceDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentTerm: "—",
      lines: invoice.lines.map((l) => ({
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        taxRate: l.tax ? Number(l.tax.rate) : undefined,
        taxName: l.tax?.name,
        amount: Number(l.amount),
      })),
      discountCode: invoice.discountCode || invoice.subscription.discountCode || undefined,
      discountAmount: Number(invoice.discountAmount || invoice.subscription.discountAmount || 0),
      subtotal: Number(invoice.subtotal),
      taxBreakdown: Array.from(taxGroups.values()).map((t) => ({
        ...t,
        amount: t.amount * taxRatio,
      })),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      isPaid,
      paidDate: paidPayment?.paymentDate || null,
      amountDue: isPaid ? 0 : Number(invoice.totalAmount),
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

  if (!invoice) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/orders">Back to My Orders</Link>
        </Button>
      </div>
    );
  }

  /* ── Computed values ────────────────────────────────── */
  const isPaid =
    invoice.status === "PAID" || invoice.payments.length > 0;
  const paidPayment = invoice.payments.length > 0 ? invoice.payments[0] : null;
  const subtotal = Number(invoice.subtotal);
  const taxAmount = Number(invoice.taxAmount);
  const total = Number(invoice.totalAmount);
  const amountDue = isPaid ? 0 : total;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice {invoice.invoiceNo}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Source: {invoice.subscription.subscriptionNo}</span>
            <span>·</span>
            <Badge
              variant={
                isPaid
                  ? "default"
                  : invoice.status === "CANCELLED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {isPaid ? "Paid" : invoice.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!isPaid && (
            <Button className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Invoice metadata */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Invoice Date: </span>
            <span>
              {new Date(invoice.issueDate).toLocaleDateString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Due Date: </span>
            <span>
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Source: </span>
            <Link
              href={`/orders/${orderId}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {invoice.subscription.subscriptionNo}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{userEmail}</span>
          </p>
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
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
              {invoice.lines.map((line) => (
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
                      : Number(line.taxAmount) > 0
                        ? formatCurrency(Number(line.taxAmount))
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(Number(line.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex flex-col items-end gap-1 pt-2">
              <div className="flex w-52 justify-between">
                <span className="text-muted-foreground">Untaxed Amount</span>
                <span className="tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {(invoice.discountAmount || invoice.subscription.discountAmount) && Number(invoice.discountAmount || invoice.subscription.discountAmount) > 0 && (
                <div className="flex w-52 justify-between text-green-600">
                  <span>
                    Discount {(invoice.discountCode || invoice.subscription.discountCode) && `(${invoice.discountCode || invoice.subscription.discountCode})`}
                  </span>
                  <span className="tabular-nums">
                    −{formatCurrency(Number(invoice.discountAmount || invoice.subscription.discountAmount))}
                  </span>
                </div>
              )}
              {(() => {
                const discountValue = Number(invoice.discountAmount || invoice.subscription.discountAmount || 0);
                const taxRatio = subtotal > 0 ? (subtotal - discountValue) / subtotal : 1;
                // Group taxes by rate or tax name
                const taxGroups = new Map<string, { name: string; amount: number }>();
                invoice.lines.forEach((line) => {
                  if (line.tax) {
                    const key = line.tax.id;
                    const existing = taxGroups.get(key);
                    if (existing) {
                      existing.amount += Number(line.taxAmount);
                    } else {
                      taxGroups.set(key, {
                        name: `${line.tax.name} (${Number(line.tax.rate)}%)`,
                        amount: Number(line.taxAmount),
                      });
                    }
                  } else if (Number(line.taxAmount) > 0) {
                    // Fallback: calculate rate from taxAmount and line total
                    const lineSubtotal = Number(line.unitPrice) * line.quantity;
                    const rate = lineSubtotal > 0 ? (Number(line.taxAmount) / lineSubtotal) * 100 : 0;
                    const roundedRate = Math.round(rate * 100) / 100;
                    const key = `rate-${roundedRate}`;
                    const existing = taxGroups.get(key);
                    const taxLabel = taxNames[roundedRate] || `Tax (${roundedRate.toFixed(0)}%)`;
                    if (existing) {
                      existing.amount += Number(line.taxAmount);
                    } else {
                      taxGroups.set(key, {
                        name: taxLabel,
                        amount: Number(line.taxAmount),
                      });
                    }
                  }
                });

                return Array.from(taxGroups.values()).map((tax, idx) => (
                  <div key={idx} className="flex w-52 justify-between">
                    <span className="text-muted-foreground">{tax.name}</span>
                    <span className="tabular-nums">
                      {formatCurrency(tax.amount * taxRatio)}
                    </span>
                  </div>
                ));
              })()}
              <div className="flex w-52 justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>

              {isPaid && paidPayment && (
                <div className="flex w-52 justify-between text-muted-foreground">
                  <span>
                    Paid on{" "}
                    {new Date(paidPayment.paymentDate).toLocaleDateString(
                      "en-IN"
                    )}
                  </span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              )}

              <div
                className={`flex w-52 justify-between font-medium ${
                  amountDue > 0 ? "text-destructive" : ""
                }`}
              >
                <span>Amount Due</span>
                <span className="tabular-nums">
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button variant="link" className="px-0" asChild>
          <Link href={`/orders/${orderId}`}>← Back to Order</Link>
        </Button>
        <Button variant="link" className="px-0" asChild>
          <Link href="/orders">My Orders</Link>
        </Button>
      </div>
    </div>
  );
}
