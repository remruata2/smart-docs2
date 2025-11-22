import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const boards = await prisma.board.findMany({
            where: {
                is_active: true,
            },
            include: {
                country: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ boards });
    } catch (error) {
        console.error("Error fetching boards:", error);
        return NextResponse.json(
            { error: "Failed to fetch boards" },
            { status: 500 }
        );
    }
}
