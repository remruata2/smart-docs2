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

        const boards = await prisma.board.findMany({
            where: { is_active: true }
        });

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
            },
            orderBy: {
                created_at: "desc"
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

        const PREFERRED_ORDER = ['MPSC', 'Departmental', 'MBSE', 'CBSE', 'Banking', 'Entrance', 'UPSC'];
        const categoriesMap = new Map<string, { id: string, name: string, courses: typeof mappedCourses }>();

        boards.forEach(b => {
            categoriesMap.set(b.id, { id: b.id, name: b.name, courses: [] });
        });

        mappedCourses.forEach(course => {
            if (categoriesMap.has(course.board_id)) {
                categoriesMap.get(course.board_id)!.courses.push(course);
            }
        });

        const allCategories = Array.from(categoriesMap.values());
        allCategories.sort((a, b) => {
            const idxA = PREFERRED_ORDER.indexOf(a.id);
            const idxB = PREFERRED_ORDER.indexOf(b.id);
            const valA = idxA === -1 ? 999 : idxA;
            const valB = PREFERRED_ORDER.indexOf(b.id) === -1 ? 999 : PREFERRED_ORDER.indexOf(b.id);
            if (valA !== valB) return valA - valB;
            return a.name.localeCompare(b.name);
        });

        const populatedCategories = allCategories.filter(c => c.courses.length > 0);
        const upcomingCategories = allCategories.filter(c => c.courses.length === 0);

        return NextResponse.json({
            courses: mappedCourses,
            categories: populatedCategories,
            upcoming: upcomingCategories
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-CATALOG] ERROR:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch course catalog" },
            { status: 500 }
        );
    }
}
