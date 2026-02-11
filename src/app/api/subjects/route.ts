import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    try {
        const courseId = searchParams.get("courseId");
        const enrolledOnly = searchParams.get("enrolledOnly") === "true";

        // Global filter: Only official subjects or subjects created by the user
        const ownershipFilter = {
            OR: [
                { created_by_user_id: null },
                { created_by_user_id: userId }
            ]
        };

        // If enrolledOnly is requested, filter by current user's enrollments
        if (enrolledOnly) {
            const subjects = await prisma.subject.findMany({
                where: {
                    is_active: true,
                    ...ownershipFilter,
                    OR: [
                        {
                            courses: {
                                some: {
                                    enrollments: {
                                        some: { user_id: userId }
                                    }
                                }
                            }
                        },
                        {
                            program: {
                                enrollments: {
                                    some: { user_id: userId }
                                }
                            }
                        }
                    ]
                },
                include: {
                    _count: {
                        select: { chapters: true }
                    }
                }
            });

            return NextResponse.json({
                subjects: subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    description: null,
                    is_active: s.is_active,
                    _count: s._count,
                    mastery: 0,
                })),
                courseTitle: 'Enrolled Subjects'
            });
        }

        // If courseId is provided
        if (courseId) {
            const course = await prisma.course.findUnique({
                where: { id: parseInt(courseId) },
                include: {
                    subjects: {
                        where: {
                            is_active: true,
                            ...ownershipFilter
                        },
                        orderBy: { name: 'asc' },
                        include: {
                            _count: {
                                select: { chapters: true }
                            }
                        }
                    }
                }
            });

            if (!course) {
                return NextResponse.json({ subjects: [], courseTitle: 'Course' });
            }

            return NextResponse.json({
                subjects: course.subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    description: null,
                    is_active: s.is_active,
                    _count: s._count,
                    mastery: 0,
                })),
                courseTitle: course.title
            });
        }

        // Catalog mode
        const subjects = await prisma.subject.findMany({
            where: { is_active: true, ...ownershipFilter },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { chapters: true }
                }
            }
        });

        return NextResponse.json({
            subjects: subjects.map(s => ({
                id: s.id,
                name: s.name,
                description: null,
                is_active: s.is_active,
                _count: s._count,
                mastery: 0,
            })),
            courseTitle: 'All Subjects'
        });
    } catch (error) {
        console.error("[SUBJECTS-API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
