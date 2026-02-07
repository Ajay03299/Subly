import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/jwt';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const token = authHeader.substring(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Only admins can manage product tags' }, { status: 403 }) };
  }

  return { user };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const tag = await prisma.productTag.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ tag }, { status: 200 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
    }
    console.error('Update product tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    await prisma.productTag.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tag deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete product tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
