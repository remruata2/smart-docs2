"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id as string);

    // Calculate date 30 days ago for streak calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run independent heavy queries in parallel
    const [profile, enrollments, recentActivity, allQuizStats, userPoints, badges] = await Promise.all([
        // 1. Fetch Profile
        prisma.profile.findUnique({
            where: { user_id: userId },
        }),

        // 2. Fetch Active Enrollments (Optimized: Get counts instead of all chapters)
        prisma.userEnrollment.findMany({
            where: {
                user_id: userId,
                status: "active"
            },
            include: {
                program: {
                    include: {
                        subjects: {
                            where: { is_active: true },
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                _count: {
                                    select: { chapters: { where: { is_active: true } } }
                                }
                            }
                        },
                    },
                },
                institution: true,
                course: {
                    include: {
                        subjects: true
                    }
                }
            },
            orderBy: { last_accessed_at: 'desc' }
        }),

        // 3. Recent Activity (Directly Limited to 5)
        prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            include: { chapter: true, subject: true },
            orderBy: { completed_at: 'desc' },
            take: 5
        }),

        // 4. All Quiz Stats (Lightweight Selection for Metrics/Radar/Weakness)
        prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            select: {
                id: true,
                score: true,
                total_points: true,
                subject_id: true,
                chapter_id: true,
                chapter: { select: { title: true } },
                subject: { select: { name: true } }
            },
            orderBy: { completed_at: 'desc' }
        }),

        // 5. User Points (Last 30 Days Only for Streak)
        prisma.userPoints.findMany({
            where: {
                user_id: userId,
                created_at: { gte: thirtyDaysAgo }
            },
            orderBy: { created_at: 'desc' },
            select: { created_at: true }
        }),

        // 6. Badges
        prisma.userBadge.findMany({
            where: { user_id: userId },
            include: { badge: true },
            orderBy: { earned_at: 'desc' }
        })
    ]);

    if (!profile) {
        redirect("/");
    }

    // --- Process Data In-Memory ---

    // A. Syllabus Completion
    let totalChapters = 0;
    const enrolledSubjects: any[] = [];

    enrollments.forEach(e => {
        e.program?.subjects.forEach(subject => {
            // Use the Count we fetched efficiently
            totalChapters += subject._count.chapters || 0;
            enrolledSubjects.push(subject);
        });
    });

    const completedChapterIds = new Set(allQuizStats.map(q => q.chapter_id?.toString()).filter(Boolean));
    const completedChaptersCount = completedChapterIds.size;
    const syllabusCompletion = totalChapters > 0 ? (completedChaptersCount / totalChapters) * 100 : 0;

    // B. Quiz Performance
    const totalQuizScore = allQuizStats.reduce((acc, q) => acc + (q.score / q.total_points) * 100, 0);
    const quizAverage = allQuizStats.length > 0 ? totalQuizScore / allQuizStats.length : 0;

    // C. Readiness Score
    const readinessScore = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));

    // D. Weakness List
    const chapterPerformance = new Map<string, { total: number, count: number, title: string, subject: string }>();

    allQuizStats.forEach(q => {
        if (!q.chapter_id || !q.chapter) return;
        const key = q.chapter_id.toString();
        // Fallback title/subject if missing (shouldn't happen with inner joins, but safe to default)
        const title = q.chapter?.title || "Unknown Chapter";
        const subjectName = q.subject?.name || "Unknown Subject";

        const current = chapterPerformance.get(key) || { total: 0, count: 0, title, subject: subjectName };
        const percentage = (q.score / q.total_points) * 100;

        chapterPerformance.set(key, {
            total: current.total + percentage,
            count: current.count + 1,
            title: current.title,
            subject: current.subject
        });
    });

    const weaknessList = Array.from(chapterPerformance.entries())
        .map(([id, data]) => ({
            id,
            title: data.title,
            subject: data.subject,
            score: Math.round(data.total / data.count)
        }))
        .filter(item => item.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

    // E. Current Streak
    let currentStreak = 0;
    if (userPoints.length > 0) {
        const activityDates = Array.from(new Set(
            userPoints.map(p => new Date(p.created_at).toISOString().split('T')[0])
        )).sort().reverse();

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (activityDates.includes(today) || activityDates.includes(yesterday)) {
            currentStreak = 1;
            for (let i = 0; i < activityDates.length - 1; i++) {
                const current = new Date(activityDates[i]);
                const next = new Date(activityDates[i + 1]);
                const diffDays = Math.ceil(Math.abs(current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) currentStreak++;
                else break;
            }
        }
    }

    // F. Resume Learning (Use recent activity)
    const lastQuiz = recentActivity[0];
    const resumeData = lastQuiz ? {
        subject: lastQuiz.subject.name,
        chapter: lastQuiz.chapter?.title || "General Practice",
        lastScore: Math.round((lastQuiz.score / lastQuiz.total_points) * 100),
        quizId: lastQuiz.id
    } : null;

    // G. Radar Chart Data
    const subjectStats = new Map<number, { total: number, count: number }>();
    allQuizStats.forEach(q => {
        if (!q.subject_id) return;
        const current = subjectStats.get(q.subject_id) || { total: 0, count: 0 };
        const percentage = (q.score / q.total_points) * 100;
        subjectStats.set(q.subject_id, {
            total: current.total + percentage,
            count: current.count + 1
        });
    });

    const radarData = enrolledSubjects.map(sub => {
        const stats = subjectStats.get(sub.id);
        const avgScore = stats ? Math.round(stats.total / stats.count) : 0;
        return {
            subject: sub.code || sub.name.substring(0, 3).toUpperCase(),
            score: avgScore,
            fullMark: 100
        };
    }).slice(0, 6);

    // H. Course & Subject Mastery Data (Using standardized 70/30 Readiness Formula)
    const courseMasteryData = await Promise.all(enrollments.map(async (e) => {
        const courseSubjects = e.course?.subjects || [];

        // Calculate Subject Level Readiness
        const subjectMastery = await Promise.all(courseSubjects.map(async (sub) => {
            // 1. Subject Quiz Average
            const subQuizzes = allQuizStats.filter(q => q.subject_id === sub.id);
            const subQuizAvg = subQuizzes.length > 0
                ? subQuizzes.reduce((acc, q) => acc + (q.score / q.total_points) * 100, 0) / subQuizzes.length
                : 0;

            // 2. Subject Syllabus Completion
            const subjectWithCount = enrolledSubjects.find(es => es.id === sub.id);
            const subTotalChapters = subjectWithCount?._count.chapters || 0;
            const subCompletedChapters = new Set(subQuizzes.map(q => q.chapter_id?.toString()).filter(Boolean)).size;
            const subSyllabusComp = subTotalChapters > 0 ? (subCompletedChapters / subTotalChapters) * 100 : 0;

            // 3. Subject Readiness Score (Standard Formula)
            const subReadiness = Math.round((subQuizAvg * 0.7) + (subSyllabusComp * 0.3));

            // 4. Chapter Level Readiness
            // Fetch chapters for this subject to show in drill-down
            const chapters = await prisma.chapter.findMany({
                where: { subject_id: sub.id, is_active: true },
                select: { id: true, title: true }
            });

            const chapterMastery = chapters.map(chap => {
                const chapQuizzes = subQuizzes.filter(q => q.chapter_id?.toString() === chap.id.toString());
                const chapQuizAvg = chapQuizzes.length > 0
                    ? chapQuizzes.reduce((acc, q) => acc + (q.score / q.total_points) * 100, 0) / chapQuizzes.length
                    : 0;

                const isCompleted = completedChapterIds.has(chap.id.toString());
                const chapReadiness = Math.round((chapQuizAvg * 0.7) + (isCompleted ? 30 : 0));

                return {
                    id: chap.id.toString(),
                    name: chap.title,
                    score: chapReadiness
                };
            }).sort((a, b) => b.score - a.score);

            return {
                id: sub.id,
                name: sub.name,
                score: subReadiness,
                chapters: chapterMastery
            };
        }));

        // Calculate Course Level Readiness
        // 1. Course Quiz Average
        const courseSubjectIds = new Set(courseSubjects.map(s => s.id));
        const courseQuizzes = allQuizStats.filter(q => q.subject_id && courseSubjectIds.has(q.subject_id));
        const courseQuizAvg = courseQuizzes.length > 0
            ? courseQuizzes.reduce((acc, q) => acc + (q.score / q.total_points) * 100, 0) / courseQuizzes.length
            : 0;

        // 2. Course Syllabus Completion
        const courseTotalChapters = courseSubjects.reduce((acc, sub) => {
            const swc = enrolledSubjects.find(es => es.id === sub.id);
            return acc + (swc?._count.chapters || 0);
        }, 0);
        const courseCompletedChapters = new Set(courseQuizzes.map(q => q.chapter_id?.toString()).filter(Boolean)).size;
        const courseSyllabusComp = courseTotalChapters > 0 ? (courseCompletedChapters / courseTotalChapters) * 100 : 0;

        // 3. Course Readiness Score
        const courseReadiness = Math.round((courseQuizAvg * 0.7) + (courseSyllabusComp * 0.3));

        return {
            courseId: e.course_id.toString(),
            courseTitle: e.course?.title || "Unknown Course",
            mastery: courseReadiness,
            subjects: subjectMastery
        };
    }));

    return {
        profile,
        metrics: {
            readinessScore,
            syllabusCompletion: Math.round(syllabusCompletion),
            quizAverage: Math.round(quizAverage),
            streak: currentStreak,
            totalChapters,
            completedChaptersCount
        },
        weaknessList,
        resumeData,
        recentActivity, // Already limited to 5
        badges,
        radarData,
        courseMasteryData,
        enrollments
    };
}
