import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pin, MessageSquare, Plus, Lock, Eye, MessageCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import prisma from '@/lib/prisma'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const category = await prisma.forumCategory.findUnique({
        where: { slug },
    })
    if (!category) return { title: 'Not Found' }
    return { title: `${category.name} | Zirna IO Forum` }
}

async function getCategoryAndTopics(slug: string) {
    const category = await prisma.forumCategory.findUnique({
        where: { slug },
    })

    if (!category) return null

    const topics = await prisma.forumTopic.findMany({
        where: { category_id: category.id },
        include: {
            user: {
                select: { id: true, name: true, username: true, image: true },
            },
            _count: {
                select: { posts: true },
            },
        },
        orderBy: [
            { is_pinned: 'desc' },
            { updated_at: 'desc' },
        ],
    })

    return { category, topics }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const data = await getCategoryAndTopics(slug)

    if (!data) return notFound()

    const { category, topics } = data

    return (
        <div className="container mx-auto max-w-5xl py-12 px-4 md:px-8">
            {/* Breadcrumb & Navigation */}
            <div className="mb-10">
                <Link 
                    href="/forum" 
                    className="inline-flex items-center text-sm font-bold text-blue-600/60 hover:text-blue-600 transition-all mb-8 group bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100/50"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to all categories
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-blue-100">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-xs text-blue-600 font-black uppercase tracking-[0.2em] mb-4">
                            <span className="w-8 h-1 rounded-full bg-blue-600" />
                            Forum Category
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">{category.name}</h1>
                        <p className="text-slate-500 text-lg md:text-xl mt-4 leading-relaxed font-medium">
                            {category.description || `Connect with other learners and dive deep into ${category.name}.`}
                        </p>
                    </div>
                    <Button asChild size="lg" className="rounded-2xl px-8 h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-black uppercase tracking-wider text-xs">
                        <Link href={`/forum/new?category=${category.slug}`}>
                            <Plus className="w-5 h-5 mr-2" />
                            New Topic
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Topics List Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 tracking-tight uppercase tracking-widest text-sm opacity-60">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    Discussions
                </h2>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                    {topics.length} Topics total
                </div>
            </div>

            {/* Topics List */}
            <div className="space-y-4">
                {topics.length === 0 ? (
                    <Card className="py-24 bg-gradient-to-br from-blue-50/50 to-white text-center border-2 border-dashed border-blue-100 rounded-[2.5rem] shadow-sm">
                        <CardContent>
                            <div className="bg-white w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/5 ring-8 ring-blue-50">
                                <MessageSquare className="w-12 h-12 text-blue-200" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">No conversations yet</h3>
                            <p className="text-slate-500 mb-10 max-w-sm mx-auto text-lg leading-relaxed font-medium">
                                This category is waiting for its first spark. Be the first to start a discussion!
                            </p>
                            <Button asChild size="lg" variant="outline" className="rounded-2xl border-2 border-blue-100 font-bold px-10 h-14 text-blue-600 hover:bg-blue-50 hover:border-blue-200">
                                <Link href={`/forum/new?category=${category.slug}`}>
                                    <Plus className="w-5 h-5 mr-2" />
                                    Start the First Topic
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    topics.map((topic) => (
                        <Link key={topic.id} href={`/forum/topic/${topic.slug}`} className="block group">
                            <Card className={`relative border-2 border-transparent shadow-[0_4px_15px_rgba(0,0,0,0.02)] group-hover:shadow-[0_15px_30px_rgba(59,130,246,0.1)] group-hover:border-blue-100/50 transition-all duration-500 overflow-hidden rounded-[1.5rem] ${topic.is_pinned ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30' : 'bg-white'}`}>
                                {topic.is_pinned && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />}
                                <CardContent className="p-6 flex items-center justify-between gap-8">
                                    
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        <div className="relative">
                                            <Avatar className="w-14 h-14 border-4 border-white shadow-xl ring-1 ring-blue-100/50">
                                                <AvatarImage src={topic.user.image || ''} />
                                                <AvatarFallback className="bg-blue-600 text-white text-xl font-black">
                                                    {(topic.user.name || topic.user.username || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {topic.is_pinned && (
                                                <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-white shadow-md">
                                                    <Pin className="w-3 h-3 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate tracking-tight leading-none">
                                                    {topic.title}
                                                </h3>
                                                {topic.is_locked && <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black uppercase text-[9px] tracking-widest py-0.5 px-3 border-none"><Lock className="w-3 h-3 mr-1.5" /> Locked</Badge>}
                                                {topic.is_pinned && <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-none font-black uppercase text-[9px] tracking-widest py-0.5 px-3 shadow-lg shadow-blue-500/20">Pinned</Badge>}
                                            </div>
                                            <div className="text-sm text-slate-400 flex items-center gap-4 font-medium">
                                                <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{topic.user.name || topic.user.username}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-100" />
                                                <span className="italic">{formatDistanceToNow(topic.created_at, { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div className="flex items-center gap-10">
                                        <div className="hidden sm:flex items-center gap-10">
                                            <div className="flex flex-col items-center min-w-[60px]">
                                                <span className="text-xl font-black text-slate-900 leading-none">{topic._count.posts}</span>
                                                <span className="text-[10px] uppercase font-black text-blue-600/40 tracking-[0.2em] mt-2">Replies</span>
                                            </div>
                                            <div className="flex flex-col items-center min-w-[60px]">
                                                <span className="text-xl font-black text-slate-900 leading-none">{topic.views}</span>
                                                <span className="text-[10px] uppercase font-black text-blue-600/40 tracking-[0.2em] mt-2">Views</span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-blue-50/50 text-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 shadow-sm transition-all duration-500">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>

            {/* Bottom Footer Info */}
            {topics.length > 5 && (
                <div className="mt-16 pt-16 border-t border-dashed border-blue-100 flex flex-col items-center">
                    <p className="text-slate-400 text-sm mb-6 font-medium italic">You've explored all the conversations in this category.</p>
                    <Button asChild variant="outline" className="rounded-2xl border-2 border-blue-100 font-black tracking-widest text-xs h-12 px-8 text-blue-600 hover:bg-blue-50">
                        <Link href={`/forum/new?category=${category.slug}`}>
                            <Plus className="w-5 h-5 mr-2" />
                            Start a new discussion
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
