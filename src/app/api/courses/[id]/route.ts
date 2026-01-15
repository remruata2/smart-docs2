import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        if (isNaN(courseId)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        // Check for Auth Header (optional for details, but needed for enrollment status)
        const authHeader = request.headers.get("Authorization");
        let userId: number | null = null;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (supabaseAdmin) {
                const { data: { user: supabaseUser } } = await supabaseAdmin.auth.getUser(token);
                if (supabaseUser?.email) {
                    // Find user in Prisma
                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: supabaseUser.email },
                                { username: supabaseUser.email.split("@")[0] }
                            ]
                        }
                    });
                    if (user) userId = user.id;
                }
            }
        }

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
                            }
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

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const enrollment = userId && (course as any).enrollments?.length > 0 ? (course as any).enrollments[0] : null;

        // Map to mobile-friendly format
        const responseData = {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            is_free: course.is_free,
            price: course.price?.toString() || null,
            currency: course.currency,
            board: course.board,
            board_id: course.board?.name || null,
            subjects: course.subjects.map(subject => ({
                id: subject.id,
                name: subject.name,
                chapters: subject.chapters.map(chapter => ({
                    ...chapter,
                    id: chapter.id.toString()
                })),
                chapterCount: subject._count.chapters
            })),
            isEnrolled: !!enrollment,
            enrollmentStatus: enrollment ? (enrollment.is_paid ? 'paid' : 'trial') : 'none'
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error("Error fetching course details:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
