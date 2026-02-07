import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch all products with images (public endpoint - no auth required)
    const products = await prisma.product.findMany({
      include: {
        images: true,
        tax: true,
        tag: true,
        recurringPlans: {
          select: {
            id: true,
            name: true,
            price: true,
            billingPeriod: true,
          },
        },
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
