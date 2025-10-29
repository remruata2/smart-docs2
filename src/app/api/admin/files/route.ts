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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();
  const district = (searchParams.get('district') || '').trim();
  const yearStr = searchParams.get('year');
  const year = yearStr ? parseInt(yearStr, 10) : undefined;

  const where: any = {};
  if (category) where.category = category;
  if (district) where.district = district;
  if (year && Number.isFinite(year)) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    where.entry_date_real = { gte: start, lt: end };
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { category: { contains: q, mode: 'insensitive' as const } },
    ];
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.fileList.count({ where }),
      prisma.fileList.findMany({
        where,
        orderBy: [
          { entry_date_real: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          category: true,
          title: true,
          district: true,
          entry_date_real: true,
          created_at: true,
          doc1: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rows.map((file) => ({
      ...file,
      district: file.district || null,
      entry_date_real: file.entry_date_real?.toISOString() || null,
      created_at: file.created_at?.toISOString() || null,
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('GET /api/admin/files error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}
