import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/mobile/auth/lookup - Look up user email by username
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier } = body;

        if (!identifier) {
            return NextResponse.json({ error: "Identifier required" }, { status: 400 });
        }

        // Check if it's already an email
        if (identifier.includes('@')) {
            return NextResponse.json({ email: identifier });
        }

        // Look up user by username or name
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { name: identifier },
                    { email: identifier },
                ]
            },
            select: { email: true, username: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        // Return email or derived email for accounts without one
        const email = user.email || `${user.username}@aiexamprep.local`;
        return NextResponse.json({ email });
    } catch (error) {
        console.error("[MOBILE AUTH LOOKUP] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
