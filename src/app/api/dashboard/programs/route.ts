import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("board_id");
    const institutionId = searchParams.get("institution_id");

    if (!boardId) {
        return NextResponse.json(
            { error: "board_id is required" },
            { status: 400 }
        );
    }

    try {
        const where: any = {
            board_id: boardId,
            is_active: true,
        };

        // If institution_id is provided, filter by it
        // Otherwise, show board-level programs (institution_id = null)
        if (institutionId) {
            where.institution_id = BigInt(institutionId);
        } else {
            where.institution_id = null;
        }

        const programs = await prisma.program.findMany({
            where,
            orderBy: {
                name: "asc",
            },
        });

        // Convert BigInt to string for JSON serialization
        const serializedPrograms = programs.map((p) => ({
            ...p,
            institution_id: p.institution_id?.toString() || null,
        }));

        return NextResponse.json({ programs: serializedPrograms });
    } catch (error) {
        console.error("Error fetching programs:", error);
        return NextResponse.json(
            { error: "Failed to fetch programs" },
            { status: 500 }
        );
    }
}
