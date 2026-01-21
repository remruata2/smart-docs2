import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const { searchParams } = new URL(request.url);
        const selectedCourseId = searchParams.get('courseId') ? Number(searchParams.get('courseId')) : null;

        // 1. Parallel Fetching with Optimized Queries
        const [enrollments, recentActivity, allQuizzesLight, pointsAggregation, badges] = await Promise.all([
            // A. Enrollments: Fetch structure for counters
            prisma.userEnrollment.findMany({
                where: { user_id: userId, status: "active" },
                select: {
                    course_id: true,
                    course: {
                        select: {
                            id: true,
                            title: true,
                            subjects: {
                                select: {
                                    id: true,
                                    name: true,
                                    chapters: {
                                        where: { is_active: true },
                                        select: { id: true } // Only need ID for counting
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            // B. Recent Activity: Full details for just the top 5
            prisma.quiz.findMany({
                where: { user_id: userId, status: "COMPLETED" },
                take: 5,
                orderBy: { completed_at: 'desc' },
                include: {
                    chapter: { select: { title: true } },
                    subject: { select: { name: true } }
                }
            }),
            // C. All Quizzes: Lightweight for Stats (No joins)
            prisma.quiz.findMany({
                where: { user_id: userId, status: "COMPLETED" },
                select: {
                    id: true,
                    score: true,
                    total_points: true,
                    completed_at: true,
                    chapter_id: true,
                    subject_id: true
                },
                orderBy: { completed_at: 'desc' }
            }),
            // D. Total Points: Aggregate in DB
            prisma.userPoints.aggregate({
                where: { user_id: userId },
                _sum: { points: true }
            }),
            // E. Badges
            prisma.userBadge.findMany({
                where: { user_id: userId },
                include: { badge: true },
                orderBy: { earned_at: 'desc' }
            })
        ]);

        // 2. Filter data if a specific course is selected
        let filteredEnrollments = enrollments;
        let quizzes = allQuizzesLight;
        let recentQuizzes = recentActivity;

        if (selectedCourseId) {
            filteredEnrollments = enrollments.filter(e => e.course_id === selectedCourseId);
            const courseSubjectIds = new Set(filteredEnrollments.flatMap(e => e.course.subjects.map(s => s.id)));

            quizzes = allQuizzesLight.filter(q => courseSubjectIds.has(q.subject_id));
            recentQuizzes = recentActivity.filter(q => courseSubjectIds.has(q.subject_id));
        }

        // 3. Calculate Metrics

        // A. Total Chapters and Syllabus Completion
        let totalChapters = 0;
        filteredEnrollments.forEach(e => {
            e.course?.subjects.forEach(subject => {
                totalChapters += subject.chapters?.length || 0;
            });
        });

        const completedChapterIds = new Set(
            quizzes.map(q => q.chapter_id?.toString()).filter(Boolean)
        );
        const completedChaptersCount = completedChapterIds.size;
        const syllabusCompletion = totalChapters > 0
            ? Math.round((completedChaptersCount / totalChapters) * 100)
            : 0;

        // B. Quiz Performance
        const totalQuizScore = quizzes.reduce((acc, q) => {
            return acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0);
        }, 0);
        const quizAverage = quizzes.length > 0
            ? Math.round(totalQuizScore / quizzes.length)
            : 0;

        // C. Readiness Score (70% Quiz Avg, 30% Syllabus)
        const readinessScore = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));

        // D. Current Streak
        const activityDates = new Set<string>();
        const toDateString = (date: Date) => date.toISOString().split('T')[0];

        // Streak is global (based on all quizzes)
        const streakSource = allQuizzesLight;

        streakSource.forEach(q => {
            if (q.completed_at) {
                activityDates.add(toDateString(new Date(q.completed_at)));
            }
        });

        let currentStreak = 0;
        const today = new Date();
        const todayStr = toDateString(today);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toDateString(yesterday);

        if (activityDates.has(todayStr)) {
            currentStreak = 1;
            let checkDate = new Date(today);
            while (true) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (activityDates.has(toDateString(checkDate))) currentStreak++;
                else break;
            }
        } else if (activityDates.has(yesterdayStr)) {
            currentStreak = 1;
            let checkDate = new Date(yesterday);
            while (true) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (activityDates.has(toDateString(checkDate))) currentStreak++;
                else break;
            }
        }

        // E. Total Points
        const totalPoints = pointsAggregation._sum.points || 0;

        // F. Weakness List - Optimized (Aggregate first, then fetch details)
        const chapterStats = new Map<string, { total: number; count: number; chapterId: number }>();

        quizzes.forEach(q => {
            if (!q.chapter_id || q.total_points === 0) return;
            const key = q.chapter_id.toString();
            const current = chapterStats.get(key) || { total: 0, count: 0, chapterId: Number(q.chapter_id) };
            const percentage = (q.score / q.total_points) * 100;

            chapterStats.set(key, {
                total: current.total + percentage,
                count: current.count + 1,
                chapterId: current.chapterId
            });
        });

        // Identify weak chapters (Ids only)
        const weakChapterCandidates = Array.from(chapterStats.entries())
            .map(([id, data]) => ({
                id,
                chapterId: data.chapterId,
                score: Math.round(data.total / data.count)
            }))
            .filter(item => item.score < 60)
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);

        // Fetch details for these specific chapters
        let weaknessList: any[] = [];
        if (weakChapterCandidates.length > 0) {
            const weakChapterIds = weakChapterCandidates.map(w => w.chapterId);
            const weakChaptersDetails = await prisma.chapter.findMany({
                where: { id: { in: weakChapterIds } },
                select: { id: true, title: true, subject: { select: { name: true } } }
            });

            weaknessList = weakChapterCandidates.map(candidate => {
                const details = weakChaptersDetails.find(d => Number(d.id) === candidate.chapterId);
                return {
                    id: candidate.id,
                    chapterId: candidate.chapterId,
                    title: details?.title || "Unknown Chapter",
                    subject: details?.subject?.name || "Unknown Subject",
                    score: candidate.score
                };
            });
        }

        // G. Recent Activity Formatting
        const formattedActivity = recentQuizzes.slice(0, 5).map(q => ({
            id: q.id,
            chapterTitle: q.chapter?.title || "General Practice",
            subjectName: q.subject?.name || "Unknown",
            score: q.score,
            totalPoints: q.total_points,
            percentage: q.total_points > 0 ? Math.round((q.score / q.total_points) * 100) : 0,
            completedAt: q.completed_at
        }));

        // H. Enrollments for Filter
        const availableCourses = enrollments.map(e => ({
            id: e.course_id,
            title: e.course.title
        }));

        return NextResponse.json({
            metrics: {
                readinessScore,
                syllabusCompletion,
                quizAverage,
                currentStreak,
                totalPoints, // This is global total points
                totalChapters,
                completedChaptersCount,
                quizzesCompleted: quizzes.length
            },
            weaknessList,
            recentActivity: formattedActivity,
            badges: badges.map(ub => ({
                id: ub.id,
                name: ub.badge.name,
                icon: ub.badge.icon,
                earnedAt: ub.earned_at
            })),
            availableCourses
        });

    } catch (error: any) {
        console.error("[MOBILE-PROGRESS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch progress data" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
