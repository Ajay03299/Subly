import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "No token provided", status: 401 };
  }
  try {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) return { error: "User not found", status: 404 };
    return { userId: user.id, role: user.role };
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/reporting                                           */
/*  Returns aggregated statistics for the reporting dashboard          */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rangeParam = request.nextUrl.searchParams.get("range") || "1y";
    const range = rangeParam.toLowerCase();
    const now = new Date();
    let rangeStart: Date;
    let bucketCount: number;
    let bucketType: "month" | "year" | "week";

    if (range === "1m") {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      bucketCount = 4;
      bucketType = "week";
    } else if (range === "6m") {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      bucketCount = 6;
      bucketType = "month";
    } else if (range === "10y") {
      rangeStart = new Date(now.getFullYear() - 10, now.getMonth(), 1);
      bucketCount = 10;
      bucketType = "year";
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      bucketCount = 12;
      bucketType = "month";
    }

    // Run all queries in parallel for performance
    const [
      // Subscription counts by status
      subscriptionsByStatus,
      totalSubscriptions,

      // Invoice counts by status
      invoicesByStatus,
      totalInvoices,

      // Revenue: sum of all subscription totalAmount
      revenueAgg,

      // Payments: sum + count
      paymentAgg,
      totalPayments,

      // Recent subscriptions
      recentSubscriptions,

      // Recent payments
      recentPayments,

      // Overdue invoices: CONFIRMED (not paid) with dueDate in the past
      overdueInvoices,

      // Total users
      totalUsers,

      // Total products
      totalProducts,

      // Monthly revenue breakdown (last 12 months)
      allSubscriptions,
    ] = await Promise.all([
      // Subscriptions by status
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.subscription.count(),

      // Invoices by status
      prisma.invoice.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.invoice.count(),

      // Revenue: total from active subscriptions
      prisma.subscription.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ["ACTIVE"] } },
      }),

      // Payments aggregate
      prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      prisma.payment.count(),

      // Recent subscriptions (last 10)
      prisma.subscription.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
          recurringPlan: { select: { billingPeriod: true } },
        },
      }),

      // Recent payments (last 10)
      prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
          subscription: { select: { subscriptionNo: true } },
        },
      }),

      // Overdue invoices
      prisma.invoice.findMany({
        where: {
          status: { in: ["DRAFT", "CONFIRMED"] },
          dueDate: { lt: new Date() },
        },
        include: {
          subscription: {
            select: {
              subscriptionNo: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),

      // Total users
      prisma.user.count(),

      // Total products
      prisma.product.count(),

      // Subscriptions for revenue breakdown (dynamic range)
      prisma.subscription.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: {
          totalAmount: true,
          createdAt: true,
          status: true,
        },
      }),
    ]);

    // Process subscription status counts
    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      QUOTATION: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      CLOSED: 0,
    };
    for (const row of subscriptionsByStatus) {
      statusCounts[row.status] = row._count.id;
    }

    // Process invoice status counts
    const invoiceStatusCounts: Record<string, number> = {
      DRAFT: 0,
      CONFIRMED: 0,
      PAID: 0,
      CANCELLED: 0,
    };
    for (const row of invoicesByStatus) {
      invoiceStatusCounts[row.status] = row._count.id;
    }

    // Revenue breakdown by bucket (week / month / year)
    const monthlyRevenue: Array<{
      month: string;
      revenue: number;
      count: number;
    }> = [];
    const bucketMap = new Map<string, { revenue: number; count: number }>();

    for (const sub of allSubscriptions) {
      const d = new Date(sub.createdAt);
      let key: string;
      if (bucketType === "year") {
        key = String(d.getFullYear());
      } else if (bucketType === "week") {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.floor(
          (d.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      const existing = bucketMap.get(key) || { revenue: 0, count: 0 };
      existing.revenue += Number(sub.totalAmount);
      existing.count += 1;
      bucketMap.set(key, existing);
    }

    if (bucketType === "year") {
      for (let i = bucketCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear() - i, 0, 1);
        const key = String(d.getFullYear());
        const data = bucketMap.get(key) || { revenue: 0, count: 0 };
        monthlyRevenue.push({
          month: key,
          revenue: data.revenue,
          count: data.count,
        });
      }
    } else if (bucketType === "week") {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      for (let i = bucketCount - 1; i >= 0; i--) {
        const start = new Date(now.getTime() - (i + 1) * weekMs);
        const end = new Date(now.getTime() - i * weekMs);
        const key = `W${i}`;
        let revenue = 0;
        let count = 0;
        for (const sub of allSubscriptions) {
          const t = new Date(sub.createdAt).getTime();
          if (t >= start.getTime() && t < end.getTime()) {
            revenue += Number(sub.totalAmount);
            count += 1;
          }
        }
        monthlyRevenue.push({
          month: `Week ${bucketCount - i}`,
          revenue,
          count,
        });
      }
    } else {
      for (let i = bucketCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        const data = bucketMap.get(key) || { revenue: 0, count: 0 };
        monthlyRevenue.push({
          month: label,
          revenue: data.revenue,
          count: data.count,
        });
      }
    }

    const totalRevenue = Number(revenueAgg._sum.totalAmount) || 0;
    const totalPaymentAmount = Number(paymentAgg._sum.amount) || 0;

    return NextResponse.json(
      {
        overview: {
          totalSubscriptions,
          activeSubscriptions: statusCounts.ACTIVE || 0,
          totalRevenue,
          totalPayments: totalPaymentAmount,
          paymentCount: totalPayments,
          totalUsers,
          totalProducts,
          totalInvoices,
          overdueInvoiceCount: overdueInvoices.length,
        },
        subscriptionsByStatus: statusCounts,
        invoicesByStatus: invoiceStatusCounts,
        monthlyRevenue,
        recentSubscriptions: recentSubscriptions.map((s) => ({
          id: s.id,
          subscriptionNo: s.subscriptionNo,
          customer: s.user.email,
          status: s.status,
          totalAmount: Number(s.totalAmount),
          plan: s.recurringPlan ? `₹${Number(s.recurringPlan.price)}/${s.recurringPlan.billingPeriod.toLowerCase()}` : "—",
          billingPeriod: s.recurringPlan?.billingPeriod || "—",
          createdAt: s.createdAt,
        })),
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          customer: p.user.email,
          subscriptionNo: p.subscription.subscriptionNo,
          method: p.method,
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
        })),
        overdueInvoices: overdueInvoices.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          customer: inv.subscription.user.email,
          subscriptionNo: inv.subscription.subscriptionNo,
          status: inv.status,
          totalAmount: Number(inv.totalAmount),
          dueDate: inv.dueDate,
          issueDate: inv.issueDate,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reporting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
