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

    // 1. Fetch Profile & Program Data
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
            program: {
                include: {
                    board: { include: { country: true } },
                    subjects: {
                        where: { is_active: true },
                        include: {
                            chapters: {
                                where: { is_active: true },
                            },
                        },
                    },
                },
            },
            institution: true,
        },
    });

    if (!profile) {
        redirect("/app/onboarding");
    }

    // 2. Fetch User Activity Data
    const [quizzes, userPoints] = await Promise.all([
        prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            include: { chapter: true, subject: true },
            orderBy: { completed_at: 'desc' }
        }),
        prisma.userPoints.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            select: { created_at: true }
        })
    ]);

    // 3. Calculate Metrics

    // A. Syllabus Completion
    const totalChapters = profile.program?.subjects?.reduce(
        (acc, subject) => acc + (subject.chapters?.length || 0), 0
    ) || 0;

    // Assuming a chapter is "completed" if at least one quiz is passed (>60%) or marked complete
    // For now, let's use unique chapters in completed quizzes as a proxy for completion
    const completedChapterIds = new Set(quizzes.map(q => q.chapter_id?.toString()).filter(Boolean));
    const completedChaptersCount = completedChapterIds.size;
    const syllabusCompletion = totalChapters > 0 ? (completedChaptersCount / totalChapters) * 100 : 0;

    // B. Quiz Performance
    const totalQuizScore = quizzes.reduce((acc, q) => acc + (q.score / q.total_points) * 100, 0);
    const quizAverage = quizzes.length > 0 ? totalQuizScore / quizzes.length : 0;

    // C. Readiness Score (Weighted: 70% Quiz Avg, 30% Syllabus)
    const readinessScore = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));

    // D. Weakness List (Bottom 3 chapters with score < 60%)
    // Group quizzes by chapter
    const chapterPerformance = new Map<string, { total: number, count: number, title: string, subject: string }>();

    quizzes.forEach(q => {
        if (!q.chapter_id || !q.chapter) return;
        const key = q.chapter_id.toString();
        const current = chapterPerformance.get(key) || { total: 0, count: 0, title: q.chapter.title, subject: q.subject.name };
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

    // E. Current Streak (Consecutive Days)
    let currentStreak = 0;
    if (userPoints.length > 0) {
        // Get all unique dates with activity
        const activityDates = Array.from(new Set(
            userPoints.map(p => new Date(p.created_at).toISOString().split('T')[0])
        )).sort().reverse(); // Newest first

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if active today or yesterday to keep streak alive
        if (activityDates.includes(today) || activityDates.includes(yesterday)) {
            currentStreak = 1;
            let checkDate = new Date(activityDates[0]); // Start from newest activity

            // If newest is today, we check backwards from yesterday. 
            // If newest is yesterday, we check backwards from day before yesterday.
            // But wait, we just need to count consecutive days in the sorted list.

            // Let's simplify: Iterate and check if dates are consecutive
            for (let i = 0; i < activityDates.length - 1; i++) {
                const current = new Date(activityDates[i]);
                const next = new Date(activityDates[i + 1]);

                const diffTime = Math.abs(current.getTime() - next.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    // F. Resume Learning (Last active quiz or first chapter)
    const lastQuiz = quizzes[0];
    const resumeData = lastQuiz ? {
        subject: lastQuiz.subject.name,
        chapter: lastQuiz.chapter?.title || "General Practice",
        lastScore: Math.round((lastQuiz.score / lastQuiz.total_points) * 100),
        quizId: lastQuiz.id
    } : null;

    // G. Upcoming Exams
    const upcomingExams = await prisma.exam.findMany({
        where: {
            is_active: true,
            date: { gte: new Date() },
            OR: [
                { program_id: profile.program_id }, // Exams for user's program
                { program_id: null } // Global exams
            ]
        },
        orderBy: { date: 'asc' },
        take: 3
    });

    // H. Badges
    const badges = await prisma.userBadge.findMany({
        where: { user_id: userId },
        include: { badge: true },
        orderBy: { earned_at: 'desc' }
    });

    // I. Radar Chart Data (Subject-wise performance)
    const subjectPerformance = new Map<number, { total: number, count: number }>();

    quizzes.forEach(q => {
        if (!q.subject_id) return;
        const current = subjectPerformance.get(q.subject_id) || { total: 0, count: 0 };
        const percentage = (q.score / q.total_points) * 100;
        subjectPerformance.set(q.subject_id, {
            total: current.total + percentage,
            count: current.count + 1
        });
    });

    const radarData = profile.program?.subjects?.map(sub => {
        const stats = subjectPerformance.get(sub.id);
        const avgScore = stats ? Math.round(stats.total / stats.count) : 0;

        return {
            subject: sub.code || sub.name.substring(0, 3).toUpperCase(),
            score: avgScore,
            fullMark: 100
        };
    }) || [];

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
        recentActivity: quizzes.slice(0, 5),
        upcomingExams,
        badges,
        radarData
    };
}
