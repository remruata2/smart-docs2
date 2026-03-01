'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Ban, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { deleteTopic, deletePost, banUser } from '../../actions'

export function AdminTopicControls({ topicId, authorId }: { topicId: string, authorId: number }) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isBanning, setIsBanning] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteTopic(topicId)
            if (result.success) {
                toast.success('Topic deleted successfully.')
                router.push('/forum') // Redirect to forum home
            } else {
                toast.error(result.error || 'Failed to delete topic.')
            }
        } catch (error) {
            toast.error('An error occurred.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBan = async () => {
        setIsBanning(true)
        try {
            const result = await banUser(authorId)
            if (result.success) {
                toast.success('User has been banned.')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to ban user.')
            }
        } catch (error) {
            toast.error('An error occurred.')
        } finally {
            setIsBanning(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" disabled={isDeleting}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Topic
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. It will permanently delete this topic and all of its replies.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-700 hover:bg-orange-50" disabled={isBanning}>
                        <Ban className="w-4 h-4 mr-2" />
                        Ban User
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ban User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deactivate the user's account and prevent them from logging in or posting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBan} className="bg-orange-600 hover:bg-orange-700">Ban User</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export function AdminPostControls({ postId, authorId }: { postId: string, authorId: number }) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isBanning, setIsBanning] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deletePost(postId)
            if (result.success) {
                toast.success('Reply deleted successfully.')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete reply.')
            }
        } catch (error) {
            toast.error('An error occurred.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBan = async () => {
        setIsBanning(true)
        try {
            const result = await banUser(authorId)
            if (result.success) {
                toast.success('User has been banned.')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to ban user.')
            }
        } catch (error) {
            toast.error('An error occurred.')
        } finally {
            setIsBanning(false)
        }
    }

    return (
        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground mr-2 border-r pr-2 shadow-sm rounded flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1"><ShieldAlert className="w-3 h-3 mr-1" /> Admin</span>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" disabled={isDeleting}>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reply?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. It will permanently delete this reply.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50" disabled={isBanning}>
                        <Ban className="w-3 h-3 mr-1" />
                        Ban
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ban User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deactivate the user's account and prevent them from logging in or posting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBan} className="bg-orange-600 hover:bg-orange-700">Ban User</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
