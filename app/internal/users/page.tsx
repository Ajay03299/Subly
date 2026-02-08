"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  RefreshCw,
  Loader2,
  Shield,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppUser, Role } from "@/lib/types/users";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SubscriptionSummary {
  id: string;
  subscriptionNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  lines: Array<{
    product: { name: string };
    quantity: number;
    amount: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Status badge helper                                                */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  CONFIRMED: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  DRAFT: "bg-gray-600/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  QUOTATION: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  CLOSED: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLES[status] ?? "")}>
      {status}
    </Badge>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("INTERNAL");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Subscription expansion state
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const getToken = useCallback(
    () => localStorage.getItem("accessToken") ?? "",
    []
  );

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!email.trim()) return;
    setCreating(true);
    const payload = { email: email.trim(), role };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed");
      setCreating(false);
      return;
    }
    setEmail("");
    setCreating(false);
    await load();
  }

  /* ── Load subscriptions for a given email ───────────────── */
  async function loadSubscriptionsForEmail(email: string) {
    if (expandedEmail === email) {
      setExpandedEmail(null);
      return;
    }

    setExpandedEmail(email);
    setSubsLoading(true);
    setSubscriptions([]);

    try {
      const res = await fetch("/api/admin/subscriptions", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        setSubsLoading(false);
        return;
      }

      const data = await res.json();
      const allSubs: SubscriptionSummary[] = (data.subscriptions || [])
        .filter((s: { user?: { email?: string } }) =>
          s.user?.email?.toLowerCase() === email.toLowerCase()
        )
        .map((s: SubscriptionSummary) => ({
          id: s.id,
          subscriptionNo: s.subscriptionNo,
          status: s.status,
          totalAmount: Number(s.totalAmount),
          createdAt: s.createdAt,
          lines: s.lines,
        }));

      setSubscriptions(allSubs);
    } catch {
      // silent
    } finally {
      setSubsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 dark:bg-blue-400/10">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
            <p className="text-muted-foreground">
              Manage internal users and administrators
            </p>
          </div>
        </div>
      </div>

      {/* ── Create User ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create New User</CardTitle>
          <CardDescription>
            Add a new user to the system. They will receive an email to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              className="flex-1"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL">INTERNAL</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={create} disabled={creating || !email.trim()}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create
            </Button>
            <Button variant="outline" size="icon" onClick={load} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Users Table ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Users
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({users.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isExpanded = expandedEmail === u.email;
                  return (
                    <Fragment key={u.id}>
                      <TableRow
                        className={cn(
                          "group transition-colors",
                          isExpanded && "bg-muted/50"
                        )}
                      >
                        <TableCell className="font-medium">
                          <button
                            onClick={() => loadSubscriptionsForEmail(u.email)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent",
                              isExpanded
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-foreground"
                            )}
                          >
                            {u.email}
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* ── Expanded subscription row ───────── */}
                      {isExpanded && (
                        <TableRow key={`${u.id}-subs`}>
                          <TableCell colSpan={3} className="bg-muted/30 p-0">
                            <div className="px-6 py-4">
                              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                                <FileText className="h-4 w-4 text-primary" />
                                Subscriptions for{" "}
                                <span className="text-primary">{u.email}</span>
                              </div>

                              {subsLoading ? (
                                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading subscriptions...
                                </div>
                              ) : subscriptions.length === 0 ? (
                                <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                                  No subscriptions found for this user.
                                </div>
                              ) : (
                                <div className="rounded-lg border overflow-hidden bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs">
                                          Subscription #
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Status
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Products
                                        </TableHead>
                                        <TableHead className="text-xs text-right">
                                          Total
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Date
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {subscriptions.map((sub) => (
                                        <TableRow key={sub.id}>
                                          <TableCell>
                                            <Link
                                              href={`/internal/subscriptions`}
                                              className="font-mono text-xs text-primary hover:underline"
                                            >
                                              {sub.subscriptionNo}
                                            </Link>
                                          </TableCell>
                                          <TableCell>
                                            <StatusBadge
                                              status={sub.status}
                                            />
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground">
                                            {sub.lines
                                              ?.map(
                                                (l) =>
                                                  `${l.product?.name ?? "—"} x${l.quantity}`
                                              )
                                              .join(", ") || "—"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {new Intl.NumberFormat("en-IN", {
                                              style: "currency",
                                              currency: "INR",
                                            }).format(sub.totalAmount)}
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground">
                                            {new Date(
                                              sub.createdAt
                                            ).toLocaleDateString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
