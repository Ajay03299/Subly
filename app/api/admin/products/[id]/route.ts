import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

/* ------------------------------------------------------------------ */
/*  Helper – verify admin                                             */
/* ------------------------------------------------------------------ */
async function verifyAdmin(request: NextRequest) {
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
    return { error: "Only admins can manage products", status: 403 };
  }

  return { userId: user.id };
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/products/[id]                                      */
/* ------------------------------------------------------------------ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        recurringPlanInfos: {
          include: {
            recurringPlan: true,
          },
        },
        tag: true,
        tax: true,
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/products/[id]                                      */
/* ------------------------------------------------------------------ */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const requestBody = await request.json();
    
    // Handle both nested and flat data structures
    const productData = requestBody.product || requestBody;
    const variants = requestBody.variants || [];
    const recurringPlanInfos = requestBody.recurringPlanInfos || [];

    const {
      name,
      type,
      salesPrice,
      costPrice,
      description,
      tagId,
      taxId,
      images,
    } = productData;

    // Validate required fields
    if (!name || !type || salesPrice === undefined || costPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, salesPrice, costPrice" },
        { status: 400 }
      );
    }

    // Validate prices
    const sales = parseFloat(salesPrice);
    const cost = parseFloat(costPrice);

    if (isNaN(sales) || isNaN(cost)) {
      return NextResponse.json(
        { error: "Sales price and cost price must be valid numbers" },
        { status: 400 }
      );
    }

    // Delete old relations and create new ones
    await prisma.recurringPlanInfo.deleteMany({ where: { productId: id } });
    await prisma.variant.deleteMany({ where: { productId: id } });
    await prisma.productImage.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        type,
        salesPrice: sales,
        costPrice: cost,
        description: description || null,
        tagId: tagId || null,
        taxId: taxId || null,
        images: {
          create: images && Array.isArray(images) ? images.map((img: any) => ({
            url: img.url,
            alt: img.alt || null,
          })) : [],
        },
        variants: {
          create: variants && Array.isArray(variants) ? variants.map((v: any) => ({
            attribute: v.attribute,
            value: v.value,
            extraPrice: parseFloat(v.extraPrice || 0),
          })) : [],
        },
        recurringPlanInfos: {
          create: recurringPlanInfos && Array.isArray(recurringPlanInfos) ? recurringPlanInfos.map((info: any) => ({
            recurringPlanId: info.recurringPlanId,
            price: parseFloat(info.price),
            startDate: new Date(info.startDate),
            endDate: info.endDate ? new Date(info.endDate) : null,
          })) : [],
        },
      },
      include: {
        variants: true,
        recurringPlanInfos: {
          include: {
            recurringPlan: true,
          },
        },
        tag: true,
        tax: true,
        images: true,
      },
    });

    return NextResponse.json(
      { message: "Product updated", product },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/products/[id]                                    */
/* ------------------------------------------------------------------ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete variants first (cascade should handle it, but be explicit)
    await prisma.variant.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return NextResponse.json(
      { message: "Product deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
