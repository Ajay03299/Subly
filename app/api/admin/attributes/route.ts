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
  if (!user || user.role !== "ADMIN") {
    return { error: "Insufficient permissions", status: 403 };
  }

  return { userId: user.id, role: user.role };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: [{ name: "asc" }, { value: "asc" }],
    });

    return NextResponse.json({ attributes }, { status: 200 });
  } catch (error) {
    console.error("Get attributes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, value, extraPrice } = body;

    if (!name || !value) {
      return NextResponse.json({ error: "Name and Value are required" }, { status: 400 });
    }

    const attribute = await prisma.attribute.create({
      data: {
        name,
        value,
        extraPrice: extraPrice || 0,
      },
    });

    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error) {
    console.error("Create attribute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
