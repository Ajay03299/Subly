import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  Auth helper — returns the logged-in user's id                      */
/* ------------------------------------------------------------------ */
async function getAuthUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/portal/subscriptions — list current user's subscriptions   */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        recurringPlan: true,
        lines: {
          include: { product: true },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            totalAmount: true,
            issueDate: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions }, { status: 200 });
  } catch (error) {
    console.error("Portal get subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
