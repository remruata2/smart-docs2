import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all"; // all | paid | trial | free
    const status = searchParams.get("status") || "all"; // all | active | expired
    const courseId = searchParams.get("courseId") || "";
    const skip = (page - 1) * limit;

    try {
        const now = new Date();

        // Build filter conditions
        const where: any = {};

        // Search by username or email
        if (search) {
            where.user = {
                OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                ],
            };
        }

        // Filter by course
        if (courseId) {
            where.course_id = parseInt(courseId);
        }

        // Filter by enrollment type
        if (type === "paid") {
            where.is_paid = true;
        } else if (type === "trial") {
            where.is_paid = false;
            where.trial_ends_at = { not: null };
        } else if (type === "free") {
            where.is_paid = false;
            where.trial_ends_at = null;
        }

        // Filter by trial status
        if (status === "active") {
            where.status = "active";
        } else if (status === "expired") {
            where.OR = [
                { status: { not: "active" } },
                { trial_ends_at: { lt: now } },
            ];
        }

        const [enrollments, total, courses] = await Promise.all([
            prisma.userEnrollment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { enrolled_at: "desc" },
                include: {
                    user: { select: { id: true, username: true, email: true, name: true } },
                    course: { select: { id: true, title: true, is_free: true, price: true } },
                },
            }),
            prisma.userEnrollment.count({ where }),
            // For course filter dropdown
            prisma.course.findMany({
                where: { is_published: true },
                select: { id: true, title: true },
                orderBy: { title: "asc" },
            }),
        ]);

        // Serialize
        const serialized = enrollments.map((e) => ({
            ...e,
            enrolled_at: e.enrolled_at.toISOString(),
            last_accessed_at: e.last_accessed_at?.toISOString() || null,
            completed_at: e.completed_at?.toISOString() || null,
            trial_ends_at: e.trial_ends_at?.toISOString() || null,
            institution_id: e.institution_id?.toString() || null,
            course: {
                ...e.course,
                price: e.course.price?.toString() || null,
            },
            // Derive enrollment type
            enrollmentType: e.is_paid
                ? "paid"
                : e.trial_ends_at
                    ? new Date(e.trial_ends_at) > now
                        ? "trial"
                        : "trial_expired"
                    : "free",
        }));

        return NextResponse.json({
            enrollments: serialized,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            courses,
        });
    } catch (error) {
        console.error("Enrollments API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
