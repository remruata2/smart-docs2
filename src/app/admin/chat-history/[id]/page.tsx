import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { UserRole } from '@/generated/prisma';
import ChatDetailClient from './ChatDetailClient';
import { pageContainer, pageTitle } from '@/styles/ui-classes';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const conversationId = parseInt(id);

    if (!session || !session.user || session.user.role !== UserRole.admin) {
        redirect('/unauthorized');
    }

    if (isNaN(conversationId)) {
        notFound();
    }

    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
            user: {
                select: {
                    username: true,
                    name: true,
                },
            },
            subject: {
                select: {
                    name: true,
                },
            },
            messages: {
                orderBy: {
                    created_at: 'asc',
                },
            },
        },
    });

    if (!conversation) {
        notFound();
    }

    // Serialize data
    const serializedConversation = {
        ...conversation,
        created_at: conversation.created_at.toISOString(),
        updated_at: conversation.updated_at.toISOString(),
        last_message_at: conversation.last_message_at?.toISOString() || null,
        chapter_id: conversation.chapter_id?.toString() || null,
        messages: conversation.messages.map((m) => ({
            ...m,
            created_at: m.created_at.toISOString(),
        })),
    };

    return (
        <div className={pageContainer}>
            <div className="mb-6 space-y-4">
                <Button variant="ghost" size="sm" asChild className="-ml-2 text-gray-500 hover:text-gray-900">
                    <Link href="/admin/chat-history">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Chat History
                    </Link>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className={pageTitle}>Conversation History</h1>
                </div>
            </div>

            <ChatDetailClient chat={serializedConversation as any} />
        </div>
    );
}
