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
    return { error: "Only admins can manage taxes", status: 403 };
  }

  return { userId: user.id };
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/taxes/[id]                                         */
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
    const tax = await prisma.tax.findUnique({ where: { id } });

    if (!tax) {
      return NextResponse.json({ error: "Tax not found" }, { status: 404 });
    }

    return NextResponse.json({ tax }, { status: 200 });
  } catch (error) {
    console.error("Get tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/taxes/[id]                                         */
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
      rate?: number;
      isDefault?: boolean;
    } = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.rate !== undefined) data.rate = Number(body.rate);
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);

    // If setting this as default, unset others
    if (data.isDefault === true) {
      await prisma.tax.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const tax = await prisma.tax.update({
      where: { id },
      data,
    });

    return NextResponse.json({ tax }, { status: 200 });
  } catch (error) {
    console.error("Update tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/taxes/[id]                                      */
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

    await prisma.tax.delete({ where: { id } });

    return NextResponse.json({ message: "Tax deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
