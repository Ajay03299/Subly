import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';

async function authorizeAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.substring(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.role !== 'ADMIN') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user };
}

// GET all quotation templates
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const templates = await prisma.quotationTemplate.findMany({
      include: {
        recurringPlan: true,
        lines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                salesPrice: true,
                costPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error('Get quotation templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new quotation template
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, validityDays, recurringPlanId, lines } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name,
        validityDays: validityDays || 30,
        recurringPlanId: recurringPlanId || null,
        lines: {
          create: lines && Array.isArray(lines)
            ? lines.map((line: any) => ({
                productId: line.productId,
                quantity: line.quantity || 1,
              }))
            : [],
        },
      },
      include: {
        recurringPlan: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Quotation template created successfully',
        template,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create quotation template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
