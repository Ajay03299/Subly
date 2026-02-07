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
        { error: 'Only admins can create recurring plans' },
        { status: 403 }
      );
    }

    const {
      productId,
      price,
      billingPeriod,
      autoClose,
      closeable,
      renewable,
      pausable,
      startDate,
      endDate,
    } = await request.json();

    // Validate required fields
    if (!productId || price === undefined || !billingPeriod || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, price, billingPeriod, startDate' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate price
    const planPrice = parseFloat(price);
    if (isNaN(planPrice)) {
      return NextResponse.json(
        { error: 'Price must be a valid number' },
        { status: 400 }
      );
    }

    // Create recurring plan
    const recurringPlan = await prisma.recurringPlan.create({
      data: {
        productId,
        price: planPrice,
        billingPeriod,
        autoClose: autoClose || false,
        closeable: closeable !== false, // default true
        renewable: renewable !== false, // default true
        pausable: pausable || false,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(
      {
        message: 'Recurring plan created successfully',
        recurringPlan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create recurring plan error:', error);
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

    // Fetch all recurring plans with relations
    const plans = await prisma.recurringPlan.findMany({
      include: {
        product: { select: { id: true, name: true, type: true, salesPrice: true } },
        subscriptions: {
          select: { id: true, subscriptionNo: true, status: true, totalAmount: true },
          take: 50,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        plans,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get recurring plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
