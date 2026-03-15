import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Heart, Ban, ArrowLeft, Pin, MessageCircle, Share2, MoreHorizontal, Clock, History, ShieldCheck, MoreVertical, ThumbsUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
                select: { 
                    likes: true,
                    posts: true
                },
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
                select: { id: true, name: true, username: true, image: true, role: true },
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
        <div className="container mx-auto max-w-5xl py-12 px-4 md:px-8">
            {/* Navigation & Breadcrumb */}
            <div className="mb-10">
                <Link 
                    href={`/forum/category/${topic.category.slug}`} 
                    className="inline-flex items-center text-sm font-bold text-blue-600/60 hover:text-blue-600 transition-all mb-8 group bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100/50"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to {topic.category.name}
                </Link>

                <div className="flex flex-col gap-6 pb-10 border-b border-blue-100">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest py-1 px-3 shadow-lg shadow-blue-500/20">{topic.category.name}</Badge>
                        {topic.is_pinned && <Badge className="bg-indigo-600 text-white font-black uppercase text-[9px] tracking-widest py-1 px-3 shadow-lg shadow-indigo-500/20"><Pin className="w-3 h-3 mr-1.5" /> Pinned</Badge>}
                        {topic.is_locked && <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black uppercase text-[9px] tracking-widest py-1 px-3"><Lock className="w-3 h-3 mr-1.5" /> Locked</Badge>}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight flex-1">
                            {topic.title}
                        </h1>
                        <div className="flex items-center gap-6 text-slate-400 font-bold shrink-0">
                            <div className="flex flex-col items-center">
                                <span className="text-xl font-black text-slate-900">{topic.views}</span>
                                <span className="text-[10px] uppercase font-black text-blue-600/40 tracking-[0.2em]">Views</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xl font-black text-slate-900">{topic._count.posts}</span>
                                <span className="text-[10px] uppercase font-black text-blue-600/40 tracking-[0.2em]">Replies</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Topic Post */}
            <Card className="mb-12 border-2 border-blue-50 bg-white shadow-2xl shadow-blue-500/5 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-blue-50/30 border-b border-blue-50 p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        <Avatar className="w-16 h-16 border-4 border-white shadow-xl ring-1 ring-blue-100/50">
                            <AvatarImage src={topic.user.image || ''} />
                            <AvatarFallback className="bg-blue-600 text-white text-2xl font-black">
                                {(topic.user.name || topic.user.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{topic.user.name || topic.user.username}</h3>
                                {topic.user.id === 1 && (
                                    <Badge className="bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest px-3 border-none shadow-sm flex items-center gap-1.5">
                                        Admin
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 font-medium">
                                <span className="flex items-center gap-1.5">
                                    Posted {formatDistanceToNow(topic.created_at, { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                        {isAdmin && <AdminTopicControls topicId={topic.id} authorId={topic.user.id} />}
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-12">
                    <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-headings:text-slate-900 prose-headings:font-black prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border-none prose-pre:rounded-2xl prose-blockquote:border-blue-600 prose-blockquote:bg-blue-50/50 prose-blockquote:rounded-r-xl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {topic.content}
                        </ReactMarkdown>
                    </div>
                </CardContent>
                <div className="px-8 py-6 bg-blue-50/20 border-t border-blue-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <LikeButton
                            targetId={topic.id}
                            targetType="topic"
                            initialLikes={topic._count.likes}
                            isActivelyLiked={hasLikedTopic}
                        />
                        <Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-400 hover:text-blue-600">
                            <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-blue-600">
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </div>
            </Card>

            {/* Replies Section */}
            {posts.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-2xl font-black text-blue-900 tracking-tight">
                            Discussions ({posts.length})
                        </h2>
                        <div className="h-1 flex-1 bg-gradient-to-r from-blue-100 to-transparent rounded-full" />
                    </div>
                    
                    <div className="space-y-6">
                        {posts.map((post) => (
                            <Card key={post.id} className="border-2 border-blue-50/50 bg-white hover:border-blue-100 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[1.5rem] overflow-hidden">
                                <CardHeader className="p-6 bg-blue-50/10 border-b border-blue-50/50">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-10 h-10 ring-2 ring-white shadow-md">
                                            <AvatarImage src={post.user.image || ''} />
                                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                                {(post.user.name || post.user.username || 'U').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{post.user.name || post.user.username}</span>
                                                {post.user.role === 'admin' && (
                                                    <Badge className="bg-blue-600 text-white font-black uppercase text-[8px] tracking-widest px-2 border-none">MOD</Badge>
                                                )}
                                                {post.user_id === topic.user_id && (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black uppercase text-[8px] tracking-widest px-2">Author</Badge>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                <MessageCircle className="w-3 h-3" /> {formatDistanceToNow(post.created_at, { addSuffix: true })}
                                            </div>
                                        </div>
                                        {isAdmin && <AdminPostControls postId={post.id} authorId={post.user_id} />}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <div className="prose prose-slate prose-sm max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:text-slate-900 prose-a:text-blue-600 prose-code:text-blue-600 prose-code:bg-blue-50/50 prose-code:rounded prose-pre:rounded-xl">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                            {post.content}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                                <div className="px-6 py-4 flex items-center justify-between bg-slate-50/10 border-t border-blue-50/30">
                                    <div className="flex items-center">
                                        <LikeButton
                                            targetId={post.id}
                                            targetType="post"
                                            initialLikes={post._count.likes}
                                            isActivelyLiked={likedPostIds.has(post.id)}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-300 hover:text-blue-600 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Reply Editor / CTA */}
            <div className="mt-16">
                {!topic.is_locked ? (
                    session?.user ? (
                        isUserActive ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-2xl font-black text-blue-900 tracking-tight">
                                        Your Reply
                                    </h2>
                                    <div className="h-1 flex-1 bg-gradient-to-r from-blue-100 to-transparent rounded-full" />
                                </div>
                                <ReplyForm topicId={topic.id} />
                            </div>
                        ) : (
                            <Card className="p-12 text-center bg-red-50 border-2 border-dashed border-red-200 rounded-[2.5rem]">
                                <CardContent>
                                    <div className="bg-red-100 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                        <Ban className="w-10 h-10 text-red-400" />
                                    </div>
                                    <h3 className="text-2xl font-black text-red-900 mb-2">Posting Restricted</h3>
                                    <p className="text-red-600 font-medium">You have been restricted from posting in the forum.</p>
                                </CardContent>
                            </Card>
                        )
                    ) : (
                        <Card className="p-12 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl shadow-blue-600/20 rounded-[3rem] overflow-hidden relative">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                            <CardContent className="relative z-10">
                                <div className="bg-white/20 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 backdrop-blur-md border border-white/20 shadow-xl">
                                    <MessageCircle className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight">Join the conversation</h3>
                                <p className="text-blue-50 text-lg mb-10 max-w-md mx-auto font-medium leading-relaxed opacity-90">
                                    Log in to share your thoughts, ask questions, and contribute to this discussion.
                                </p>
                                <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-[1.25rem] px-10 h-14 font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-105 active:scale-95">
                                    <Link href="/login">
                                        Sign In to Reply
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <Card className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                        <CardContent>
                            <div className="bg-slate-200 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Topic Locked</h3>
                            <p className="text-slate-500 font-medium">This discussion is closed for new replies.</p>
                        </CardContent>
                    </Card>
                )
                }
            </div>
        </div>
    )
}
