'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { createTopic } from '../actions'
import { checkUserActiveStatus } from '../user-actions'
import { Ban } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Category {
    id: number
    name: string
    slug: string
}

export default function NewTopicPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultCategory = searchParams.get('category')
    const { data: session, status } = useSession()

    const [categories, setCategories] = useState<Category[]>([])
    const [isLoadingCats, setIsLoadingCats] = useState(true)

    const [isActive, setIsActive] = useState<boolean | null>(null)
    const [isLoadingActiveStatus, setIsLoadingActiveStatus] = useState(true)

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [categoryId, setCategoryId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') {
            toast.error('You must be logged in to create a topic.')
            router.push('/login?callbackUrl=/forum/new')
        }

        if (status === 'authenticated') {
            checkUserActiveStatus().then(active => {
                setIsActive(active)
                setIsLoadingActiveStatus(false)
            }).catch(() => {
                setIsLoadingActiveStatus(false)
            })
        }
    }, [status, router])

    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('/api/mobile/forum/categories')
                const data = await res.json()
                if (data.success) {
                    setCategories(data.categories)

                    if (defaultCategory) {
                        const match = data.categories.find((c: Category) => c.slug === defaultCategory)
                        if (match) setCategoryId(match.id.toString())
                    }
                }
            } catch (error) {
                console.error('Failed to load categories', error)
                toast.error('Failed to load categories')
            } finally {
                setIsLoadingCats(false)
            }
        }
        fetchCategories()
    }, [defaultCategory])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim() || !content.trim() || !categoryId) {
            toast.error('Please fill in all required fields.')
            return
        }

        setIsSubmitting(true)
        try {
            const data = await createTopic({
                title,
                content,
                categoryId: parseInt(categoryId),
            })

            if (data.success && data.topic) {
                toast.success('Topic created successfully!')
                router.push(`/forum/topic/${data.topic.slug}`)
                router.refresh()
            } else {
                toast.error(data.error || 'Failed to create topic')
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred while creating the topic.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (status === 'loading' || isLoadingCats || isLoadingActiveStatus) {
        return (
            <div className="container mx-auto max-w-3xl py-20 flex items-center justify-center px-4 md:px-6">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (status === 'unauthenticated') return null

    if (isActive === false) {
        return (
            <div className="container mx-auto max-w-3xl py-10 px-4 md:px-6">
                <Button variant="ghost" asChild className="mb-6 -ml-4">
                    <Link href="/forum">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Forum
                    </Link>
                </Button>

                <Card className="border border-red-200 bg-red-50 text-red-800 flex flex-col items-center justify-center p-12 mt-8">
                    <Ban className="w-16 h-16 mb-4 text-red-500 opacity-80" />
                    <h2 className="text-2xl font-bold mb-2">Posting Restricted</h2>
                    <p className="text-center max-w-md">
                        Your account has been restricted from creating new topics or replying to existing ones in the forum.
                    </p>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-3xl py-10 px-4 md:px-6">
            <Button variant="ghost" asChild className="mb-6 -ml-4">
                <Link href="/forum">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Forum
                </Link>
            </Button>

            <div className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold tracking-tight">Create New Topic</h1>
                <p className="text-muted-foreground mt-2">
                    Start a new discussion. Supports Markdown for formatting.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                        value={categoryId}
                        onValueChange={setCategoryId}
                        disabled={isSubmitting}
                    >
                        <SelectTrigger id="category" className="w-full">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title">Topic Title</Label>
                    <Input
                        id="title"
                        placeholder="e.g., How to approach Data Interpretation?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                        maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="content">Content (Supports Markdown)</Label>
                    <Textarea
                        id="content"
                        placeholder="Write your topic content here... Use **bold**, *italics*, and lists!"
                        className="min-h-[300px] font-mono whitespace-pre-wrap"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="flex justify-end gap-4 border-t pt-4">
                    <Button variant="outline" type="button" disabled={isSubmitting} asChild>
                        <Link href="/forum">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Publish Topic
                    </Button>
                </div>
            </form>
        </div>
    )
}
