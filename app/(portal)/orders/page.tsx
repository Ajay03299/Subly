"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subscription {
  id: string;
  subscriptionNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  recurringPlan?: {
    name: string;
    billingPeriod: string;
  } | null;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MyOrdersPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/subscriptions", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load orders"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your subscription orders
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Orders</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No orders yet. Your subscription orders will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Order</TableHead>
                  <TableHead className="font-medium">Order Date</TableHead>
                  <TableHead className="font-medium">Plan</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${sub.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {sub.subscriptionNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.recurringPlan
                        ? `${sub.recurringPlan.name} (${sub.recurringPlan.billingPeriod.toLowerCase()})`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(sub.status)}>
                        {statusLabel(sub.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sub.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
