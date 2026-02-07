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
    return { error: "Only admins can manage variants", status: 403 };
  }

  return { userId: user.id };
}

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/variants/[id]                                      */
/* ------------------------------------------------------------------ */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.variant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const { attribute, value, extraPrice } = await request.json();

    const variant = await prisma.variant.update({
      where: { id },
      data: {
        ...(attribute !== undefined && { attribute }),
        ...(value !== undefined && { value }),
        ...(extraPrice !== undefined && {
          extraPrice: parseFloat(extraPrice),
        }),
      },
    });

    return NextResponse.json(
      { message: "Variant updated", variant },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update variant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/variants/[id]                                    */
/* ------------------------------------------------------------------ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.variant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    await prisma.variant.delete({ where: { id } });

    return NextResponse.json(
      { message: "Variant deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete variant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
