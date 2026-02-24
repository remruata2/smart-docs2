import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { UserRole } from '@/generated/prisma';
import MockTestDetailClient from './MockTestDetailClient';
import { pageContainer, pageTitle } from '@/styles/ui-classes';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function MockTestDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || !session.user || session.user.role !== UserRole.admin) {
        redirect('/unauthorized');
    }

    const quiz = await db.quiz.findUnique({
        where: { id },
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
            questions: {
                orderBy: {
                    id: 'asc',
                },
            },
        },
    });

    if (!quiz) {
        notFound();
    }

    // Serialize data
    const serializedQuiz = {
        ...quiz,
        created_at: quiz.created_at.toISOString(),
        updated_at: quiz.updated_at.toISOString(),
        completed_at: quiz.completed_at?.toISOString() || null,
        chapter_id: quiz.chapter_id?.toString() || null,
        questions: quiz.questions.map(q => ({
            ...q,
            chapter_id: q.chapter_id?.toString() || null,
        })),
    };

    return (
        <div className={pageContainer}>
            <div className="mb-6 space-y-4">
                <Button variant="ghost" size="sm" asChild className="-ml-2 text-gray-500 hover:text-gray-900">
                    <Link href="/admin/mock-tests">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Mock Tests
                    </Link>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className={pageTitle}>Mock Test Details</h1>
                </div>
            </div>

            <MockTestDetailClient test={serializedQuiz as any} />
        </div>
    );
}
