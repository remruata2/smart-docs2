import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    console.log(`[DEBUG-SUBJECTS] Incoming request: ${request.url} (enrolledOnly: ${searchParams.get("enrolledOnly")})`);

    try {
        const courseId = searchParams.get("courseId");
        const enrolledOnly = searchParams.get("enrolledOnly") === "true";

        // If enrolledOnly is requested, filter by current user's enrollments
        if (enrolledOnly) {
            console.log(`[DEBUG-SUBJECTS] Step 1: Entering enrolledOnly block`);
            try {
                const user = await getMobileUser(request);
                console.log(`[DEBUG-SUBJECTS] Step 2: Authenticated user: ${user.email} (ID: ${user.id})`);

                // Direct query for subjects that have at least one enrollment for the user
                // either via a linked course or via the subject's program.
                console.log(`[DEBUG-SUBJECTS] Step 3: Running Prisma query for user ${user.id}`);
                const subjects = await prisma.subject.findMany({
                    where: {
                        is_active: true,
                        OR: [
                            {
                                courses: {
                                    some: {
                                        enrollments: {
                                            some: {
                                                user_id: Number(user.id)
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                program: {
                                    enrollments: {
                                        some: {
                                            user_id: Number(user.id)
                                        }
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

                console.log(`[DEBUG-SUBJECTS] Step 4: Found ${subjects.length} subjects for user ${user.id}`);
                subjects.forEach(s => {
                    console.log(`[DEBUG-SUBJECTS] - Subject: ${s.name} (ID: ${s.id}, Chapters: ${s._count.chapters})`);
                });

                const formattedSubjects = subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    description: null,
                    is_active: s.is_active,
                    _count: s._count,
                    mastery: 0,
                }));

                return NextResponse.json({
                    subjects: formattedSubjects,
                    courseTitle: 'Enrolled Subjects'
                });
            } catch (authError: any) {
                console.error("[DEBUG-SUBJECTS] AUTH ERROR:", authError.message);
                return NextResponse.json({ error: authError.message || "Unauthorized" }, { status: 401 });
            }
        }

        // If courseId is provided, get subjects for that course via the many-to-many relation
        if (courseId) {
            console.log(`[DEBUG-SUBJECTS] Fetching subjects for specific courseId: ${courseId}`);
            const course = await prisma.course.findUnique({
                where: { id: parseInt(courseId) },
                include: {
                    subjects: {
                        where: { is_active: true },
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
                console.log(`[DEBUG-SUBJECTS] Course ${courseId} not found`);
                return NextResponse.json({ subjects: [], courseTitle: 'Course' });
            }

            console.log(`[DEBUG-SUBJECTS] Found ${course.subjects.length} subjects for course ${course.title}`);

            const formattedSubjects = course.subjects.map(s => ({
                id: s.id,
                name: s.name,
                description: null,
                is_active: s.is_active,
                _count: s._count,
                mastery: 0,
            }));

            return NextResponse.json({
                subjects: formattedSubjects,
                courseTitle: course.title
            });
        }

        // No specific filters - return all active subjects (catalog mode)
        console.log(`[DEBUG-SUBJECTS] Fetching all active subjects (catalog mode)`);
        const subjects = await prisma.subject.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { chapters: true }
                }
            }
        });

        console.log(`[DEBUG-SUBJECTS] Found ${subjects.length} total active subjects`);

        const formattedSubjects = subjects.map(s => ({
            id: s.id,
            name: s.name,
            description: null,
            is_active: s.is_active,
            _count: s._count,
            mastery: 0,
        }));

        return NextResponse.json({
            subjects: formattedSubjects,
            courseTitle: 'All Subjects'
        });
    } catch (error) {
        console.error("[DEBUG-SUBJECTS] MASTER ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }
}
