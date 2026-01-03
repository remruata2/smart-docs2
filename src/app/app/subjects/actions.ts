"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSubjectsForUserProgram(courseId?: number) {
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
                        include: {
                            program: {
                                include: { board: true }
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

    // Calculate mastery for each enrollment based on quiz scores
    // Mastery is calculated at the course level in the DB, but we want to show it per subject in the UI
    const enrollmentsWithMastery = await Promise.all(enrollments.map(async (enrollment) => {
        const subjectsWithMastery = await Promise.all(enrollment.course.subjects.map(async (subject) => {
            const completedQuizzes = await prisma.quiz.findMany({
                where: {
                    user_id: userId,
                    subject_id: subject.id,
                    status: "COMPLETED",
                    total_points: { gt: 0 }
                },
                select: {
                    score: true,
                    total_points: true
                }
            });

            let mastery = 0;
            if (completedQuizzes.length > 0) {
                const totalScore = completedQuizzes.reduce((sum, q) => sum + q.score, 0);
                const totalPoints = completedQuizzes.reduce((sum, q) => sum + q.total_points, 0);
                mastery = Math.round((totalScore / totalPoints) * 100);
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
