"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

type SubStatus =
  | "Draft"
  | "Quotation"
  | "Confirmed"
  | "Active"
  | "Closed"
  | "In Progress"
  | "Churned"
  | "Quotation Sent";

interface Subscription {
  id: string;
  number: string;
  customer: string;
  nextInvoice: string;
  recurring: string;
  plan: string;
  status: SubStatus;
}

const MOCK_SUBS: Subscription[] = [
  {
    id: "1",
    number: "SO001",
    customer: "Customer 1",
    nextInvoice: "Feb 14",
    recurring: "$140",
    plan: "Monthly",
    status: "In Progress",
  },
  {
    id: "2",
    number: "SO002",
    customer: "Customer 2",
    nextInvoice: "Feb 18",
    recurring: "$116",
    plan: "Monthly",
    status: "Churned",
  },
  {
    id: "3",
    number: "SO003",
    customer: "Customer 3",
    nextInvoice: "Feb 10",
    recurring: "$230",
    plan: "Yearly",
    status: "Quotation Sent",
  },
  {
    id: "4",
    number: "SO004",
    customer: "Customer 4",
    nextInvoice: "Mar 01",
    recurring: "$89",
    plan: "Monthly",
    status: "Active",
  },
  {
    id: "5",
    number: "SO005",
    customer: "Customer 5",
    nextInvoice: "Mar 15",
    recurring: "$450",
    plan: "Yearly",
    status: "Draft",
  },
  {
    id: "6",
    number: "SO006",
    customer: "Customer 6",
    nextInvoice: "Feb 28",
    recurring: "$200",
    plan: "Monthly",
    status: "Confirmed",
  },
];

/* ------------------------------------------------------------------ */
/*  Status badge styling                                              */
/* ------------------------------------------------------------------ */

function statusVariant(status: SubStatus) {
  switch (status) {
    case "Active":
    case "Confirmed":
      return "default" as const;
    case "In Progress":
      return "secondary" as const;
    case "Draft":
    case "Quotation":
    case "Quotation Sent":
      return "outline" as const;
    case "Churned":
    case "Closed":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = MOCK_SUBS.filter(
    (s) =>
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage all subscription orders
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={selected.size === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            className="h-9 pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <button onClick={toggleAll} className="p-0.5">
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Next Invoice</TableHead>
              <TableHead className="text-right">Recurring</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sub) => (
                <TableRow
                  key={sub.id}
                  className={cn(
                    "cursor-pointer",
                    selected.has(sub.id) && "bg-muted/30"
                  )}
                >
                  <TableCell>
                    <button
                      onClick={() => toggleOne(sub.id)}
                      className="p-0.5"
                    >
                      {selected.has(sub.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{sub.number}</TableCell>
                  <TableCell>{sub.customer}</TableCell>
                  <TableCell>{sub.nextInvoice}</TableCell>
                  <TableCell className="text-right font-medium">
                    {sub.recurring}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {sub.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(sub.status)}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer info ────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {MOCK_SUBS.length} subscriptions
        {selected.size > 0 && <> &middot; {selected.size} selected</>}
      </p>
    </div>
  );
}
