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
/*  GET /api/admin/taxes                                              */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const taxes = await prisma.tax.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ taxes }, { status: 200 });
  } catch (error) {
    console.error("Get taxes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/admin/taxes — admin only                                */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, rate, isDefault } = await request.json();

    if (!name || rate === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, rate" },
        { status: 400 }
      );
    }

    // If setting as default, unset others
    if (isDefault === true) {
      await prisma.tax.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const tax = await prisma.tax.create({
      data: {
        name: String(name).trim(),
        rate: Number(rate),
        isDefault: Boolean(isDefault) || false,
      },
    });

    return NextResponse.json({ tax }, { status: 201 });
  } catch (error) {
    console.error("Create tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
