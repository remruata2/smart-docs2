import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";

// GET /api/admin/exams - List all exams for dropdowns
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") !== "false";
        const parentOnly = searchParams.get("parentOnly") === "true";

        const where: any = {};
        if (activeOnly) {
            where.is_active = true;
        }
        if (parentOnly) {
            where.parent_id = null;
        }

        const exams = await prisma.exam.findMany({
            where,
            orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                code: true,
                name: true,
                short_name: true,
                exam_type: true,
                parent_id: true,
                is_active: true,
            }
        });

        return NextResponse.json({ exams });
    } catch (error) {
        console.error("Error fetching exams:", error);
        return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
    }
}

// POST /api/admin/exams - Create a new exam (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { code, name, short_name, description, exam_type, parent_id, is_active, display_order } = body;

        if (!code || !name) {
            return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
        }

        // Normalize code
        const normalizedCode = code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        // Check uniqueness
        const existing = await prisma.exam.findUnique({ where: { code: normalizedCode } });
        if (existing) {
            return NextResponse.json({ error: "An exam with this code already exists" }, { status: 400 });
        }

        const exam = await prisma.exam.create({
            data: {
                code: normalizedCode,
                name,
                short_name: short_name || null,
                description: description || null,
                exam_type: exam_type || "board",
                parent_id: parent_id || null,
                is_active: is_active !== false,
                display_order: display_order || 0,
            }
        });

        return NextResponse.json({ exam }, { status: 201 });
    } catch (error) {
        console.error("Error creating exam:", error);
        return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
    }
}
