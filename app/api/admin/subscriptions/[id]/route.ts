import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "No token provided", status: 401 };
  }

  const token = authHeader.substring(7);
  let payload: { userId: string };
  try {
    payload = verifyAccessToken(token);
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  return { userId: user.id, role: user.role };
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
/*  GET /api/admin/subscriptions/[id]                                  */
/* ------------------------------------------------------------------ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        recurringPlan: true,
        lines: { include: { product: true } },
        invoices: {
          include: {
            lines: { include: { product: true, tax: true } },
            payments: true,
          },
        },
        payments: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/subscriptions/[id] — update / status change       */
/* ------------------------------------------------------------------ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Handle status transitions
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["QUOTATION", "CONFIRMED"],
        QUOTATION: ["CONFIRMED", "DRAFT"],
        CONFIRMED: ["ACTIVE", "CLOSED"],
        ACTIVE: ["CLOSED"],
        CLOSED: [],
      };

      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${body.status}`,
          },
          { status: 400 }
        );
      }
    }

    // Handle adding/updating lines
    if (body.lines) {
      // Delete old lines and recreate
      await prisma.subscriptionLine.deleteMany({
        where: { subscriptionId: id },
      });

      let subtotal = 0;
      let taxAmount = 0;

      const lineData = body.lines.map(
        (line: {
          productId: string;
          quantity: number;
          unitPrice: number;
          taxRate: number;
          discount?: number;
        }) => {
          const qty = line.quantity || 1;
          const price = line.unitPrice || 0;
          const discount = line.discount || 0;
          const discountedPrice = price * (1 - discount / 100);
          const lineSubtotal = qty * discountedPrice;
          const lineTax = lineSubtotal * ((line.taxRate || 0) / 100);
          const lineTotal = lineSubtotal + lineTax;

          subtotal += lineSubtotal;
          taxAmount += lineTax;

          return {
            subscriptionId: id,
            productId: line.productId,
            quantity: qty,
            unitPrice: discountedPrice,
            taxRate: line.taxRate || 0,
            amount: lineTotal,
          };
        }
      );

      if (lineData.length > 0) {
        await prisma.subscriptionLine.createMany({ data: lineData });
      }

      body.subtotal = subtotal;
      body.taxAmount = taxAmount;
      body.totalAmount = subtotal + taxAmount;
      delete body.lines;
    }

    // Handle "renew" action — create a new subscription with same lines
    if (body.action === "renew") {
      const newSubNo = await generateSubscriptionNo();

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
          user: { select: { id: true, email: true } },
          recurringPlan: true,
          lines: { include: { product: true } },
          invoices: true,
        },
      });

      return NextResponse.json(
        { message: "Subscription renewed", subscription: newSub },
        { status: 201 }
      );
    }

    // Handle "create_invoice" action
    if (body.action === "create_invoice") {
      const invoiceNo = `INV/${String(Date.now()).slice(-6)}`;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          subscriptionId: id,
          status: "DRAFT",
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: existing.subtotal,
          taxAmount: existing.taxAmount,
          totalAmount: existing.totalAmount,
          lines: {
            create: existing.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxAmount: line.amount,
              amount: line.amount,
            })),
          },
        },
        include: {
          lines: { include: { product: true } },
        },
      });

      return NextResponse.json(
        { message: "Invoice created", invoice },
        { status: 201 }
      );
    }

    // Regular update
    const { action, ...updateData } = body;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true } },
        recurringPlan: true,
        lines: { include: { product: true } },
        invoices: true,
      },
    });

    return NextResponse.json(
      { message: "Subscription updated", subscription },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/subscriptions/[id]                                */
/* ------------------------------------------------------------------ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete subscriptions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Delete lines first, then subscription
    await prisma.subscriptionLine.deleteMany({
      where: { subscriptionId: id },
    });
    await prisma.subscription.delete({ where: { id } });

    return NextResponse.json(
      { message: "Subscription deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
