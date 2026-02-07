import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  GET /api/portal/tax/default                                       */
/*  Get the default tax rate for display in checkout                   */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const defaultTax = await prisma.tax.findFirst({
      where: { isDefault: true },
      select: { id: true, name: true, rate: true },
    });

    // Fallback to 15% if no default tax is set
    const rate = defaultTax ? Number(defaultTax.rate) / 100 : 0.15;

    return NextResponse.json(
      {
        tax: defaultTax || { name: "Standard Tax", rate: 15 },
        rate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get default tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
