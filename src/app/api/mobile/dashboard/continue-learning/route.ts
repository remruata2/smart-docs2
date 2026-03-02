import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        // 1. Activity First Strategy: Get subjects where user has recent activity
        // This avoids fetching all enrolled subjects and looping (N+1 problem)

        const [quizActivity, chatActivity] = await Promise.all([
            // Get last quiz activity per subject
            prisma.quiz.groupBy({
                by: ['subject_id'],
                where: { user_id: userId },
                _max: {
                    completed_at: true,
                    created_at: true
                }
            }),
            // Get last chat activity per subject
            prisma.conversation.groupBy({
                by: ['subject_id'],
                where: { user_id: userId },
                _max: {
                    updated_at: true
                }
            })
        ]);

        // Map subject IDs to their latest activity timestamp
        const subjectLastAccess = new Map<number, Date>();

        quizActivity.forEach(q => {
            if (!q.subject_id) return;
            // Use completed_at or created_at, whichever is later
            const completed = q._max.completed_at ? new Date(q._max.completed_at).getTime() : 0;
            const created = q._max.created_at ? new Date(q._max.created_at).getTime() : 0;
            const latest = new Date(Math.max(completed, created));

            subjectLastAccess.set(q.subject_id, latest);
        });

        chatActivity.forEach(c => {
            if (!c.subject_id) return;
            const updated = c._max.updated_at ? new Date(c._max.updated_at).getTime() : 0;
            const existing = subjectLastAccess.get(c.subject_id)?.getTime() || 0;

            if (updated > existing) {
                subjectLastAccess.set(c.subject_id, new Date(updated));
            }
        });

        const activeSubjectIds = Array.from(subjectLastAccess.keys());

        if (activeSubjectIds.length === 0) {
            return NextResponse.json({ subjects: [] });
        }

        // 2. Fetch Details for ONLY the active subjects
        // Filter by enrollment to ensure user still has access
        const subjects = await prisma.subject.findMany({
            where: {
                id: { in: activeSubjectIds },
                is_active: true,
                courses: {
                    some: {
                        enrollments: {
                            some: {
                                user_id: userId,
                                status: 'active'
                            }
                        }
                    }
                }
            },
            include: {
                _count: { select: { chapters: true } }
            }
        });

        // 3. Fetch Quiz Performance Data in Batch
        // Use a lightweight select
        const performanceQuizzes = await prisma.quiz.findMany({
            where: {
                user_id: userId,
                subject_id: { in: subjects.map(s => s.id) },
                status: 'COMPLETED',
                total_points: { gt: 0 }
            },
            select: {
                subject_id: true,
                score: true,
                total_points: true,
                chapter_id: true,
                completed_at: true,
                created_at: true
            }
        });

        // 4. In-Memory Processing & Calculation
        // Group quizzes by subject for easy access
        const quizzesBySubject = new Map<number, typeof performanceQuizzes>();
        performanceQuizzes.forEach(q => {
            const list = quizzesBySubject.get(q.subject_id) || [];
            list.push(q);
            quizzesBySubject.set(q.subject_id, list);
        });

        const sortedSubjects = subjects.map(subject => {
            const subjectQuizzes = quizzesBySubject.get(subject.id) || [];

            // Canonical readiness formula: (quizAverage * 0.7) + (syllabusCompletion * 0.3)
            // This matches mastery-service.ts used by web dashboard and mobile progress page
            let readiness = 0;

            if (subjectQuizzes.length > 0) {
                // Quiz Average: mean score percentage across all completed quizzes
                const totalScore = subjectQuizzes.reduce((acc, q) =>
                    acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
                const quizAverage = totalScore / subjectQuizzes.length;

                // Syllabus Completion: chapters with at least one quiz / total chapters
                const completedChapterIds = new Set(
                    subjectQuizzes.map(q => q.chapter_id?.toString()).filter(Boolean)
                );
                const syllabusCompletion = subject._count.chapters > 0
                    ? (completedChapterIds.size / subject._count.chapters) * 100
                    : 0;

                readiness = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));
            }

            return {
                id: subject.id,
                name: subject.name,
                description: null,
                readiness,
                chapterCount: subject._count.chapters,
                lastAccessedAt: subjectLastAccess.get(subject.id),
                _count: { chapters: subject._count.chapters }
            };
        });

        // 5. Final Sort
        sortedSubjects.sort((a, b) => {
            const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
            const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return b.readiness - a.readiness;
        });

        // Limit to 5
        return NextResponse.json({
            subjects: sortedSubjects.slice(0, 5)
        });

    } catch (error) {
        console.error("[MOBILE CONTINUE-LEARNING] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
