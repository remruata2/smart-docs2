import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const categories = await prisma.forumCategory.findMany({
            where: {
                is_active: true,
            },
            orderBy: {
                order: 'asc',
            },
            include: {
                _count: {
                    select: { topics: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            categories: categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                topicCount: cat._count.topics,
            })),
        })
    } catch (error) {
        console.error('[FORUM_CATEGORIES_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
