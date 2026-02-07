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
        { error: 'Only admins can create variants' },
        { status: 403 }
      );
    }

    const { productId, attribute, value, extraPrice } = await request.json();

    // Validate required fields
    if (!productId || !attribute || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, attribute, value' },
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

    // Create variant
    const variant = await prisma.variant.create({
      data: {
        productId,
        attribute,
        value,
        extraPrice: extraPrice ? parseFloat(extraPrice) : 0,
      },
    });

    return NextResponse.json(
      {
        message: 'Variant created successfully',
        variant,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create variant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
