import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users2, MoveRight, HelpCircle, Lightbulb, BookOpen, Coffee } from 'lucide-react'
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

const CATEGORY_ICONS: Record<string, any> = {
    'general': MessageSquare,
    'questions': HelpCircle,
    'strategies': Lightbulb,
    'resources': BookOpen,
    'off-topic': Coffee,
}

const CATEGORY_COLORS: Record<string, { bg: string, text: string, iconBg: string }> = {
    'general': { bg: 'bg-blue-50/50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    'questions': { bg: 'bg-indigo-50/50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    'strategies': { bg: 'bg-sky-50/50', text: 'text-sky-600', iconBg: 'bg-sky-100' },
    'resources': { bg: 'bg-violet-50/50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
    'off-topic': { bg: 'bg-teal-50/50', text: 'text-teal-600', iconBg: 'bg-teal-100' },
}

export default async function ForumPage() {
    const categories = await getCategories()

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4 md:px-8">
            {/* Header Section */}
            <div className="relative mb-12 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-8 md:p-14 border-none shadow-2xl shadow-blue-500/20">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-80 w-80 rounded-full bg-sky-400 blur-3xl opacity-20 animate-pulse" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-80 w-80 rounded-full bg-indigo-400 blur-3xl opacity-20" />
                
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white mb-6 uppercase tracking-widest border border-white/10">
                        Community Hub
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-white leading-tight">Community Forum</h1>
                    <p className="text-blue-50 text-lg md:text-xl leading-relaxed opacity-90 font-medium">
                        Explore study strategies, ask questions, and collaborate with fellow students. Your journey to excellence starts with sharing.
                    </p>
                </div>
            </div>

            {/* Categories Grid */}
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-black text-blue-900 tracking-tight">
                    Browse Categories
                </h2>
                <div className="h-1 flex-1 bg-gradient-to-r from-blue-100 to-transparent rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((category) => {
                    const slug = category.slug.toLowerCase();
                    const Icon = CATEGORY_ICONS[slug] || MessageSquare;
                    const colors = CATEGORY_COLORS[slug] || { bg: 'bg-blue-50/50', text: 'text-blue-600', iconBg: 'bg-blue-100' };

                    return (
                        <Link key={category.id} href={`/forum/category/${category.slug}`} className="group h-full">
                            <Card className={`h-full border-2 border-transparent transition-all duration-500 transform hover:-translate-y-2 overflow-hidden bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)] hover:border-blue-200/50`}>
                                <div className={`h-1.5 w-full bg-gradient-to-r ${colors.text.replace('text', 'from').replace('-600', '-500')} to-transparent`} />
                                <CardHeader className="pb-2 pt-8">
                                    <div className="flex items-start justify-between">
                                        <div className={`p-4 rounded-[1.25rem] ${colors.iconBg} ${colors.text} mb-6 transition-all group-hover:rotate-6 group-hover:scale-110 duration-500 shadow-sm`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div className="flex items-center text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider border border-blue-100 shadow-sm">
                                            <Users2 className="w-3 h-3 mr-1.5" />
                                            {category._count.topics} Topics
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                                        {category.name}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2 text-slate-500 text-sm mt-2 font-medium leading-relaxed">
                                        {category.description || 'Dive into discussions and connect with the community.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-8 pt-4">
                                    <div className="flex items-center text-sm font-bold text-blue-600 group-hover:gap-4 gap-2 transition-all">
                                        Explore Discussions <MoveRight className="w-5 h-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Support Box */}
            <div className="mt-20 bg-gradient-to-br from-white to-blue-50/30 rounded-[2rem] p-10 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-blue-500/5">
                <div className="flex items-center gap-6 text-center md:text-left flex-1">
                    <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-blue-900 tracking-tight">Community Support</h3>
                        <p className="text-slate-500 font-medium max-w-md">Our community is built on mutual respect and help. Read our guidelines or reach out to mods.</p>
                    </div>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-2 border-blue-100 font-bold px-8 h-12 text-blue-600 hover:bg-blue-50">
                    <Link href="/forum/support">
                        View Guidelines
                    </Link>
                </Button>
            </div>
        </div>
    )
}
