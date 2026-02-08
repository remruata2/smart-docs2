"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Get course details with subjects and chapters
 */
export async function getCourseDetails(courseId: number) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id as string) : null;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            board: true,
            instructor: {
                include: { user: true }
            },
            subjects: {
                include: {
                    chapters: {
                        orderBy: { chapter_number: "asc" },
                        select: {
                            id: true,
                            title: true,
                            chapter_number: true,
                            study_materials: {
                                select: { summary: true }
                            }
                        },
                    },
                    _count: {
                        select: { chapters: true }
                    }
                }
            },
            ...(userId ? {
                enrollments: {
                    where: { user_id: userId },
                    select: {
                        id: true,
                        is_paid: true,
                        trial_ends_at: true
                    }
                }
            } : {})
        }
    });

    if (!course) return null;

    const enrollment = userId && (course as any).enrollments?.length > 0 ? (course as any).enrollments[0] : null;

    // Serialize the entire course including included relations
    return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        board_id: course.board_id,
        is_published: course.is_published,
        is_free: course.is_free,
        price: course.price?.toString() || null,
        currency: course.currency,
        instructor_id: course.instructor_id,
        created_at: course.created_at.toISOString(),
        updated_at: course.updated_at.toISOString(),
        board: course.board,
        instructor: course.instructor,
        subjects: course.subjects.map(subject => ({
            ...subject,
            chapters: subject.chapters.map(chapter => ({
                id: chapter.id.toString(),
                title: chapter.title,
                chapter_number: chapter.chapter_number,
                study_materials: chapter.study_materials
            }))
        })),
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment ? (enrollment.is_paid ? 'paid' : 'trial') : 'none',
        isAuthenticated: !!userId
    };
}

