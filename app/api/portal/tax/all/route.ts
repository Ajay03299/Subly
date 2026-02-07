import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/portal/tax/all
 * Returns all configured taxes (for display purposes)
 */
export async function GET(request: NextRequest) {
  try {
    const taxes = await prisma.tax.findMany({
      select: {
        id: true,
        name: true,
        rate: true,
      },
      orderBy: { rate: "asc" },
    });

    return NextResponse.json({ taxes }, { status: 200 });
  } catch (error) {
    console.error("Error fetching taxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch taxes" },
      { status: 500 }
    );
  }
}
