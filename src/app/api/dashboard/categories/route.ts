import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id, 10);
    try {
            const categories = await prisma.categoryList.findMany({
                where: {
                    user_id: userId
                },
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
        console.error('GET /api/dashboard/categories error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
