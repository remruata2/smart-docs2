import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-SUBJECTS] Incoming request: ${request.url}`);

    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const enrolledOnly = searchParams.get("enrolledOnly") === "true";

        console.log(`[DEBUG-MOBILE-SUBJECTS] enrolledOnly: ${enrolledOnly}, courseId: ${courseId}`);

        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-SUBJECTS] Authenticated user: ${user.email} (ID: ${user.id})`);

        let subjects: any[] = [];
        let courseTitle = 'All Subjects';

        if (enrolledOnly) {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching subjects via user enrollments...`);
            // Direct query for subjects that have at least one enrollment for the user
            // either via a linked course or via the subject's program.
            subjects = await prisma.subject.findMany({
                where: {
                    is_active: true,
                    courses: {
                        some: {
                            enrollments: {
                                some: {
                                    user_id: Number(user.id),
                                    status: 'active'
                                }
                            }
                        }
                    }
                },
                include: {
                    _count: {
                        select: { chapters: true }
                    }
                }
            });
            courseTitle = 'Enrolled Subjects';
        } else if (courseId) {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching subjects for specific courseId: ${courseId}`);
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

            if (course) {
                subjects = course.subjects;
                courseTitle = course.title;
            } else {
                console.log(`[DEBUG-MOBILE-SUBJECTS] Course ${courseId} not found`);
            }
        } else {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching ALL active subjects...`);
            subjects = await prisma.subject.findMany({
                where: { is_active: true },
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { chapters: true }
                    }
                }
            });
        }

        console.log(`[DEBUG-MOBILE-SUBJECTS] Found ${subjects.length} subjects`);
        subjects.forEach(s => {
            console.log(`[DEBUG-MOBILE-SUBJECTS] - ${s.name} (ID: ${s.id})`);
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
            courseTitle: courseTitle
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-SUBJECTS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch subjects" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
