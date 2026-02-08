import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

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
  if (!user) return { error: "User not found", status: 404 };
  return { userId: user.id, role: user.role };
}

const PAYMENT_METHODS = [
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TRANSFER",
  "UPI",
  "CASH",
  "OTHER",
];

/* ------------------------------------------------------------------ */
/*  POST /api/admin/invoices/[invoiceId]/payments                     */
/* ------------------------------------------------------------------ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { invoiceId } = await params;
    const body = await request.json().catch(() => ({}));
    const method = String(body.method || "CASH").toUpperCase();
    const amount = Number(body.amount);
    const paymentDate = body.paymentDate
      ? new Date(body.paymentDate)
      : new Date();

    if (!PAYMENT_METHODS.includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status !== "CONFIRMED" && invoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Payments can only be recorded for confirmed or draft invoices" },
        { status: 400 }
      );
    }

    await prisma.payment.create({
      data: {
        method: method as "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER" | "UPI" | "CASH" | "OTHER",
        amount,
        paymentDate,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        userId: auth.userId,
      },
    });

    const updated = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: { user: { select: { id: true, email: true } } },
        },
        lines: { include: { product: true, tax: true } },
        payments: true,
      },
    });

    return NextResponse.json(
      { message: "Payment recorded", invoice: updated },
      { status: 201 }
    );
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
