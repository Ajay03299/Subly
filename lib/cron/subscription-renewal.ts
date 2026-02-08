import "server-only";

import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const globalForCron = globalThis as unknown as {
  subscriptionRenewalTask?: cron.ScheduledTask;
};

const DEFAULT_CRON = "0 2 * * *";
const DEFAULT_TZ = "UTC";
const LOG_DIR = join(process.cwd(), ".cron-logs");
const LOG_FILE = join(LOG_DIR, "invoices.json");

function logToFile(event: {
  timestamp: string;
  type: "invoice-created" | "payment-recorded" | "job-start" | "job-end";
  subscriptionId?: string;
  data: Record<string, unknown>;
}) {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }

    let logs: typeof event[] = [];
    if (existsSync(LOG_FILE)) {
      try {
        const content = readFileSync(LOG_FILE, "utf-8").trim();
        if (content) {
          logs = JSON.parse(content);
          if (!Array.isArray(logs)) {
            logs = [];
          }
        }
      } catch (parseErr) {
        console.warn("[subscription-renewal] Could not parse existing logs, starting fresh");
        logs = [];
      }
    }

    logs.push(event);
    writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    console.log(`[subscription-renewal] Event logged: ${event.type}`);
  } catch (err) {
    console.error("[subscription-renewal] Failed to log event:", err);
  }
}

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

function shouldRenewMonthly(
  baseDate: Date,
  now: Date,
  latestInvoiceDate: Date | null,
  endDate: Date | null
) {
  const targetDate = getMonthlyTargetDate(baseDate, now);

  if (latestInvoiceDate && isSameMonth(latestInvoiceDate, now)) {
    return false;
  }

  if (now < targetDate) {
    return false;
  }

  if (endDate && targetDate > endDate) {
    return false;
  }

  return true;
}

export async function runSubscriptionRenewalJob() {
  const jobStartTime = new Date();
  console.log("[subscription-renewal] Job started at", jobStartTime.toISOString());

  logToFile({
    timestamp: jobStartTime.toISOString(),
    type: "job-start",
    data: { message: "Subscription renewal job started" },
  });

  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      recurringPlan: { billingPeriod: "MONTHLY" },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include: {
      lines: true,
      invoices: {
        orderBy: { issueDate: "desc" },
        take: 1,
      },
    },
  });

  for (const subscription of subscriptions) {
    const latestInvoice = subscription.invoices[0] ?? null;
    const baseDate = latestInvoice?.issueDate ?? subscription.createdAt;
    const endDate = subscription.endDate ?? null;

    if (!shouldRenewMonthly(baseDate, now, latestInvoice?.issueDate ?? null, endDate)) {
      continue;
    }

    if (subscription.lines.length === 0) {
      continue;
    }

    let subtotal = 0;
    let taxAmount = 0;

    const invoiceLines = subscription.lines.map((line) => {
      const qty = line.quantity;
      const unitPrice = Number(line.unitPrice);
      const taxRate = Number(line.taxRate || 0);
      const lineSubtotal = qty * unitPrice;
      const lineTax = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        productId: line.productId,
        taxId: line.taxId ?? undefined,
        quantity: qty,
        unitPrice,
        taxAmount: lineTax,
        amount: lineTotal,
      };
    });

    const totalAmount = subtotal + taxAmount;
    const invoiceNo = `INV-${subscription.subscriptionNo}-${now.getTime()}`;
    const invoiceDueDate = subscription.endDate ? new Date(subscription.endDate) : now;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        subscriptionId: subscription.id,
        status: "PAID",
        issueDate: now,
        dueDate: invoiceDueDate,
        subtotal,
        taxAmount,
        totalAmount,
        lines: {
          create: invoiceLines,
        },
      },
    });

    console.log("[subscription-renewal] Invoice created:", {
      invoiceNo,
      subscriptionId: subscription.id,
      totalAmount,
    });

    logToFile({
      timestamp: now.toISOString(),
      type: "invoice-created",
      subscriptionId: subscription.id,
      data: {
        invoiceNo,
        invoiceId: invoice.id,
        totalAmount,
      },
    });

    await prisma.payment.create({
      data: {
        method: "CREDIT_CARD",
        amount: totalAmount,
        paymentDate: now,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        userId: subscription.userId,
      },
    });

    console.log("[subscription-renewal] Payment recorded:", {
      amount: totalAmount,
      invoiceId: invoice.id,
    });

    logToFile({
      timestamp: now.toISOString(),
      type: "payment-recorded",
      subscriptionId: subscription.id,
      data: {
        invoiceId: invoice.id,
        amount: totalAmount,
      },
    });
  }

  const jobEndTime = new Date();
  console.log("[subscription-renewal] Job completed at", jobEndTime.toISOString());

  logToFile({
    timestamp: jobEndTime.toISOString(),
    type: "job-end",
    data: { message: "Subscription renewal job completed" },
  });
}

export function startSubscriptionRenewalCron() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (globalForCron.subscriptionRenewalTask) return;

  const schedule = process.env.SUBSCRIPTION_RENEWAL_CRON ?? DEFAULT_CRON;
  const timezone = process.env.SUBSCRIPTION_RENEWAL_TZ ?? DEFAULT_TZ;

  const task = cron.schedule(
    schedule,
    () => {
      runSubscriptionRenewalJob().catch((error) => {
        console.error("Subscription renewal cron failed:", error);
      });
    },
    { timezone }
  );

  globalForCron.subscriptionRenewalTask = task;
}
