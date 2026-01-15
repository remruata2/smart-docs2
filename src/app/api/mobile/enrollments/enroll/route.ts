import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-ENROLL] Incoming enrollment request`);

    try {
        const user = await getMobileUser(request);
        const { courseId } = await request.json();

        if (!courseId) {
            return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }

        console.log(`[DEBUG-MOBILE-ENROLL] User ${user.email} enrolling in course ${courseId}`);

        // Check if course exists
        const course = await prisma.course.findUnique({
            where: { id: Number(courseId) }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Upsert enrollment
        const enrollment = await prisma.userEnrollment.upsert({
            where: {
                user_id_course_id: {
                    user_id: user.id,
                    course_id: Number(courseId)
                }
            },
            update: {
                status: "active",
                last_accessed_at: new Date()
            },
            create: {
                user_id: user.id,
                course_id: Number(courseId),
                status: "active",
                progress: 0,
                is_paid: course.is_free, // If free, consider it paid
            }
        });

        return NextResponse.json({
            success: true,
            enrollment
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-ENROLL] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to enroll in course" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
