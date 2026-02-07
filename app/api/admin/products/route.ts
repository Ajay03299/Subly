import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create products' },
        { status: 403 }
      );
    }

    const {
      name,
      type,
      salesPrice,
      costPrice,
      description,
      tagId,
      images,
    } = await request.json();

    // Validate required fields
    if (!name || !type || salesPrice === undefined || costPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, salesPrice, costPrice' },
        { status: 400 }
      );
    }

    // Validate prices
    const sales = parseFloat(salesPrice);
    const cost = parseFloat(costPrice);

    if (isNaN(sales) || isNaN(cost)) {
      return NextResponse.json(
        { error: 'Sales price and cost price must be valid numbers' },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        type,
        salesPrice: sales,
        costPrice: cost,
        description: description || null,
        tag: tagId ? { connect: { id: tagId } } : undefined,
        images: {
          create: images && Array.isArray(images) ? images.map((img: any) => ({
            url: img.url,
            alt: img.alt || null,
          })) : [],
        },
      },
      include: {
        variants: true,
        recurringPlans: true,
        tag: true,
        images: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    try {
      verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch all products
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        recurringPlans: true,
        tag: true,
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
