import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. Parse Changes
        const body = await request.json();
        const { changes } = body;

        if (!changes) {
            return NextResponse.json({ error: "Missing changes" }, { status: 400 });
        }

        console.log(`[MOBILE SYNC] Push request from ${user.email}`);

        // 3. Apply Changes
        // For now, we only allow syncing 'profile' changes or maybe 'user_progress' if we had it.
        // Content tables (subjects, chapters) are read-only for students.

        // Example: Handle Profile updates
        // if (changes.profiles) { ... }

        // Since we don't have writeable tables for students yet (except maybe profile),
        // we'll just acknowledge the push for now or log it.
        // In a real app, we would iterate through changes and apply them transactionally.

        // TODO: Implement write logic when we have user-writable tables (e.g. bookmarks, progress)

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error("[MOBILE SYNC] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
