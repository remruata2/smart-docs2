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

  try {
    // Get distinct districts from file_list table, excluding null values
    const districts = await prisma.$queryRaw<Array<{ district: string }>>`
      SELECT DISTINCT district
      FROM file_list
      WHERE district IS NOT NULL AND district != ''
      ORDER BY district ASC
    `;

    // Transform to simple array of district names
    const districtList = districts.map(d => d.district);

    return NextResponse.json({
      districts: districtList
    });
  } catch (error) {
    console.error('GET /api/admin/districts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch districts' },
      { status: 500 }
    );
  }
}