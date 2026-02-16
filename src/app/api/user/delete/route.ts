import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

        if (isNaN(userId)) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        // Start a transaction to ensure clean deletion
        await db.$transaction(async (tx) => {
            // 1. Delete associated data that doesn't cascade automatically
            // Handled by creator relation in Battle
            await tx.battle.deleteMany({
                where: { created_by: userId }
            });

            // Handled by TextbookCreator relation in Textbook
            await tx.textbook.deleteMany({
                where: { created_by: userId }
            });

            // 2. Delete the user (Prisma should handle cascading for other models)
            await tx.user.delete({
                where: { id: userId }
            });
        });

        return NextResponse.json({
            success: true,
            message: "Account and associated data deleted successfully"
        });

    } catch (error) {
        console.error("[DELETE_ACCOUNT_API] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete account. Please contact support." },
            { status: 500 }
        );
    }
}
