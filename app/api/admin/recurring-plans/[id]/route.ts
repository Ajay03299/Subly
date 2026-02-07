import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

/* ── Auth helper ─────────────────────────────────────── */
async function authorise(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "No token provided", status: 401 };
  }

  const token = authHeader.substring(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return { error: "User not found", status: 401 };

  if (requireAdmin && user.role !== "ADMIN") {
    return { error: "Admin access required", status: 403 };
  }

  return { user };
}

/* ── GET /api/admin/recurring-plans/[id] ─────────────── */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise(request);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const plan = await prisma.recurringPlan.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          type: true,
          salesPrice: true,
          variants: { select: { id: true, attribute: true, value: true, extraPrice: true } },
        },
      },
      subscriptions: {
        select: {
          id: true,
          subscriptionNo: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!plan)
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json({ plan }, { status: 200 });
}

/* ── PUT /api/admin/recurring-plans/[id] ─────────────── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise(request, true);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.recurringPlan.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.billingPeriod !== undefined) data.billingPeriod = body.billingPeriod;
  if (body.autoClose !== undefined) data.autoClose = Boolean(body.autoClose);
  if (body.closeable !== undefined) data.closeable = Boolean(body.closeable);
  if (body.renewable !== undefined) data.renewable = Boolean(body.renewable);
  if (body.pausable !== undefined) data.pausable = Boolean(body.pausable);
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined)
    data.endDate = body.endDate ? new Date(body.endDate) : null;

  const updated = await prisma.recurringPlan.update({
    where: { id },
    data,
    include: {
      products: { select: { id: true, name: true, type: true, salesPrice: true } },
      subscriptions: {
        select: {
          id: true,
          subscriptionNo: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(
    { message: "Plan updated", plan: updated },
    { status: 200 }
  );
}

/* ── DELETE /api/admin/recurring-plans/[id] ───────────── */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise(request, true);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const existing = await prisma.recurringPlan.findUnique({
    where: { id },
    include: { subscriptions: { select: { id: true }, take: 1 } },
  });

  if (!existing)
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (existing.subscriptions.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a plan that has subscriptions" },
      { status: 400 }
    );
  }

  await prisma.recurringPlan.delete({ where: { id } });

  return NextResponse.json(
    { message: "Plan deleted" },
    { status: 200 }
  );
}
