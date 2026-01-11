import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");

        const courses = await prisma.course.findMany({
            where: {
                is_published: true,
                ...(query ? {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } }
                    ]
                } : {})
            },
            include: {
                subjects: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                board: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                created_at: "desc",
            }
        });

        // Map to mobile-friendly format
        const formattedCourses = courses.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            is_free: course.is_free,
            price: course.price?.toString() || null,
            currency: course.currency,
            subjects: course.subjects,
            board_id: course.board?.name || null,
        }));

        return NextResponse.json({
            courses: formattedCourses
        });

    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
