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
/*  GET /api/admin/subscriptions — list all                            */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: { select: { id: true, email: true } },
        recurringPlan: true,
        lines: {
          include: { product: true },
        },
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions }, { status: 200 });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/admin/subscriptions — create new                         */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.role !== "ADMIN" && auth.role !== "INTERNAL_USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      recurringPlanId,
      paymentTerms,
      expirationDate,
      lines, // Array of { productId, quantity, unitPrice, taxRate, discount }
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Customer (userId) is required" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.user.findUnique({ where: { id: userId } });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const subscriptionNo = await generateSubscriptionNo();

    // Calculate totals from lines
    let subtotal = 0;
    let taxAmount = 0;

    const lineData = (lines || []).map(
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
          productId: line.productId,
          quantity: qty,
          unitPrice: discountedPrice,
          taxRate: line.taxRate || 0,
          amount: lineTotal,
        };
      }
    );

    const totalAmount = subtotal + taxAmount;

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNo,
        userId,
        recurringPlanId: recurringPlanId || null,
        paymentTerms: paymentTerms || null,
        endDate: expirationDate ? new Date(expirationDate) : null,
        status: "DRAFT",
        subtotal,
        taxAmount,
        totalAmount,
        lines: {
          create: lineData,
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
      { message: "Subscription created successfully", subscription },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
