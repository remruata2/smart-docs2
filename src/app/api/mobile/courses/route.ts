import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    console.log(`[DEBUG-MOBILE-CATALOG] Incoming request: ${request.url}`);

    try {
        let userId: number | null = null;
        try {
            const user = await getMobileUser(request);
            userId = user.id;
        } catch (e) {
            // User might not be logged in or token might be missing, which is fine for catalog browsing
            console.log("[DEBUG-MOBILE-CATALOG] No authenticated user found for request");
        }

        const courses = await prisma.course.findMany({
            where: {
                is_published: true,
                AND: query ? [
                    {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } },
                        ]
                    }
                ] : []
            },
            include: {
                subjects: {
                    select: { id: true, name: true }
                },
                enrollments: userId ? {
                    where: { user_id: userId }
                } : false,
                _count: {
                    select: { subjects: true, enrollments: true }
                }
            }
        });

        // Map courses to include isEnrolled flag and cleanup response
        const mappedCourses = courses.map(course => {
            const { enrollments, ...rest } = course;
            return {
                ...rest,
                isEnrolled: (enrollments && enrollments.length > 0) || false
            };
        });

        return NextResponse.json({ courses: mappedCourses });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-CATALOG] ERROR:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch course catalog" },
            { status: 500 }
        );
    }
}
