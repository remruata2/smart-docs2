"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSubjectsForUserProgram(courseId?: number, includeMastery: boolean = true) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // Fetch user profile
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
    });

    // Fetch enrolled courses for the user
    const enrollments = await prisma.userEnrollment.findMany({
        where: {
            user_id: userId,
            status: "active",
            ...(courseId ? { course_id: courseId } : {}),
        },
        include: {
            course: {
                include: {
                    subjects: {
                        where: {
                            OR: [
                                { created_by_user_id: null },
                                { created_by_user_id: userId }
                            ]
                        },
                        include: {
                            program: {
                                include: { board: true }
                            },
                            chapters: {
                                select: {
                                    id: true,
                                    title: true,
                                    quizzes_enabled: true
                                },
                                orderBy: {
                                    id: 'asc'
                                }
                            },
                            _count: {
                                select: {
                                    chapters: true,
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            last_accessed_at: "desc",
        },
    });

    // If mastery calculation is not needed, return early with simplified data
    if (!includeMastery) {
        // Get program info from the current context
        const contextEnrollment = courseId
            ? enrollments.find(e => e.course_id === courseId)
            : enrollments[0];

        const programInfo = contextEnrollment?.course?.subjects[0]?.program ? {
            program: contextEnrollment.course.subjects[0].program,
            board: contextEnrollment.course.subjects[0].program.board,
        } : null;

        return {
            enrollments: enrollments.map(e => ({
                ...e,
                course: {
                    ...e.course,
                    price: e.course.price ? Number(e.course.price) : 0,
                    subjects: e.course.subjects.map(s => ({ ...s, mastery: 0 }))
                }
            })),
            programInfo,
        };
    }

    // Calculate mastery using per-chapter recent attempts method
    // This reflects recent performance and prevents practice penalty
    const enrollmentsWithMastery = await Promise.all(enrollments.map(async (enrollment) => {
        const subjectsWithMastery = await Promise.all(enrollment.course.subjects.map(async (subject) => {
            // Get ALL completed quizzes for this subject
            const completedQuizzes = await prisma.quiz.findMany({
                where: {
                    user_id: userId,
                    subject_id: subject.id,
                    status: "COMPLETED",
                    total_points: { gt: 0 }
                },
                select: {
                    score: true,
                    total_points: true,
                    chapter_id: true,
                    completed_at: true,
                    created_at: true
                }
            });

            let mastery = 0;
            const totalChapters = subject._count.chapters;

            if (completedQuizzes.length > 0) {
                // Group quizzes by chapter
                const quizzesByChapter = new Map<string, typeof completedQuizzes>();

                completedQuizzes.forEach(quiz => {
                    if (quiz.chapter_id !== null) {
                        const chapterId = quiz.chapter_id.toString();
                        if (!quizzesByChapter.has(chapterId)) {
                            quizzesByChapter.set(chapterId, []);
                        }
                        quizzesByChapter.get(chapterId)!.push(quiz);
                    }
                });

                // Calculate mastery per chapter using last 3 attempts
                const chapterMasteries: number[] = [];

                quizzesByChapter.forEach((chapterQuizzes) => {
                    // Sort by date (newest first)
                    const sortedQuizzes = chapterQuizzes.sort((a, b) => {
                        const dateA = a.completed_at || a.created_at;
                        const dateB = b.completed_at || b.created_at;
                        return new Date(dateB).getTime() - new Date(dateA).getTime();
                    });

                    // Take last 3 attempts (or all if less than 3)
                    const recentAttempts = sortedQuizzes.slice(0, 3);

                    // Calculate average score using cumulative method (naturally weights by quiz size)
                    const totalScore = recentAttempts.reduce((sum, q) => sum + q.score, 0);
                    const totalPoints = recentAttempts.reduce((sum, q) => sum + q.total_points, 0);
                    const chapterMastery = (totalScore / totalPoints) * 100;

                    chapterMasteries.push(chapterMastery);
                });

                // Average mastery across all attempted chapters
                const avgChapterMastery = chapterMasteries.length > 0
                    ? chapterMasteries.reduce((sum, m) => sum + m, 0) / chapterMasteries.length
                    : 0;

                // Calculate chapter coverage
                const chaptersAttempted = quizzesByChapter.size;
                const coveragePercentage = totalChapters > 0
                    ? (chaptersAttempted / totalChapters) * 100
                    : 0;

                // Final mastery: (Average chapter mastery × Coverage) / 100
                mastery = Math.round((avgChapterMastery * coveragePercentage) / 100);
            }

            return {
                ...subject,
                mastery
            };
        }));

        return {
            ...enrollment,
            course: {
                ...enrollment.course,
                price: enrollment.course.price ? Number(enrollment.course.price) : 0,
                subjects: subjectsWithMastery
            }
        };
    }));

    // Get program info from the current context (either courseId or latest accessed)
    const contextEnrollment = courseId
        ? enrollmentsWithMastery.find(e => e.course_id === courseId)
        : enrollmentsWithMastery[0];

    const programInfo = contextEnrollment?.course?.subjects[0]?.program ? {
        program: contextEnrollment.course.subjects[0].program,
        board: contextEnrollment.course.subjects[0].program.board,
    } : null;

    return {
        enrollments: enrollmentsWithMastery,
        programInfo,
    };
}
