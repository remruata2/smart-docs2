import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params

        const topic = await prisma.forumTopic.findUnique({
            where: { slug },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
                user: {
                    select: { id: true, name: true, image: true, username: true },
                },
                _count: {
                    select: { posts: true, likes: true },
                },
            },
        })

        if (!topic) {
            return new NextResponse('Topic not found', { status: 404 })
        }

        // Increment view count in the background
        await prisma.forumTopic.update({
            where: { id: topic.id },
            data: { views: { increment: 1 } },
        })

        return NextResponse.json({
            success: true,
            topic: {
                ...topic,
                author: {
                    id: topic.user.id,
                    name: topic.user.name || topic.user.username,
                    avatarUrl: topic.user.image,
                },
            },
        })
    } catch (error) {
        console.error('[FORUM_TOPIC_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
