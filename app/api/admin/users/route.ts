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
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  return { userId: user.id, role: user.role };
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/users — list users (for customer dropdown)          */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const searchParam = request.nextUrl.searchParams.get("search");

    const users = await prisma.user.findMany({
      where: searchParam
        ? {
            email: { contains: searchParam, mode: "insensitive" },
          }
        : undefined,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { email: "asc" },
      take: 50,
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
