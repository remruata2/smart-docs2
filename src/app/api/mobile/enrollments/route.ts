import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    try {
        // 1. Verify Bearer Token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        if (!supabaseAdmin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

        const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !supabaseUser?.email) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. Get User ID
        const dbUser = await prisma.user.findUnique({
            where: { email: supabaseUser.email }
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = dbUser.id;

        // 3. Fetch Enrollments
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                user_id: userId,
                status: "active",
            },
            include: {
                course: {
                    include: {
                        subjects: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                last_accessed_at: "desc",
            }
        });

        // 4. Calculate Progress (Mock or Real)
        // Similar logic to getMyLearningData in actions.ts
        // For efficiency, we might skip detailed quiz aggregation here and do it simpler or per-course.
        // Let's just return what we have, maybe simple progress calculation if persisted.
        // UserEnrollment has 'progress' field.

        const formattedEnrollments = enrollments.map(enrollment => ({
            id: enrollment.id,
            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                description: enrollment.course.description,
                thumbnail_url: enrollment.course.thumbnail_url,
                subjects: enrollment.course.subjects,
                is_free: enrollment.course.is_free,
                price: enrollment.course.price?.toString() || null,
                currency: enrollment.course.currency,
            },
            progress: enrollment.progress || 0,
            is_paid: enrollment.is_paid,
            trial_ends_at: enrollment.trial_ends_at,
            last_accessed_at: enrollment.last_accessed_at,
        }));

        return NextResponse.json({ enrollments: formattedEnrollments });

    } catch (error) {
        console.error("Error fetching enrollments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
