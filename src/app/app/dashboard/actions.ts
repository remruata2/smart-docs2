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

    // 1. Fetch Profile & Active Enrollments
    const [profile, enrollments] = await Promise.all([
        prisma.profile.findUnique({
            where: { user_id: userId },
        }),
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
                            include: {
                                chapters: {
                                    where: { is_active: true },
                                },
                            },
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
        })
    ]);

    if (!profile) {
        redirect("/");
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

    const activeProgramIds = Array.from(new Set(enrollments.map(e => e.program_id).filter(Boolean))) as number[];

    // 3. Calculate Metrics

    // A. Syllabus Completion (Aggregate across all enrolled programs)
    let totalChapters = 0;
    const enrolledSubjects: any[] = [];

    enrollments.forEach(e => {
        e.program?.subjects.forEach(subject => {
            totalChapters += subject.chapters?.length || 0;
            enrolledSubjects.push(subject);
        });
    });

    const completedChapterIds = new Set(quizzes.map(q => q.chapter_id?.toString()).filter(Boolean));
    const completedChaptersCount = completedChapterIds.size;
    const syllabusCompletion = totalChapters > 0 ? (completedChaptersCount / totalChapters) * 100 : 0;

    // B. Quiz Performance
    const totalQuizScore = quizzes.reduce((acc: number, q: any) => acc + (q.score / q.total_points) * 100, 0);
    const quizAverage = quizzes.length > 0 ? totalQuizScore / quizzes.length : 0;

    // C. Readiness Score (Weighted: 70% Quiz Avg, 30% Syllabus)
    const readinessScore = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));

    // D. Weakness List (Bottom 3 chapters with score < 60%)
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

    // F. Resume Learning
    const lastQuiz = quizzes[0];
    const resumeData = lastQuiz ? {
        subject: lastQuiz.subject.name,
        chapter: lastQuiz.chapter?.title || "General Practice",
        lastScore: Math.round((lastQuiz.score / lastQuiz.total_points) * 100),
        quizId: lastQuiz.id
    } : null;

    // G. Upcoming Exams (Filter by enrolled programs or global)
    const upcomingExams = await prisma.exam.findMany({
        where: {
            is_active: true,
            date: { gte: new Date() },
            OR: [
                { program_id: { in: activeProgramIds } },
                { program_id: null }
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

    // I. Radar Chart Data
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

    const radarData = enrolledSubjects.map(sub => {
        const stats = subjectPerformance.get(sub.id);
        const avgScore = stats ? Math.round(stats.total / stats.count) : 0;
        return {
            subject: sub.code || sub.name.substring(0, 3).toUpperCase(),
            score: avgScore,
            fullMark: 100
        };
    }).slice(0, 6); // Limit to 6 for radar visualization

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
        radarData,
        enrollments
    };
}
