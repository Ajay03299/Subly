import { prisma } from "@/lib/prisma";

export async function GET() {
  const allSubs = await prisma.subscription.findMany({
    include: {
      user: { select: { email: true } },
      recurringPlan: { select: { billingPeriod: true } },
      lines: { select: { id: true, quantity: true, unitPrice: true } },
      invoices: {
        orderBy: { issueDate: "desc" },
        take: 2,
        select: { issueDate: true, invoiceNo: true },
      },
    },
  });

  return Response.json({
    count: allSubs.length,
    subscriptions: allSubs.map((sub) => ({
      id: sub.id,
      subscriptionNo: sub.subscriptionNo,
      userEmail: sub.user?.email,
      status: sub.status,
      billingPeriod: sub.recurringPlan.billingPeriod,
      createdAt: sub.createdAt.toISOString(),
      endDate: sub.endDate?.toISOString() || null,
      lines: sub.lines.length,
      lineDetails: sub.lines,
      recentInvoices: sub.invoices.map((inv) => ({
        invoiceNo: inv.invoiceNo,
        issueDate: inv.issueDate.toISOString(),
      })),
    })),
  });
}
