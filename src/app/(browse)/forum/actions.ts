'use server'

import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export async function createTopic(data: { title: string; content: string; categoryId: number }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const userId = Number((session.user as any).id)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.is_active) {
        return { success: false, error: 'You are restricted from posting.' }
    }

    try {
        const { title, content, categoryId } = data
        let slug = generateSlug(title)

        let existing = await prisma.forumTopic.findUnique({ where: { slug } })
        if (existing) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`
        }

        const topic = await prisma.forumTopic.create({
            data: {
                title,
                content,
                slug,
                category_id: categoryId,
                user_id: userId,
            }
        })

        return { success: true, topic }
    } catch (error) {
        console.error('Failed to create topic:', error)
        return { success: false, error: 'Failed to create topic due to an internal error.' }
    }
}

export async function createPost(data: { content: string; topicId: string }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const userId = Number((session.user as any).id)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.is_active) {
        return { success: false, error: 'You are restricted from posting.' }
    }

    try {
        const { content, topicId } = data

        const post = await prisma.forumPost.create({
            data: {
                content,
                topic_id: topicId,
                user_id: userId,
            }
        })

        // Update topic updated_at
        await prisma.forumTopic.update({
            where: { id: topicId },
            data: { updated_at: new Date() }
        })

        return { success: true, post }
    } catch (error) {
        console.error('Failed to create post:', error)
        return { success: false, error: 'Failed to create post due to an internal error.' }
    }
}

export async function toggleLike(data: { targetId: string; targetType: 'topic' | 'post'; isUpvote: boolean }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const userId = Number((session.user as any).id)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.is_active) {
        return { success: false, error: 'You are restricted from liking.' }
    }

    const { targetId, targetType, isUpvote } = data

    try {
        if (targetType === 'topic') {
            const existingLike = await prisma.forumLike.findFirst({
                where: { user_id: userId, topic_id: targetId }
            })

            if (existingLike) {
                // If they already liked it and hit like again, they want to unlike
                await prisma.forumLike.delete({ where: { id: existingLike.id } })
            } else {
                await prisma.forumLike.create({
                    data: { user_id: userId, topic_id: targetId, is_upvote: isUpvote }
                })
            }
        } else if (targetType === 'post') {
            const existingLike = await prisma.forumLike.findFirst({
                where: { user_id: userId, post_id: targetId }
            })

            if (existingLike) {
                await prisma.forumLike.delete({ where: { id: existingLike.id } })
            } else {
                await prisma.forumLike.create({
                    data: { user_id: userId, post_id: targetId, is_upvote: isUpvote }
                })
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Failed to toggle like:', error)
        return { success: false, error: 'Internal Server Error' }
    }
}

// ==========================================
// MODERATION ACTIONS (Admin Only)
// ==========================================

export async function deleteTopic(topicId: string) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.forumTopic.delete({ where: { id: topicId } })
        return { success: true }
    } catch (error) {
        console.error('Failed to delete topic:', error)
        return { success: false, error: 'Internal Server Error' }
    }
}

export async function deletePost(postId: string) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.forumPost.delete({ where: { id: postId } })
        return { success: true }
    } catch (error) {
        console.error('Failed to delete post:', error)
        return { success: false, error: 'Internal Server Error' }
    }
}

export async function banUser(userId: number) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { is_active: false }
        })
        return { success: true }
    } catch (error) {
        console.error('Failed to ban user:', error)
        return { success: false, error: 'Internal Server Error' }
    }
}
