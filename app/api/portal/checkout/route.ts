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
/*  Helper: validate discount code                                    */
/* ------------------------------------------------------------------ */
async function validateDiscount(
  code: string,
  subtotal: number,
  quantity: number
) {
  const discount = await prisma.discount.findFirst({
    where: {
      code: {
        equals: code,
        mode: "insensitive",
      },
    },
  });

  if (!discount) {
    return { error: "Invalid discount code" };
  }

  const now = new Date();
  if (discount.startDate > now) {
    return { error: "Discount not active yet" };
  }

  if (discount.endDate && discount.endDate < now) {
    return { error: "Discount has expired" };
  }

  if (subtotal < Number(discount.minimumPurchase)) {
    return { error: "Minimum purchase not met" };
  }

  if (quantity < discount.minimumQuantity) {
    return { error: "Minimum quantity not met" };
  }

  const value = Number(discount.value);
  const discountAmount = discount.type === "PERCENTAGE"
    ? subtotal * (value / 100)
    : value;

  return {
    discount,
    discountAmount: Math.min(discountAmount, subtotal),
  };
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
      discountCode,
      paymentTerms,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const subscriptionNo = await generateSubscriptionNo();

    const defaultTax = await prisma.tax.findFirst({
      where: { isDefault: true },
      select: { id: true, name: true, rate: true },
    });

    // Build subscription lines from cart items
    const lineData = [];
    for (const item of items) {
      const {
        productId: clientProductId,
        productName,
        productType,
        salesPrice,
        costPrice,
        unitPrice,
        quantity,
        plan,
        variantInfo,
      } = item;

      // Fetch product from DB to get its tax
      let productId = clientProductId;
      let product = null;
      
      if (productId) {
        product = await prisma.product.findUnique({
          where: { id: productId },
          include: { tax: true },
        });
      }
      
      if (!product) {
        // Fallback: find or create the product in the DB
        productId = await findOrCreateProduct({
          productName,
          productType: productType || "SERVICE",
          salesPrice: salesPrice || unitPrice,
          costPrice: costPrice || 0,
        });
        
        product = await prisma.product.findUnique({
          where: { id: productId },
          include: { tax: true },
        });
      }

      const qty = quantity || 1;
      const price = unitPrice || salesPrice || 0;
      const effectiveTax = product?.tax || defaultTax || null;
      const taxRate = effectiveTax ? Number(effectiveTax.rate) : 0;
      const taxId = product?.taxId || effectiveTax?.id || null;
      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      lineData.push({
        productId,
        taxId,
        quantity: qty,
        unitPrice: price,
        taxRate,
        amount: lineTotal,
      });
    }

    // Compute totals from lines if not provided
    const computedSubtotal =
      subtotal ??
      lineData.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);
    const baseTax =
      taxAmount ??
      lineData.reduce(
        (s, l) => s + l.quantity * Number(l.unitPrice) * (Number(l.taxRate) / 100),
        0
      );

    let appliedDiscountAmount = discountApplied ? Number(discountAmount || 0) : 0;
    if (discountCode) {
      const totalQty = lineData.reduce((s, l) => s + l.quantity, 0);
      const validation = await validateDiscount(
        String(discountCode).trim(),
        computedSubtotal,
        totalQty
      );

      if ("error" in validation) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      appliedDiscountAmount = validation.discountAmount;
    }

    const afterDiscount = Math.max(computedSubtotal - appliedDiscountAmount, 0);
    const taxRatio = computedSubtotal > 0 ? afterDiscount / computedSubtotal : 1;
    const computedTax = baseTax * taxRatio;
    const computedTotal = afterDiscount + computedTax;

    // Create the subscription with status ACTIVE (order placed & active)
    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNo,
        userId,
        paymentTerms: paymentTerms || "IMMEDIATE",
        discountCode: discountCode || null,
        discountAmount: appliedDiscountAmount,
        status: "ACTIVE",
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

    // ── Create Invoice (PAID) ────────────────────────────
    const invoiceNo = `INV/${String(Date.now()).slice(-6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        subscriptionId: subscription.id,
        status: "PAID",
        issueDate: new Date(),
        dueDate: new Date(), // paid immediately
        subtotal: computedSubtotal,
        taxAmount: computedTax,
        totalAmount: computedTotal,
        lines: {
          create: lineData.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxAmount: l.quantity * Number(l.unitPrice) * (Number(l.taxRate) / 100),
            amount: l.amount,
          })),
        },
      },
    });

    // ── Record Payment ───────────────────────────────────
    await prisma.payment.create({
      data: {
        method: "CREDIT_CARD", // default for portal checkout
        amount: computedTotal,
        paymentDate: new Date(),
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        userId,
      },
    });

    // Re-fetch subscription with invoice and payment data included
    const fullSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        user: { select: { id: true, email: true } },
        recurringPlan: true,
        lines: { include: { product: true } },
        invoices: { include: { lines: true, payments: true } },
        payments: true,
      },
    });

    // Optionally create an initial invoice for this subscription
    if (subscription) {
      await prisma.invoice.create({
        data: {
          invoiceNo: `INV-${subscription.subscriptionNo}`,
          subscriptionId: subscription.id,
          status: "DRAFT",
          issueDate: new Date(),
          subtotal: computedSubtotal,
          taxAmount: computedTax,
          totalAmount: computedTotal,
          lines: {
            create: lineData.map((line) => ({
              productId: line.productId,
                            taxId: line.taxId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxAmount: line.quantity * line.unitPrice * (line.taxRate / 100),
              amount: line.amount,
            })),
          },
        },
      });
    }

    return NextResponse.json(
      {
        message: "Order placed successfully",
        subscription: fullSubscription,
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
