"use client";

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

/* ------------------------------------------------------------------ */
/*  Mock order detail — replace with Prisma by subscription id        */
/* ------------------------------------------------------------------ */

const MOCK_ORDER = {
  id: "S0001",
  subscriptionId: "S00022",
  status: "Active",
  plan: "Subly Pro Monthly",
  startDate: "01/02/2026",
  endDate: "01/03/2026",
  alreadyRenewed: false,
  // Invoicing and shipping
  customerName: "Arjun Sai",
  address: "123 Tech Park, Bangalore, India",
  email: "arjun@example.com",
  phone: "+91 98765 43210",
  // Last invoices (link to invoice page)
  invoices: [
    { id: "001", invoiceNo: "INV/0015", paymentStatus: "Paid" },
  ] as const,
  // Products
  products: [
    { name: "Subly Pro", quantity: "2.00 Unit", unitPrice: 1200, taxRate: "15%", amount: 2400 },
    { name: "10% on your order", quantity: "1", unitPrice: -120, taxRate: "—", amount: -120 },
  ] as const,
  untaxedAmount: 2280,
  taxRate: 15,
  taxAmount: 360,
  total: 2640,
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // In a real app, fetch order by orderId; for now use mock if S0001
  const order = orderId === "S0001" ? MOCK_ORDER : orderId === "S0002"
    ? { ...MOCK_ORDER, id: "S0002", total: 1800, invoices: [{ id: "002", invoiceNo: "INV/0016", paymentStatus: "Pending" }] as const }
    : null;

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

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header: Order ID + status + actions */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order / {order.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.subscriptionId} ·{" "}
            <Badge variant="secondary" className="font-normal">
              {order.status}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          {!order.alreadyRenewed && (
            <Button size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
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
              <span className="font-medium">{order.plan}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Start Date: </span>
              <span>{order.startDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground">End Date: </span>
              <span>{order.endDate}</span>
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
            <p className="font-medium">{order.customerName}</p>
            <p className="text-muted-foreground">{order.address}</p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {order.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {order.phone}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Invoices */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Last Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/orders/${order.id}/invoice/${inv.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{inv.invoiceNo}</span>
                <Badge
                  variant={inv.paymentStatus === "Paid" ? "default" : "secondary"}
                >
                  {inv.paymentStatus}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Products
          </CardTitle>
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
              {order.products.map((line, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    {line.unitPrice >= 0 ? `${line.unitPrice} Rs` : `${line.unitPrice} Rs`}
                  </TableCell>
                  <TableCell className="text-right">{line.taxRate}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
            <div className="flex w-48 justify-between">
              <span className="text-muted-foreground">Untaxed Amount</span>
              <span>{formatCurrency(order.untaxedAmount)}</span>
            </div>
            <div className="flex w-48 justify-between">
              <span className="text-muted-foreground">Tax {order.taxRate}%</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex w-48 justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
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
