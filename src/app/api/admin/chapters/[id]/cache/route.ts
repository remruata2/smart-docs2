import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { clearChapterCache } from "@/lib/response-cache";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        const count = await clearChapterCache(parseInt(id));

        return NextResponse.json({
            success: true,
            entriesCleared: count,
            message: `Cleared ${count} cache entries for chapter ${id}`
        });
    } catch (error) {
        console.error("[CACHE API] Error clearing chapter cache:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
