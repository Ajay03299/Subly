"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, CreditCard, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/* ------------------------------------------------------------------ */
/*  Mock invoice — replace with Prisma by invoice id                  */
/* ------------------------------------------------------------------ */

const MOCK_INVOICE = {
  orderId: "S0001",
  invoiceId: "001",
  invoiceNo: "INV/0015",
  isPaid: true,
  invoiceDate: "06/02/2026",
  dueDate: "06/02/2026",
  source: "Subscription S0001",
  customerName: "Arjun Sai",
  email: "arjun@example.com",
  paymentTerm: "Immediate Payment",
  products: [
    { name: "Subly Pro", quantity: "2.00 Unit", unitPrice: "2400 Rs", taxRate: "15%", amount: 180.0 },
    { name: "10% on your order", quantity: "1", unitPrice: "—", taxRate: "—", amount: -120 },
  ] as const,
  untaxedAmount: 2280,
  taxRate: 15,
  taxAmount: 360,
  total: 2640,
  paidOn: "06/02/2026",
  amountDue: 0,
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const invoiceId = params.invoiceId as string;

  // In a real app, fetch invoice by orderId + invoiceId
  const invoice =
    orderId === "S0001" && (invoiceId === "001" || invoiceId === "0015")
      ? MOCK_INVOICE
      : orderId === "S0002" && invoiceId === "002"
        ? { ...MOCK_INVOICE, orderId: "S0002", invoiceId: "002", invoiceNo: "INV/0016", isPaid: false, paidOn: "—", amountDue: 2640 }
        : null;

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

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order / {invoice.orderId} / Inv / {invoice.invoiceId}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoice {invoice.invoiceNo}
          </p>
        </div>
        <div className="flex gap-2">
          {!invoice.isPaid && (
            <Button className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2">
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
            <span>{invoice.invoiceDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Due Date: </span>
            <span>{invoice.dueDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Source: </span>
            <span>{invoice.source}</span>
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
          <p className="font-medium">{invoice.customerName}</p>
          <p className="text-muted-foreground">{invoice.email}</p>
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
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Taxes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.products.map((line, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell className="text-right">{line.unitPrice}</TableCell>
                  <TableCell className="text-right">{line.taxRate}</TableCell>
                  <TableCell className="text-right">
                    {typeof line.amount === "number"
                      ? formatCurrency(line.amount)
                      : line.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Payment Term: </span>
              <span>{invoice.paymentTerm}</span>
            </div>
            <div className="flex flex-col items-end gap-1 pt-2">
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Untaxed Amount</span>
                <span>{formatCurrency(invoice.untaxedAmount)}</span>
              </div>
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Tax {invoice.taxRate}%</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex w-48 justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.isPaid && (
                <>
                  <div className="flex w-48 justify-between text-muted-foreground">
                    <span>Paid on {invoice.paidOn}</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                  <div className="flex w-48 justify-between font-medium">
                    <span>Amount Due</span>
                    <span>{formatCurrency(invoice.amountDue)}</span>
                  </div>
                </>
              )}
              {!invoice.isPaid && (
                <div className="flex w-48 justify-between font-medium text-destructive">
                  <span>Amount Due</span>
                  <span>{formatCurrency(invoice.amountDue)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button variant="link" className="px-0" asChild>
          <Link href={`/orders/${invoice.orderId}`}>← Back to Order</Link>
        </Button>
        <Button variant="link" className="px-0" asChild>
          <Link href="/orders">My Orders</Link>
        </Button>
      </div>
    </div>
  );
}
