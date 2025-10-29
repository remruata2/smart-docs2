import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const district = searchParams.get('district');

  try {
    let categoryList: string[];

    if (district) {
      // Get distinct categories from files in the selected district
      const fileCategories = await prisma.fileList.findMany({
        where: {
          district: district
        },
        select: {
          category: true
        },
        distinct: ['category'],
        orderBy: {
          category: 'asc'
        }
      });

      categoryList = fileCategories.map(f => f.category);
    } else {
      // Get all categories from category_list table
      const categories = await prisma.categoryList.findMany({
        select: {
          category: true
        },
        orderBy: {
          category: 'asc'
        }
      });

      categoryList = categories.map(c => c.category);
    }

    return NextResponse.json({
      categories: categoryList
    });
  } catch (error) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}