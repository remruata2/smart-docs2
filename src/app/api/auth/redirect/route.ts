import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * Smart redirect API - determines where to send users after login
 * - Admin users → /admin
 * - Users with enrollments → /my-learning
 * - Users without enrollments → / (catalog)
 */
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ redirect: "/login" });
    }

    // Admin users go to admin dashboard
    if (session.user.role === "admin") {
        return NextResponse.json({ redirect: "/admin" });
    }

    // Instructor users go to instructor dashboard
    if (session.user.role === "instructor") {
        return NextResponse.json({ redirect: "/instructor/dashboard" });
    }

    // Check if user has any enrollments
    const userId = parseInt(session.user.id as string);
    const enrollmentCount = await prisma.userEnrollment.count({
        where: {
            user_id: userId,
            status: "active",
        },
    });

    if (enrollmentCount > 0) {
        // User has courses, go to My Learning
        return NextResponse.json({ redirect: "/my-learning" });
    } else {
        // No courses yet, go to catalog to browse
        return NextResponse.json({ redirect: "/" });
    }
}
