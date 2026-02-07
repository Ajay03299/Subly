import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

async function getAuthUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: generate next subscription number                          */
/* ------------------------------------------------------------------ */
async function generateSubscriptionNo(): Promise<string> {
  const last = await prisma.subscription.findFirst({
    orderBy: { createdAt: "desc" },
    select: { subscriptionNo: true },
  });

  let nextNum = 1;
  if (last?.subscriptionNo) {
    const match = last.subscriptionNo.match(/SO(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `SO${String(nextNum).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  POST /api/portal/subscriptions/[id]/renew                          */
/*  Creates a new subscription with the same order lines               */
/* ------------------------------------------------------------------ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch the existing subscription with lines
    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
        recurringPlan: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Ensure the subscription belongs to this user
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Only allow renewing confirmed or active subscriptions
    if (!["CONFIRMED", "ACTIVE", "CLOSED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Can only renew confirmed, active, or closed subscriptions" },
        { status: 400 }
      );
    }

    const newSubNo = await generateSubscriptionNo();

    // Create a new subscription with the same order lines
    const newSub = await prisma.subscription.create({
      data: {
        subscriptionNo: newSubNo,
        userId: existing.userId,
        recurringPlanId: existing.recurringPlanId,
        paymentTerms: existing.paymentTerms,
        status: "DRAFT",
        subtotal: existing.subtotal,
        taxAmount: existing.taxAmount,
        totalAmount: existing.totalAmount,
        lines: {
          create: existing.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            amount: line.amount,
          })),
        },
      },
      include: {
        recurringPlan: true,
        lines: { include: { product: true } },
        invoices: true,
      },
    });

    return NextResponse.json(
      {
        message: "Subscription renewed successfully",
        subscription: newSub,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Portal renew subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
