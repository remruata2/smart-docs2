import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
    try {
        let userId: number;
        const authHeader = request.headers.get("Authorization");

        // Mobile Auth (Bearer Token)
        if (authHeader?.startsWith("Bearer ")) {
            const user = await getMobileUser(request);
            userId = Number(user.id);
        }
        // Web Auth (Session Cookie)
        else {
            const session = await getServerSession(authOptions);
            if (!session?.user?.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            userId = Number(session.user.id);
        }

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
