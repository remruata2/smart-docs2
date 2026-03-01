import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const categoryId = searchParams.get('categoryId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit
        const search = searchParams.get('search') || ''

        const whereClause: any = {}
        if (categoryId) {
            whereClause.category_id = parseInt(categoryId)
        }
        if (search) {
            whereClause.title = { contains: search, mode: 'insensitive' }
        }

        const [topics, total] = await Promise.all([
            prisma.forumTopic.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: { id: true, name: true, username: true, image: true },
                    },
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    _count: {
                        select: { posts: true, likes: true },
                    },
                },
                orderBy: [{ is_pinned: 'desc' }, { updated_at: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.forumTopic.count({ where: whereClause }),
        ])

        return NextResponse.json({
            success: true,
            topics: topics.map((t) => ({
                id: t.id,
                title: t.title,
                slug: t.slug,
                category: t.category,
                author: {
                    id: t.user.id,
                    name: t.user.name || t.user.username,
                    avatarUrl: t.user.image,
                },
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                views: t.views,
                repliesCount: t._count.posts,
                likesCount: t._count.likes,
                isPinned: t.is_pinned,
                isLocked: t.is_locked,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('[FORUM_TOPICS_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const user = await getMobileUser(req as any)
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const userId = Number(user.id)

        const body = await req.json()
        const { title, content, categoryId } = body

        if (!title || !content || !categoryId) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // Generate a unique slug safely
        let slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')

        // Add a random suffix to ensure absolute uniqueness
        const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
        slug = `${slug}-${randomSuffix}`

        const topic = await prisma.forumTopic.create({
            data: {
                title,
                slug,
                content,
                category_id: parseInt(categoryId),
                user_id: userId,
                views: 0,
            },
            include: {
                user: { select: { id: true, name: true, username: true, image: true } },
                category: { select: { id: true, name: true, slug: true } },
            },
        })

        return NextResponse.json({
            success: true,
            topic: {
                id: topic.id,
                title: topic.title,
                slug: topic.slug,
            },
        })
    } catch (error) {
        console.error('[FORUM_TOPICS_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
