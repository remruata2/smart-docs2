import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const enrollmentId = searchParams.get("id");

        if (!enrollmentId) {
            return NextResponse.json({ error: "Enrollment ID is required" }, { status: 400 });
        }

        // Check if enrollment exists
        const enrollment = await prisma.userEnrollment.findUnique({
            where: { id: parseInt(enrollmentId) },
        });

        if (!enrollment) {
            return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
        }

        // Delete the enrollment
        await prisma.userEnrollment.delete({
            where: { id: parseInt(enrollmentId) },
        });

        console.log(`[ADMIN-UNENROLL] Admin ${session.user.id} unenrolled user ${enrollment.user_id} from course ${enrollment.course_id}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADMIN-UNENROLL] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
