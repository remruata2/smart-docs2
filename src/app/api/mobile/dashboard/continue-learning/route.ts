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

            // Calculate Mastery (Same logic as before, just in-memory)
            let mastery = 0;

            if (subjectQuizzes.length > 0) {
                // Group by Chapter
                const chapterMap = new Map<string, typeof subjectQuizzes>();
                subjectQuizzes.forEach(q => {
                    const chId = q.chapter_id ? q.chapter_id.toString() : 'unknown';
                    const list = chapterMap.get(chId) || [];
                    list.push(q);
                    chapterMap.set(chId, list);
                });

                const chapterMasteries: number[] = [];

                chapterMap.forEach((attempts) => {
                    // Sort by recent
                    attempts.sort((a, b) => {
                        const dateA = new Date(a.completed_at || a.created_at).getTime();
                        const dateB = new Date(b.completed_at || b.created_at).getTime();
                        return dateB - dateA;
                    });

                    // Top 3
                    const recent = attempts.slice(0, 3);

                    const score = recent.reduce((s, q) => s + q.score, 0);
                    const total = recent.reduce((s, q) => s + q.total_points, 0);
                    const chMastery = total > 0 ? (score / total) * 100 : 0;

                    chapterMasteries.push(chMastery);
                });

                const avgMastery = chapterMasteries.length > 0
                    ? chapterMasteries.reduce((a, b) => a + b, 0) / chapterMasteries.length
                    : 0;

                const coverage = subject._count.chapters > 0
                    ? (chapterMap.size / subject._count.chapters) * 100
                    : 0;

                mastery = Math.round((avgMastery * coverage) / 100);
            }

            return {
                id: subject.id,
                name: subject.name,
                description: null,
                mastery,
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
            return b.mastery - a.mastery;
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
