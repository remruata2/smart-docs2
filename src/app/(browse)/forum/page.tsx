import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users2 } from 'lucide-react'
import prisma from '@/lib/prisma'

export const metadata = {
    title: 'Community Forum | Zirna IO',
    description: 'Join the community discussion on exam preparation and study strategies.',
}

async function getCategories() {
    return await prisma.forumCategory.findMany({
        where: { is_active: true },
        orderBy: { order: 'asc' },
        include: {
            _count: {
                select: { topics: true },
            },
        },
    })
}

export default async function ForumPage() {
    const categories = await getCategories()

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Community Forum</h1>
                    <p className="text-muted-foreground text-lg">
                        Discuss study strategies, ask questions, and help others prepare for exams.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                    <Link key={category.id} href={`/forum/category/${category.slug}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    {category.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {category.description || 'Join this discussion category.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground bg-secondary/50 p-2 rounded-md inline-flex">
                                    <Users2 className="w-4 h-4 mr-2" />
                                    {category._count.topics} {category._count.topics === 1 ? 'Topic' : 'Topics'}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
