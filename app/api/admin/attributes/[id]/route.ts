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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await prisma.attribute.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete attribute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
