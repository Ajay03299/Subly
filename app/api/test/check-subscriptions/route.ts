import { prisma } from "@/lib/prisma";

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthlyTargetDate(base: Date, ref: Date) {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const baseDay = base.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(baseDay, lastDayOfMonth);
  return new Date(year, month, targetDay);
}

export async function GET() {
  const now = new Date();

  // Get all subscriptions
  const allSubs = await prisma.subscription.findMany({
    include: {
      recurringPlan: { select: { billingPeriod: true } },
      lines: { select: { id: true } },
      invoices: {
        orderBy: { issueDate: "desc" },
        take: 1,
        select: { issueDate: true },
      },
    },
  });

  // Get active monthly subscriptions like the job does
  const activeSubs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      recurringPlan: { billingPeriod: "MONTHLY" },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include: {
      recurringPlan: { select: { billingPeriod: true } },
      lines: { select: { id: true } },
      invoices: {
        orderBy: { issueDate: "desc" },
        take: 1,
        select: { issueDate: true },
      },
    },
  });

  // Check renewal status for each active subscription
  const renewalStatus = activeSubs.map((sub) => {
    const latestInvoice = sub.invoices[0] ?? null;
    const baseDate = latestInvoice?.issueDate ?? sub.createdAt;
    const endDate = sub.endDate ?? null;
    const targetDate = getMonthlyTargetDate(baseDate, now);

    const reasons: string[] = [];

    if (latestInvoice && isSameMonth(latestInvoice.issueDate, now)) {
      reasons.push("already-invoiced-this-month");
    }

    if (now < targetDate) {
      reasons.push(`not-due-yet (target: ${targetDate.toISOString()})`);
    }

    if (endDate && targetDate > endDate) {
      reasons.push("past-end-date");
    }

    if (sub.lines.length === 0) {
      reasons.push("no-lines");
    }

    return {
      id: sub.id,
      subscriptionNo: sub.subscriptionNo,
      status: sub.status,
      billingPeriod: sub.recurringPlan.billingPeriod,
      createdAt: sub.createdAt.toISOString(),
      endDate: endDate?.toISOString() || "none",
      lastInvoice: latestInvoice?.issueDate.toISOString() || "none",
      lines: sub.lines.length,
      shouldRenew: reasons.length === 0,
      skipReasons: reasons,
    };
  });

  return Response.json({
    now: now.toISOString(),
    totalSubscriptions: allSubs.length,
    activeMonthly: activeSubs.length,
    renewalStatus,
  });
}
