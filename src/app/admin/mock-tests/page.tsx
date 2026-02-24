import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { UserRole } from '@/generated/prisma';
import MockTestListClient from './MockTestListClient';
import { pageContainer, pageTitle } from '@/styles/ui-classes';

export const dynamic = 'force-dynamic';

export default async function MockTestHistoryPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== UserRole.admin) {
        redirect('/unauthorized');
    }

    // Fetch all quizzes with related data
    const quizzes = await db.quiz.findMany({
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
            created_at: 'desc',
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

    // Serialize the data for the client component (especially handling Date objects)
    const serializedQuizzes = quizzes.map((quiz) => ({
        ...quiz,
        created_at: quiz.created_at.toISOString(),
        updated_at: quiz.updated_at.toISOString(),
        completed_at: quiz.completed_at?.toISOString() || null,
        // chapter_id is BigInt, but it's optional in schema. If present, convert to string.
        chapter_id: quiz.chapter_id?.toString() || null,
    }));

    return (
        <div className={pageContainer}>
            <h1 className={`${pageTitle} mb-8`}>Mock Test History</h1>
            <MockTestListClient
                initialTests={serializedQuizzes as any}
                courses={courses}
            />
        </div>
    );
}
