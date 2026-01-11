import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { enrollInCourse } from "@/app/(browse)/actions";

// Since we are calling a server action from an API route, we need to be careful.
// However, the mobile app uses Bearer token auth, not session cookie auth.
// We need to decode the token and get the user ID manually if we bypass the session.
// BUT, NextAuth session usually requires cookies.
//
// The mobile app sends Authorization: Bearer <token>.
// Detailed approach:
// 1. Verify token like in `mobile/auth/exchange`.
// 2. Call the logic of enrollInCourse directly or re-implement it.
// Re-implementing is safer/cleaner for API routes that use token auth.

import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
        }

        // Auth Check (Bearer Token)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        if (!supabaseAdmin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

        const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !supabaseUser?.email) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Get Local DB User
        const dbUser = await prisma.user.findUnique({
            where: { email: supabaseUser.email }
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = dbUser.id;

        // Perform Enrollment (Logic copied/adapted from actions.ts)
        const course = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: {
                subjects: {
                    select: { program_id: true },
                    take: 1
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const programId = course.subjects[0]?.program_id;
        const isPaidCourse = !course.is_free;

        let trialEndsAt: Date | null = null;
        let isPaidStatus = false;

        // For mobile simplified enrollment:
        // If course is free -> Paid=true (or free), Trial=null
        // If course is paid -> Paid=false, Trial=3 days
        // We'll assume "Free enrollment or Trial start" action.

        if (isPaidCourse) {
            isPaidStatus = false;
            trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        } else {
            // Free course
            isPaidStatus = true; // Effectively paid/owned
            trialEndsAt = null;
        }

        // Upsert enrollment
        await prisma.userEnrollment.upsert({
            where: {
                user_id_course_id: {
                    user_id: userId,
                    course_id: parseInt(courseId),
                }
            },
            create: {
                user_id: userId,
                course_id: parseInt(courseId),
                status: "active",
                progress: 0,
                program_id: programId,
                is_paid: isPaidStatus,
                trial_ends_at: trialEndsAt,
            },
            update: {
                program_id: programId,
                status: "active",
                // If re-enrolling, maybe reset trial? Or keep existing?
                // For now, let's just make sure it's active.
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Enrollment error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
