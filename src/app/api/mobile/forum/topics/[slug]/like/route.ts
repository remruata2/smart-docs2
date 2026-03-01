import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const user = await getMobileUser(req as any)
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const userId = Number(user.id)

        const body = await req.json()
        // post_id is optional. If provided, it likes a reply. Otherwise, it likes the main topic.
        const { postId, isUpvote = true } = body

        const topic = await prisma.forumTopic.findUnique({
            where: { slug: slug },
            select: { id: true },
        })

        if (!topic) {
            return new NextResponse('Topic not found', { status: 404 })
        }

        if (postId) {
            // Like a post (reply)
            const existingLike = await prisma.forumLike.findUnique({
                where: {
                    user_id_post_id: {
                        user_id: userId,
                        post_id: postId,
                    },
                },
            })

            if (existingLike) {
                // Toggle/Remove like
                await prisma.forumLike.delete({ where: { id: existingLike.id } })
                return NextResponse.json({ success: true, action: 'removed' })
            } else {
                await prisma.forumLike.create({
                    data: {
                        user_id: userId,
                        post_id: postId,
                        is_upvote: isUpvote,
                    },
                })
                return NextResponse.json({ success: true, action: 'added' })
            }
        } else {
            // Like a topic
            const existingLike = await prisma.forumLike.findUnique({
                where: {
                    user_id_topic_id: {
                        user_id: userId,
                        topic_id: topic.id,
                    },
                },
            })

            if (existingLike) {
                // Toggle/Remove like
                await prisma.forumLike.delete({ where: { id: existingLike.id } })
                return NextResponse.json({ success: true, action: 'removed' })
            } else {
                await prisma.forumLike.create({
                    data: {
                        user_id: userId,
                        topic_id: topic.id,
                        is_upvote: isUpvote,
                    },
                })
                return NextResponse.json({ success: true, action: 'added' })
            }
        }
    } catch (error) {
        console.error('[FORUM_LIKE_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
