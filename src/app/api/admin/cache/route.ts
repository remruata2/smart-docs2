import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { clearAllCache } from "@/lib/response-cache";

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const count = await clearAllCache();

        return NextResponse.json({
            success: true,
            entriesCleared: count,
            message: `Cleared ALL cache entries (${count})`
        });
    } catch (error) {
        console.error("[CACHE API] Error clearing all cache:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
