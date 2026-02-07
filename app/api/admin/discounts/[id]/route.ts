import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

async function verifyAdmin(request: NextRequest) {
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
  if (!user || user.role !== "ADMIN") {
    return { error: "Only admins can manage discounts", status: 403 };
  }

  return { userId: user.id };
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/discounts/[id]                                     */
/* ------------------------------------------------------------------ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const discount = await prisma.discount.findUnique({ where: { id } });

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    return NextResponse.json({ discount }, { status: 200 });
  } catch (error) {
    console.error("Get discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/discounts/[id]                                     */
/* ------------------------------------------------------------------ */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const data: {
      name?: string;
      code?: string;
      type?: "FIXED" | "PERCENTAGE";
      value?: number;
      minimumPurchase?: number;
      minimumQuantity?: number;
      startDate?: Date;
      endDate?: Date | null;
      limitUsage?: number | null;
    } = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = normalizeCode(String(body.code));
    if (body.type !== undefined) data.type = body.type;
    if (body.value !== undefined) data.value = Number(body.value);
    if (body.minimumPurchase !== undefined) data.minimumPurchase = Number(body.minimumPurchase);
    if (body.minimumQuantity !== undefined) data.minimumQuantity = Number(body.minimumQuantity);
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.limitUsage !== undefined) data.limitUsage = body.limitUsage ? Number(body.limitUsage) : null;

    const discount = await prisma.discount.update({
      where: { id },
      data,
    });

    return NextResponse.json({ discount }, { status: 200 });
  } catch (error) {
    console.error("Update discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/discounts/[id]                                  */
/* ------------------------------------------------------------------ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    await prisma.discount.delete({ where: { id } });

    return NextResponse.json({ message: "Discount deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
