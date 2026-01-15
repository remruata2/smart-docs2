import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const courseId = id;
    console.log(`[DEBUG-MOBILE-COURSE] Incoming request for ID: ${courseId}`);

    try {
        let userId: number | null = null;
        try {
            const user = await getMobileUser(request);
            userId = user.id;
        } catch (e) {
            console.log("[DEBUG-MOBILE-COURSE] No authenticated user found for request");
        }

        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: {
                subjects: {
                    where: { is_active: true },
                    orderBy: { name: 'asc' },
                    include: {
                        chapters: {
                            where: { is_active: true },
                            orderBy: { chapter_number: 'asc' },
                            select: { id: true, title: true, chapter_number: true }
                        }
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check enrollment if user is logged in
        let enrollment = null;
        if (userId) {
            enrollment = await prisma.userEnrollment.findUnique({
                where: {
                    user_id_course_id: {
                        user_id: userId,
                        course_id: course.id
                    }
                }
            });
        }

        console.log(`[DEBUG-MOBILE-COURSE] Found course: ${course.title}, Enrolled: ${!!enrollment}`);

        // Format subjects to match mobile interface (Chapter interface inside Subject)
        const mappedSubjects = course.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            chapters: subject.chapters.map(ch => ({
                id: ch.id.toString(),
                title: ch.title,
                chapter_number: ch.chapter_number || 0
            })),
            chapterCount: subject.chapters.length
        }));

        return NextResponse.json({
            course: {
                ...course,
                subjects: mappedSubjects,
                isEnrolled: !!enrollment,
                enrollmentStatus: enrollment?.status || 'none',
                is_free: course.is_free,
                price: course.price?.toString() || null,
            }
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-COURSE] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch course details" },
            { status: 500 }
        );
    }
}
