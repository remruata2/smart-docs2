import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user.role !== UserRole.admin && session.user.role !== UserRole.institution)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await prisma.categoryList.findMany({
      select: {
        category: true
      },
      orderBy: {
        category: 'asc'
      }
    });

    return NextResponse.json({
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}