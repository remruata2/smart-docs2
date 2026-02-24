"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { calculateUserMastery } from "@/lib/mastery-service";

export async function getDashboardData() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id as string);

    // Run profile, recent activity, radar data, badges in parallel alongside unified mastery calculation
    const [profile, recentActivity, badges, masteryResult] = await Promise.all([
        // 1. Fetch Profile
        prisma.profile.findUnique({
            where: { user_id: userId },
        }),

        // 2. Recent Activity (Directly Limited to 5)
        prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            include: { chapter: true, subject: true },
            orderBy: { completed_at: 'desc' },
            take: 5
        }),

        // 3. Badges
        prisma.userBadge.findMany({
            where: { user_id: userId },
            include: { badge: true },
            orderBy: { earned_at: 'desc' }
        }),

        // 4. Unified mastery (Course → Subject → Chapter) via shared service
        calculateUserMastery(userId),
    ]);

    if (!profile) {
        redirect("/");
    }

    // Extract from mastery result
    const { metrics, courseMasteryData, weaknessList } = masteryResult;

    // Resume Learning (Use recent activity)
    const lastQuiz = recentActivity[0];
    const resumeData = lastQuiz ? {
        subject: lastQuiz.subject.name,
        chapter: lastQuiz.chapter?.title || "General Practice",
        lastScore: Math.round((lastQuiz.score / lastQuiz.total_points) * 100),
        quizId: lastQuiz.id
    } : null;

    // Radar Chart Data — per subject from courseMasteryData
    const radarData = courseMasteryData.flatMap(c => c.subjects).map(sub => ({
        subject: sub.name.substring(0, 4).toUpperCase(),
        score: sub.score,
        fullMark: 100
    })).slice(0, 6);

    // Enrollments (for sidebar / filter)
    const enrollments = await prisma.userEnrollment.findMany({
        where: { user_id: userId, status: "active" },
        include: {
            program: true,
            institution: true,
            course: { include: { subjects: true } }
        },
        orderBy: { last_accessed_at: 'desc' }
    });

    return {
        profile,
        metrics: {
            readinessScore: metrics.readinessScore,
            syllabusCompletion: metrics.syllabusCompletion,
            quizAverage: metrics.quizAverage,
            streak: metrics.currentStreak,
            totalChapters: metrics.totalChapters,
            completedChaptersCount: metrics.completedChaptersCount,
        },
        weaknessList,
        resumeData,
        recentActivity,
        badges,
        radarData,
        courseMasteryData,
        enrollments
    };
}
