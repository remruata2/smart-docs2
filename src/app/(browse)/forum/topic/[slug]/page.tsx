import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Heart, Ban, ArrowLeft, Pin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { authOptions } from '@/lib/auth-options'
import { ReplyForm } from './ReplyForm'
import { LikeButton } from './LikeButton'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { AdminTopicControls, AdminPostControls } from './AdminControls'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const topic = await prisma.forumTopic.findUnique({
        where: { slug },
    })
    if (!topic) return { title: 'Not Found' }
    return { title: `${topic.title} | Zirna IO Forum` }
}

async function getTopicAndReplies(slug: string) {
    const topic = await prisma.forumTopic.findUnique({
        where: { slug },
        include: {
            user: {
                select: { id: true, name: true, username: true, image: true },
            },
            category: {
                select: { id: true, name: true, slug: true },
            },
            _count: {
                select: { likes: true },
            },
        }
    })

    if (!topic) return null

    // Increment view count in background
    prisma.forumTopic.update({
        where: { id: topic.id },
        data: { views: { increment: 1 } }
    }).catch(console.error)

    const posts = await prisma.forumPost.findMany({
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
    })

    return { topic, posts }
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const session = await getServerSession(authOptions)
    const data = await getTopicAndReplies(slug)

    if (!data) return notFound()

    const { topic, posts } = data
    const userId = session?.user ? Number((session.user as any).id) : null
    const isAdmin = session?.user?.role === 'admin'

    // Check if user is active/banned
    let isUserActive = true;
    if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } })
        if (user) isUserActive = user.is_active;
    }

    // Get user likes to set initial state for LikeButton
    const userLikes = userId ? await prisma.forumLike.findMany({
        where: {
            user_id: userId,
            topic_id: topic.id
        }
    }) : []
    const hasLikedTopic = userLikes.length > 0

    const userPostLikes = userId ? await prisma.forumLike.findMany({
        where: {
            user_id: userId,
            post_id: { in: posts.map(p => p.id) }
        }
    }) : []
    const likedPostIds = new Set(userPostLikes.map(l => l.post_id))

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4 md:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-muted-foreground mb-6 space-x-2">
                <Link href="/forum" className="hover:underline">Forum</Link>
                <span>/</span>
                <Link href={`/forum/category/${topic.category.slug}`} className="hover:underline">
                    {topic.category.name}
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium truncate max-w-[200px]">{topic.title}</span>
            </div>

            <Button variant="ghost" asChild className="mb-6 -ml-4">
                <Link href={`/forum/category/${topic.category.slug}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to category
                </Link>
            </Button>

            {/* Original Topic Post */}
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    {topic.is_pinned && <Pin className="w-6 h-6 text-orange-500 fill-orange-500/20" />}
                    {topic.title}
                    {topic.is_locked && <Lock className="w-5 h-5 text-muted-foreground ml-2" />}
                </h1>

                <Card className="border shadow-sm">
                    <CardContent className="p-0">
                        {/* Author Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border shadow-sm">
                                    <AvatarImage src={topic.user.image || ''} />
                                    <AvatarFallback>{(topic.user.name || topic.user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold">{topic.user.name || topic.user.username}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Posted {formatDistanceToNow(topic.created_at, { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeSanitize]}
                            >
                                {topic.content}
                            </ReactMarkdown>
                        </div>

                        {/* Footer / Actions */}
                        <div className="flex items-center justify-between p-4 border-t bg-muted/10">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <LikeButton
                                    targetId={topic.id}
                                    targetType="topic"
                                    initialLikes={topic._count.likes}
                                    isActivelyLiked={hasLikedTopic}
                                />
                            </div>
                            {isAdmin && (
                                <AdminTopicControls topicId={topic.id} authorId={topic.user.id} />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Replies Section */}
                {posts.length > 0 && (
                    <div className="space-y-4 pt-6">
                        <h3 className="text-xl font-bold tracking-tight bg-muted/50 p-3 rounded-md mb-6 inline-block">
                            {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
                        </h3>

                        {posts.map((post) => (
                            <Card key={post.id} className="border shadow-none">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between p-3 border-b bg-muted/10">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={post.user.image || ''} />
                                                <AvatarFallback>{(post.user.name || post.user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">{post.user.name || post.user.username}</span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(post.created_at, { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 prose prose-slate dark:prose-invert max-w-none text-sm">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeSanitize]}
                                        >
                                            {post.content}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="flex items-center justify-between p-2 border-t bg-muted/5">
                                        <div className="flex items-center">
                                            <LikeButton
                                                targetId={post.id}
                                                targetType="post"
                                                initialLikes={post._count.likes}
                                                isActivelyLiked={likedPostIds.has(post.id)}
                                            />
                                        </div>
                                        {isAdmin && (
                                            <AdminPostControls postId={post.id} authorId={post.user.id} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Reply Box Logic */}
                {!topic.is_locked ? (
                    session?.user ? (
                        isUserActive ? (
                            <div className="mt-8 pt-8 border-t">
                                <ReplyForm topicId={topic.id} />
                            </div>
                        ) : (
                            <div className="mt-8 pt-8 border-t">
                                <Card className="border border-red-200 bg-red-50 text-red-800 flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <Ban className="w-8 h-8 mx-auto mb-2 text-red-500" />
                                        <h4 className="text-lg font-medium mb-2">Posting Restricted</h4>
                                        <p className="text-sm">You have been restricted from posting in the forum.</p>
                                    </div>
                                </Card>
                            </div>
                        )
                    ) : (
                        <div className="mt-8 pt-8 border-t">
                            <Card className="border-dashed flex items-center justify-center p-8 bg-muted/30">
                                <div className="text-center">
                                    <h4 className="text-lg font-medium mb-2">Join the conversation</h4>
                                    <p className="text-sm text-muted-foreground mb-4">You need to log in to post a reply.</p>
                                    <Button asChild>
                                        <Link href="/login">Log In to Reply</Link>
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="mt-8 pt-8 border-t text-center text-muted-foreground flex items-center justify-center">
                        <Lock className="w-4 h-4 mr-2" />
                        This topic is locked and cannot receive new replies.
                    </div>
                )}
            </div>
        </div>
    )
}
