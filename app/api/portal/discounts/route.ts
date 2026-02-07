import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  POST /api/portal/discounts — validate discount code                */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || "").trim();

    if (!code) {
      return NextResponse.json({ error: "Discount code is required" }, { status: 400 });
    }

    const discount = await prisma.discount.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
    });

    if (!discount) {
      return NextResponse.json({ error: "Invalid discount code" }, { status: 404 });
    }

    const now = new Date();
    if (discount.startDate > now) {
      return NextResponse.json({ error: "Discount not active yet" }, { status: 400 });
    }

    if (discount.endDate && discount.endDate < now) {
      return NextResponse.json({ error: "Discount has expired" }, { status: 400 });
    }

    const subtotal = Number(body.subtotal || 0);
    const quantity = Number(body.quantity || 0);

    if (subtotal < Number(discount.minimumPurchase)) {
      return NextResponse.json(
        { error: "Minimum purchase not met" },
        { status: 400 }
      );
    }

    if (quantity < discount.minimumQuantity) {
      return NextResponse.json(
        { error: "Minimum quantity not met" },
        { status: 400 }
      );
    }

    const value = Number(discount.value);
    const discountAmount = discount.type === "PERCENTAGE"
      ? subtotal * (value / 100)
      : value;

    return NextResponse.json(
      {
        valid: true,
        discount: {
          id: discount.id,
          name: discount.name,
          code: discount.code,
          type: discount.type,
          value: discount.value,
          minimumPurchase: discount.minimumPurchase,
          minimumQuantity: discount.minimumQuantity,
          startDate: discount.startDate,
          endDate: discount.endDate,
        },
        discountAmount: Math.min(discountAmount, subtotal),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Validate discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
