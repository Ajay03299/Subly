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

/* ------------------------------------------------------------------ */
/*  GET /api/admin/invoices/[invoiceId]                                */
/* ------------------------------------------------------------------ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: { user: { select: { id: true, email: true } } },
        },
        lines: { include: { product: true, tax: true } },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/invoices/[invoiceId] — confirm, cancel, revert    */
/* ------------------------------------------------------------------ */
export async function PATCH(
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
    const action = body.action as string | undefined;

    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (action === "confirm") {
      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft invoices can be confirmed" },
          { status: 400 }
        );
      }
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "CONFIRMED" },
      });
      const invoice = await prisma.invoice.findUnique({
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
        { message: "Invoice confirmed", invoice },
        { status: 200 }
      );
    }

    if (action === "cancel") {
      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft invoices can be cancelled" },
          { status: 400 }
        );
      }
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      });
      const invoice = await prisma.invoice.findUnique({
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
        { message: "Invoice cancelled", invoice },
        { status: 200 }
      );
    }

    if (action === "revert_to_draft") {
      if (existing.status !== "CANCELLED") {
        return NextResponse.json(
          { error: "Only cancelled invoices can be reverted to draft" },
          { status: 400 }
        );
      }
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "DRAFT" },
      });
      const invoice = await prisma.invoice.findUnique({
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
        { message: "Invoice reverted to draft", invoice },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use confirm, cancel, or revert_to_draft" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Patch invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/invoices/[invoiceId] — trash (draft only)        */
/* ------------------------------------------------------------------ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { invoiceId } = await params;

    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.status !== "DRAFT" && existing.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Only draft or cancelled invoices can be deleted" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });
    return NextResponse.json({ message: "Invoice deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
