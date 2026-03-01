'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { toggleLike } from '../../actions'

interface LikeButtonProps {
    targetId: string
    targetType: 'topic' | 'post'
    initialLikes: number
    isActivelyLiked?: boolean // If we already fetched whether the user liked it
}

export function LikeButton({ targetId, targetType, initialLikes, isActivelyLiked = false }: LikeButtonProps) {
    const [likes, setLikes] = useState(initialLikes)
    const [isLiked, setIsLiked] = useState(isActivelyLiked)
    const [isLoading, setIsLoading] = useState(false)

    const handleLike = async () => {
        setIsLoading(true)

        // Optimistic update
        const previousLikedStatus = isLiked
        const previousLikesCount = likes

        setIsLiked(!isLiked)
        setLikes(prev => isLiked ? prev - 1 : prev + 1)

        try {
            const result = await toggleLike({ targetId, targetType, isUpvote: !isLiked })

            if (!result.success) {
                // Revert if failed
                setIsLiked(previousLikedStatus)
                setLikes(previousLikesCount)
                if (result.error === 'Unauthorized') {
                    toast.error('Please log in to like this.')
                } else {
                    toast.error(result.error || 'Failed to toggle like.')
                }
            }
        } catch (error) {
            // Revert if error
            setIsLiked(previousLikedStatus)
            setLikes(previousLikesCount)
            toast.error('An error occurred while liking.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLoading}
            className={clsx(
                "transition-colors",
                isLiked ? "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100" : "text-muted-foreground hover:text-primary"
            )}
        >
            <Heart className={clsx("w-4 h-4 mr-2", isLiked && "fill-current")} />
            {likes} {likes === 1 ? 'Like' : 'Likes'}
        </Button>
    )
}
