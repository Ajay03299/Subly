"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  FileText,
  BarChart3,
  Package,
  CreditCard,
  LogOut,
  ArrowRight,
  TrendingUp,
  Settings,
  Loader2,
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
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalProducts: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

/* ------------------------------------------------------------------ */
/*  Management card data                                               */
/* ------------------------------------------------------------------ */

const MANAGEMENT_CARDS = [
  {
    title: "Subscriptions",
    description: "Manage subscription orders",
    detail: "Create and manage subscription plans, track order lifecycles, and handle renewals.",
    href: "/internal/subscriptions",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-600/10 dark:bg-blue-400/10",
  },
  {
    title: "Products",
    description: "Manage product catalog",
    detail: "Create and manage products with recurring plans, pricing, and tags.",
    href: "/internal/products",
    icon: Package,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-600/10 dark:bg-emerald-400/10",
  },
  {
    title: "Reporting",
    description: "Analytics & insights",
    detail: "View revenue analytics, subscription trends, and financial reporting.",
    href: "/internal/reporting",
    icon: BarChart3,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-600/10 dark:bg-violet-400/10",
  },
  {
    title: "Users & Contacts",
    description: "Manage user accounts",
    detail: "View, edit, and manage all user accounts, roles, and permissions.",
    href: "/internal/users",
    icon: Users,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-600/10 dark:bg-amber-400/10",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InternalPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN", "INTERNAL_USER"],
    redirectTo: "/",
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const getToken = useCallback(
    () => localStorage.getItem("accessToken") ?? "",
    []
  );

  /* ── Fetch real stats ─────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;

    const fetchStats = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };

        const [usersRes, subsRes, productsRes, reportingRes] =
          await Promise.all([
            fetch("/api/admin/users", { headers }),
            fetch("/api/admin/subscriptions", { headers }),
            fetch("/api/admin/products", { headers }),
            fetch("/api/admin/reporting", { headers }),
          ]);

        const usersData = usersRes.ok ? await usersRes.json() : null;
        const subsData = subsRes.ok ? await subsRes.json() : null;
        const productsData = productsRes.ok ? await productsRes.json() : null;
        const reportingData = reportingRes.ok
          ? await reportingRes.json()
          : null;

        const activeSubs =
          subsData?.subscriptions?.filter(
            (s: { status: string }) => s.status === "ACTIVE"
          ).length ?? 0;

        setStats({
          totalUsers: usersData?.users?.length ?? 0,
          activeSubscriptions: activeSubs,
          totalRevenue: reportingData?.overview?.totalRevenue ?? 0,
          totalProducts: productsData?.products?.length ?? 0,
        });
      } catch {
        // silent — stats will just stay null
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [authLoading, getToken]);

  /* ── Loading state ────────────────────────────────────────── */
  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN";

  /* ── Stat cards config ────────────────────────────────────── */
  const statCards = [
    {
      label: "Total Users",
      value: stats ? stats.totalUsers.toLocaleString() : "—",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-600/10 dark:bg-blue-400/10",
    },
    {
      label: "Active Subscriptions",
      value: stats ? stats.activeSubscriptions.toLocaleString() : "—",
      icon: Package,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-600/10 dark:bg-emerald-400/10",
    },
    {
      label: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : "—",
      icon: CreditCard,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-600/10 dark:bg-violet-400/10",
    },
    {
      label: "Products",
      value: stats ? stats.totalProducts.toLocaleString() : "—",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-600/10 dark:bg-amber-400/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.email.split("@")[0]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className="gap-1"
          >
            <Shield className="h-3 w-3" />
            {isAdmin ? "Administrator" : "Internal User"}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md ${card.bg}`}
              >
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Management cards ────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Quick Access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MANAGEMENT_CARDS.map((card) => (
            <Card
              key={card.title}
              className="group flex cursor-pointer flex-col transition-all hover:shadow-md"
              onClick={() => router.push(card.href)}
            >
              <CardHeader className="flex-1 pb-3">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.detail}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Admin-only: Configuration */}
          {isAdmin && (
            <Card
              className="group flex cursor-pointer flex-col border-primary/30 transition-all hover:shadow-md"
              onClick={() => router.push("/internal/configuration")}
            >
              <CardHeader className="flex-1 pb-3">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">Configuration</CardTitle>
                    <CardDescription className="text-xs">
                      Admin only
                    </CardDescription>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Configure system settings, manage product tags, and integrations.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  Configure
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
