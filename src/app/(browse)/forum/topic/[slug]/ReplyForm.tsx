'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createPost } from '../../actions'

interface ReplyFormProps {
    topicId: string
}

export function ReplyForm({ topicId }: ReplyFormProps) {
    const router = useRouter()
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!content.trim()) {
            toast.error('Please write some content for your reply.')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createPost({
                content,
                topicId,
            })

            if (result.success) {
                toast.success('Reply posted successfully!')
                setContent('')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to post reply')
            }
        } catch (error) {
            console.error('Failed to post reply:', error)
            toast.error('An error occurred while posting your reply.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="mt-8">
            <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg">Write a Reply</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        placeholder="Type your reply here... (Supports Markdown)"
                        className="min-h-[150px] font-mono"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Post Reply
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
