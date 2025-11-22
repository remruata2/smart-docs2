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

    if (!boardId) {
        return NextResponse.json(
            { error: "board_id is required" },
            { status: 400 }
        );
    }

    try {
        const institutions = await prisma.institution.findMany({
            where: {
                board_id: boardId,
                is_active: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        const serializedInstitutions = institutions.map((inst) => ({
            ...inst,
            id: inst.id.toString(),
        }));

        return NextResponse.json({ institutions: serializedInstitutions });
    } catch (error) {
        console.error("Error fetching institutions:", error);
        return NextResponse.json(
            { error: "Failed to fetch institutions" },
            { status: 500 }
        );
    }
}
