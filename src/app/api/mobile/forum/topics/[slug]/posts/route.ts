import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit
        const { slug } = await params

        const topic = await prisma.forumTopic.findUnique({
            where: { slug: slug },
            select: { id: true },
        })

        if (!topic) {
            return new NextResponse('Topic not found', { status: 404 })
        }

        const [posts, total] = await Promise.all([
            prisma.forumPost.findMany({
                where: { topic_id: topic.id },
                include: {
                    user: {
                        select: { id: true, name: true, username: true, image: true },
                    },
                    _count: {
                        select: { likes: true },
                    },
                },
                orderBy: { created_at: 'asc' },
                skip,
                take: limit,
            }),
            prisma.forumPost.count({ where: { topic_id: topic.id } }),
        ])

        return NextResponse.json({
            success: true,
            posts: posts.map((p) => ({
                id: p.id,
                content: p.content,
                isAcceptedAnswer: p.is_accepted_answer,
                createdAt: p.created_at,
                likesCount: p._count.likes,
                author: {
                    id: p.user.id,
                    name: p.user.name || p.user.username,
                    avatarUrl: p.user.image,
                },
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('[FORUM_POSTS_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const user = await getMobileUser(req as any)
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const userId = Number(user.id)

        const body = await req.json()
        const { content } = body
        const { slug } = await params

        if (!content) {
            return new NextResponse('Content is required', { status: 400 })
        }

        const topic = await prisma.forumTopic.findUnique({
            where: { slug: slug },
            select: { id: true, is_locked: true },
        })

        if (!topic) {
            return new NextResponse('Topic not found', { status: 404 })
        }

        if (topic.is_locked) {
            return new NextResponse('Topic is locked', { status: 403 })
        }

        const post = await prisma.forumPost.create({
            data: {
                topic_id: topic.id,
                user_id: userId,
                content,
            },
            include: {
                user: { select: { id: true, name: true, username: true, image: true } },
            },
        })

        // Update topic updated_at
        await prisma.forumTopic.update({
            where: { id: topic.id },
            data: { updated_at: new Date() },
        })

        return NextResponse.json({
            success: true,
            post: {
                id: post.id,
                content: post.content,
                createdAt: post.created_at,
                author: {
                    id: post.user.id,
                    name: post.user.name || post.user.username,
                    avatarUrl: post.user.image,
                },
            },
        })
    } catch (error) {
        console.error('[FORUM_POSTS_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
