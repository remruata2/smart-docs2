import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma';

type DistrictStats = {
  district: string | null;
  count: number;
  latestDate: Date | null;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();
  const yearStr = searchParams.get('year');
  const year = yearStr ? parseInt(yearStr, 10) : undefined;

  // Build where clause
  const where: any = {};
  if (category) where.category = category;
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
    // Build WHERE clause as a string
    const whereClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (q) {
      const searchTerm = `%${q}%`;
      whereClause.push(`(title ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`);
      params.push(searchTerm);
      paramIndex++;
    }

    if (year) {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = new Date(Date.UTC(year + 1, 0, 1));
      whereClause.push(`entry_date_real >= $${paramIndex++} AND entry_date_real < $${paramIndex++}`);
      params.push(startDate, endDate);
    }

    const whereString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get district statistics
    const query = `
      SELECT 
        district,
        COUNT(*) as count,
        MAX(entry_date_real) as "latestDate"
      FROM file_list
      ${whereString}
      GROUP BY district
      ORDER BY count DESC, district ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    const districtStats = await prisma.$queryRawUnsafe<DistrictStats[]>(
      query,
      ...params,
      pageSize,
      (page - 1) * pageSize
    );

    // First get all distinct districts that match the filters
    const distinctDistricts = await prisma.$queryRawUnsafe<Array<{ district: string | null }>>(
      `SELECT DISTINCT district FROM file_list ${whereString}`,
      ...params
    );
    
    const total = distinctDistricts.length;

    // Get file details for each district
    const districtGroups = await Promise.all(
      districtStats.map(async (stat) => {
        const files = await prisma.fileList.findMany({
          where: {
            ...where,
            district: stat.district,
          },
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
          take: 5, // Show top 5 files per district
        });

        return {
          district: stat.district,
          count: Number(stat.count),
          latestDate: stat.latestDate?.toISOString() || null,
          files: files.map(file => ({
            ...file,
            entry_date_real: file.entry_date_real?.toISOString() || null,
            created_at: file.created_at?.toISOString() || null,
          })),
        };
      })
    );

    return NextResponse.json({ 
      items: districtGroups, 
      total, 
      page, 
      pageSize,
    });
  } catch (error) {
    console.error('GET /api/admin/files/district-stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch district statistics' }, 
      { status: 500 }
    );
  }
}
