"use client";

import Link from "next/link";
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
/*  Mock orders — replace with Prisma/API by userId later             */
/* ------------------------------------------------------------------ */

const MOCK_ORDERS = [
  { id: "S0001", orderDate: "06/02/2026", total: 1200 },
  { id: "S0002", orderDate: "06/02/2026", total: 1800 },
];

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function MyOrdersPage() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your subscription orders
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Order</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">Order</TableHead>
                <TableHead className="font-medium">Order Date</TableHead>
                <TableHead className="font-medium text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ORDERS.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.orderDate}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {MOCK_ORDERS.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No orders yet. Your orders will appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
