"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
  CreditCard,
  Printer,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { generateInvoicePdf } from "@/lib/generate-pdf";

interface Invoice {
  id: string;
  invoiceNo: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  subscriptionId: string;
  subscription: {
    id: string;
    subscriptionNo: string;
    user: { id: string; email: string };
  };
  lines: Array<{
    id: string;
    product: { id: string; name: string };
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    amount: number;
    tax?: { name: string; rate: number } | null;
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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InternalInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN", "INTERNAL_USER"],
    redirectTo: "/internal",
  });

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setInvoice(null);
          return;
        }
        throw new Error("Failed to fetch invoice");
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!authLoading && invoiceId) fetchInvoice();
  }, [authLoading, invoiceId, fetchInvoice]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const performAction = async (action: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }
      const data = await res.json();
      setInvoice(data.invoice);
      if (action === "confirm") setSuccess("Invoice confirmed");
      if (action === "cancel") setSuccess("Invoice cancelled");
      if (action === "revert_to_draft") setSuccess("Reverted to draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      router.push("/internal/subscriptions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const amountDue = invoice
    ? Math.max(
        0,
        Number(invoice.totalAmount) -
          (invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0)
      )
    : 0;

  const handleRecordPayment = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          method: paymentMethod,
          amount: amountDue,
          paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setPaymentOpen(false);
      setSuccess("Payment recorded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;
    const total = Number(invoice.totalAmount);
    const paidTotal =
      invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const pdfData = {
      invoiceNo: invoice.invoiceNo,
      subscriptionNo: invoice.subscription.subscriptionNo,
      status: invoice.status,
      customerEmail: invoice.subscription.user.email,
      invoiceDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? undefined,
      lines: invoice.lines.map((l) => ({
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        taxRate: l.tax ? Number(l.tax.rate) : undefined,
        amount: Number(l.amount),
      })),
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: total,
      isPaid: paidTotal >= total,
      paidDate:
        invoice.payments?.length && invoice.payments[0]?.paymentDate
          ? invoice.payments[0].paymentDate
          : undefined,
      amountDue: Math.max(0, total - paidTotal),
    };
    generateInvoicePdf(pdfData);
  };

  const isPaid =
    invoice?.payments && invoice.payments.length > 0
      ? invoice.payments.reduce((s, p) => s + Number(p.amount), 0) >=
        Number(invoice?.totalAmount ?? 0)
      : false;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invoice not found</CardTitle>
            <CardDescription>
              The invoice may have been deleted or you don’t have access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/internal/subscriptions">Back to Subscriptions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionLink = `/internal/subscriptions?view=${invoice.subscriptionId}&fromInvoice=1`;
  const isDraft = invoice.status === "DRAFT";
  const isConfirmed = invoice.status === "CONFIRMED";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back */}
      <div className="mb-6">
        <Button variant="ghost" className="gap-2" asChild>
          <Link href="/internal/subscriptions">
            <ArrowLeft className="h-4 w-4" />
            Subscriptions
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-lg border border-brand/30 bg-brand-muted p-4 text-sm text-brand">
          {success}
        </div>
      )}

      {/* Header: actions + status */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={actionLoading || isConfirmed}
            title="Delete invoice"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isDraft && (
            <>
              <Button
                className="gap-2"
                onClick={() => performAction("confirm")}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => performAction("cancel")}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {isCancelled && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => performAction("revert_to_draft")}
              disabled={actionLoading}
            >
              Revert to draft
            </Button>
          )}
          {isConfirmed && (
            <>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href={subscriptionLink}>
                  <FileText className="h-4 w-4" />
                  Subscription
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <Send className="h-4 w-4" />
                Send
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setPaymentOpen(true)}
                disabled={isPaid || actionLoading}
              >
                <CreditCard className="h-4 w-4" />
                Pay
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isDraft ? "secondary" : isCancelled ? "destructive" : "default"}>
            {invoice.status}
          </Badge>
          {isConfirmed && (
            <Badge variant={isPaid ? "default" : "outline"}>
              {isPaid ? "Paid" : "Unpaid"}
            </Badge>
          )}
        </div>
      </div>

      {/* Customer & dates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice {invoice.invoiceNo}</CardTitle>
          <CardDescription>Source: {invoice.subscription.subscriptionNo}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">{invoice.subscription.user.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Invoice Date</Label>
            <p className="font-medium">{formatDate(invoice.issueDate)}</p>
            {isConfirmed && (
              <span className="ml-2 text-sm text-muted-foreground">
                {isPaid && "✓ Paid"}
              </span>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground">Due date</Label>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Order Lines / Other info */}
      <Tabs defaultValue="lines" className="mb-6">
        <TabsList>
          <TabsTrigger value="lines">Order Lines</TabsTrigger>
          <TabsTrigger value="other">Other info</TabsTrigger>
        </TabsList>
        <TabsContent value="lines">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Taxes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.product.name}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(line.unitPrice))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(line.taxAmount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(line.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <CardContent className="border-t">
              <div className="mt-4 flex justify-end gap-8 text-sm">
                <span>Subtotal: {formatCurrency(Number(invoice.subtotal))}</span>
                <span>Tax: {formatCurrency(Number(invoice.taxAmount))}</span>
                <span className="font-semibold">
                  Total: {formatCurrency(Number(invoice.totalAmount))}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="other">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Payment terms, notes, and other metadata can be added here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Record Payment</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentOpen(false)}
              >
                Discard
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <p className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-medium">
                  {formatCurrency(amountDue)} (invoice total due)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Payment must be for the full amount due.
                </p>
              </div>
              <div>
                <Label>Payment date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentOpen(false)}
                >
                  Discard
                </Button>
                <Button onClick={handleRecordPayment} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Payment"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
