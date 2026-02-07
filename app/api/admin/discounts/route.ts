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

async function generateUniqueCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10) || "DISCOUNT";

  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const code = `${base}${suffix}`;
    const existing = await prisma.discount.findUnique({ where: { code } });
    if (!existing) return code;
  }

  return `${base}${Date.now().toString(36).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/discounts                                          */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ discounts }, { status: 200 });
  } catch (error) {
    console.error("Get discounts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/admin/discounts                                         */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const type = body.type as "FIXED" | "PERCENTAGE";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!type || !["FIXED", "PERCENTAGE"].includes(type)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
    }

    const value = Number(body.value);
    if (Number.isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "Value must be greater than 0" }, { status: 400 });
    }

    const startDate = body.startDate ? new Date(body.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    }

    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "End date is invalid" }, { status: 400 });
    }

    const code = body.code
      ? normalizeCode(String(body.code))
      : await generateUniqueCode(name);

    const discount = await prisma.discount.create({
      data: {
        name,
        code,
        type,
        value,
        minimumPurchase: Number(body.minimumPurchase || 0),
        minimumQuantity: Number(body.minimumQuantity || 0),
        startDate,
        endDate,
        limitUsage: body.limitUsage ? Number(body.limitUsage) : null,
      },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    console.error("Create discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
