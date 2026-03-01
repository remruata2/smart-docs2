import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pin, MessageSquare, Plus, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
        <div className="container mx-auto max-w-5xl py-10 px-4 md:px-8">
            {/* Breadcrumb & Header */}
            <div className="mb-8">
                <div className="flex items-center text-sm text-muted-foreground mb-4 space-x-2">
                    <Link href="/forum" className="hover:underline">Forum</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">{category.name}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
                        <p className="text-muted-foreground text-lg mt-2">
                            {category.description || `Discussions related to ${category.name}`}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/forum/new?category=${category.slug}`}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Topic
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Topics List */}
            <div className="space-y-4">
                {topics.length === 0 ? (
                    <Card className="py-12 bg-muted/50 text-center border-dashed">
                        <CardContent>
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold mb-2">No topics yet</h3>
                            <p className="text-muted-foreground mb-6">Be the first to start a conversation in this category!</p>
                            <Button asChild variant="outline">
                                <Link href={`/forum/new?category=${category.slug}`}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Start a Topic
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    topics.map((topic) => (
                        <Link key={topic.id} href={`/forum/topic/${topic.slug}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                <CardContent className="p-4 flex items-center justify-between gap-4">

                                    {/* Avatar & Info */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <Avatar className="w-10 h-10 border shadow-sm group-hover:border-primary/20 transition-colors">
                                            <AvatarImage src={topic.user.image || ''} />
                                            <AvatarFallback>{(topic.user.name || topic.user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors flex items-center gap-2">
                                                {topic.is_pinned && <Pin className="w-4 h-4 text-orange-500 fill-orange-500/20" />}
                                                {topic.title}
                                                {topic.is_locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                                            </h3>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                <span className="font-medium text-foreground">{topic.user.name || topic.user.username}</span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(topic.created_at, { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                                        <div className="flex flex-col items-center">
                                            <span className="font-semibold text-foreground">{topic._count.posts}</span>
                                            <span className="text-xs">Replies</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="font-semibold text-foreground">{topic.views}</span>
                                            <span className="text-xs">Views</span>
                                        </div>
                                        <div className="text-xs text-right min-w-[120px]">
                                            <div>Activity</div>
                                            <div className="font-medium text-foreground">
                                                {formatDistanceToNow(topic.updated_at, { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
