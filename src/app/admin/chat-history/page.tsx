import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { UserRole } from '@/generated/prisma';
import ChatHistoryClient from './ChatHistoryClient';
import { pageContainer, pageTitle } from '@/styles/ui-classes';

export const dynamic = 'force-dynamic';

export default async function ChatHistoryPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== UserRole.admin) {
        redirect('/unauthorized');
    }

    // Fetch all conversations with related data
    const conversations = await db.conversation.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    enrollments: {
                        select: {
                            course_id: true,
                        },
                    },
                },
            },
            subject: {
                select: {
                    id: true,
                    name: true,
                    courses: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            updated_at: 'desc',
        },
    });

    // Fetch all courses for the filter
    const courses = await db.course.findMany({
        select: {
            id: true,
            title: true,
        },
        orderBy: {
            title: 'asc',
        },
    });

    // Serialize the data for the client component
    const serializedConversations = conversations.map((conv) => ({
        ...conv,
        created_at: conv.created_at.toISOString(),
        updated_at: conv.updated_at.toISOString(),
        last_message_at: conv.last_message_at?.toISOString() || null,
        // chapter_id is BigInt
        chapter_id: conv.chapter_id?.toString() || null,
    }));

    return (
        <div className={pageContainer}>
            <h1 className={`${pageTitle} mb-8`}>Chat History</h1>
            <ChatHistoryClient
                initialConversations={serializedConversations as any}
                courses={courses}
            />
        </div>
    );
}
