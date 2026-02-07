import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */
async function getAuthUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: generate next subscription number                          */
/* ------------------------------------------------------------------ */
async function generateSubscriptionNo(): Promise<string> {
  const last = await prisma.subscription.findFirst({
    orderBy: { createdAt: "desc" },
    select: { subscriptionNo: true },
  });

  let nextNum = 1;
  if (last?.subscriptionNo) {
    const match = last.subscriptionNo.match(/SO(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `SO${String(nextNum).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Helper: find or create a product in the DB from cart data          */
/* ------------------------------------------------------------------ */
async function findOrCreateProduct(item: {
  productName: string;
  productType: string;
  salesPrice: number;
  costPrice: number;
}): Promise<string> {
  // Try to find by name first
  const existing = await prisma.product.findFirst({
    where: { name: item.productName },
  });

  if (existing) return existing.id;

  // Create the product if it doesn't exist
  const product = await prisma.product.create({
    data: {
      name: item.productName,
      type: (item.productType as "SERVICE" | "CONSUMABLE" | "STORABLE") || "SERVICE",
      salesPrice: item.salesPrice,
      costPrice: item.costPrice,
    },
  });

  return product.id;
}

/* ------------------------------------------------------------------ */
/*  POST /api/portal/checkout                                          */
/*  Creates a real subscription from the cart items                     */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      items, // Array of cart items
      subtotal,
      taxAmount,
      total,
      discountApplied,
      discountAmount,
      paymentTerms,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const subscriptionNo = await generateSubscriptionNo();

    // Build subscription lines from cart items
    const lineData = [];
    for (const item of items) {
      const {
        productName,
        productType,
        salesPrice,
        costPrice,
        unitPrice,
        quantity,
        taxRate,
        plan,
        variantInfo,
      } = item;

      // Find or create the product in the DB
      const productId = await findOrCreateProduct({
        productName,
        productType: productType || "SERVICE",
        salesPrice: salesPrice || unitPrice,
        costPrice: costPrice || 0,
      });

      const qty = quantity || 1;
      const price = unitPrice || salesPrice || 0;
      const tax = taxRate || 0;
      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * (tax / 100);
      const lineTotal = lineSubtotal + lineTax;

      lineData.push({
        productId,
        quantity: qty,
        unitPrice: price,
        taxRate: tax,
        amount: lineTotal,
      });
    }

    // Compute totals from lines if not provided
    const computedSubtotal =
      subtotal ??
      lineData.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);
    const computedTax =
      taxAmount ??
      lineData.reduce(
        (s, l) => s + l.quantity * Number(l.unitPrice) * (Number(l.taxRate) / 100),
        0
      );
    const computedTotal = total ?? computedSubtotal + computedTax;

    // Create the subscription with status CONFIRMED (order placed)
    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNo,
        userId,
        paymentTerms: paymentTerms || "IMMEDIATE",
        status: "CONFIRMED",
        subtotal: computedSubtotal,
        taxAmount: computedTax,
        totalAmount: computedTotal,
        lines: {
          create: lineData,
        },
      },
      include: {
        user: { select: { id: true, email: true } },
        recurringPlan: true,
        lines: { include: { product: true } },
        invoices: true,
      },
    });

    return NextResponse.json(
      {
        message: "Order placed successfully",
        subscription,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process checkout. Please try again." },
      { status: 500 }
    );
  }
}
