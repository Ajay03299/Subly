import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Create or find a test user
    const user = await prisma.user.findFirst({ where: { role: "USER" } });
    if (!user) {
      return Response.json(
        { error: "No USER role found in database. Create one first." },
        { status: 400 }
      );
    }

    // Find or create a monthly recurring plan
    let plan = await prisma.recurringPlan.findFirst({
      where: { billingPeriod: "MONTHLY" },
    });

    if (!plan) {
      plan = await prisma.recurringPlan.create({
        data: {
          billingPeriod: "MONTHLY",
          autoClose: false,
          closeable: true,
          renewable: true,
          pausable: false,
        },
      });
    }

    // Find a product
    const product = await prisma.product.findFirst();
    if (!product) {
      return Response.json(
        { error: "No products found. Create a product first." },
        { status: 400 }
      );
    }

    // Create recurring plan info (link product to plan with pricing)
    let planInfo = await prisma.recurringPlanInfo.findFirst({
      where: {
        recurringPlanId: plan.id,
        productId: product.id,
      },
    });

    if (!planInfo) {
      planInfo = await prisma.recurringPlanInfo.create({
        data: {
          recurringPlanId: plan.id,
          productId: product.id,
          price: 99.99,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
        },
      });
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNo: `TEST-${Date.now()}`,
        userId: user.id,
        recurringPlanId: plan.id,
        status: "ACTIVE",
        totalAmount: 100,
        endDate: new Date("2026-12-31"),
        lines: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 99.99,
            taxRate: 0,
            amount: 99.99,
          },
        },
      },
    });

    // Create an invoice from last month so it's due for renewal
    const lastMonthDate = new Date("2026-01-08");
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-TEST-${Date.now()}`,
        subscriptionId: subscription.id,
        status: "PAID",
        issueDate: lastMonthDate,
        dueDate: lastMonthDate,
        subtotal: 99.99,
        taxAmount: 0,
        totalAmount: 99.99,
        lines: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 99.99,
            taxAmount: 0,
            amount: 99.99,
          },
        },
      },
    });

    // Create a payment for that invoice
    await prisma.payment.create({
      data: {
        method: "CREDIT_CARD",
        amount: 99.99,
        paymentDate: lastMonthDate,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        userId: user.id,
      },
    });

    return Response.json({
      success: true,
      message: "Test subscription created and ready for renewal",
      subscription: {
        id: subscription.id,
        subscriptionNo: subscription.subscriptionNo,
        userId: user.id,
        recurringPlanId: plan.id,
        status: subscription.status,
        createdAt: subscription.createdAt.toISOString(),
        lastInvoice: invoice.issueDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[test] Error creating test subscription:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
