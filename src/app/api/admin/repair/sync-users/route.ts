import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { UserRole } from "@/generated/prisma";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Ensure only admins can trigger this repair script
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Supabase Admin client not configured" }, { status: 500 });
        }

        console.log("[SYNC-USERS] Starting one-time synchronization of users from Supabase to Prisma...");

        // Fetch all users from Supabase Auth
        // Using a high limit to get all typical users. For very large DBs, pagination would be needed.
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000
        });

        if (error) {
            console.error("[SYNC-USERS] Failed to fetch users from Supabase:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const stats = { total: users.length, synced: 0, skipped: 0, errors: 0 };

        for (const authUser of users) {
            const email = authUser.email;
            if (!email) {
                stats.skipped++;
                continue;
            }

            const usernameBase = authUser.user_metadata?.username || email.split('@')[0];

            // Check if user exists in Prisma
            const dbUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { username: usernameBase }
                    ]
                }
            });

            if (!dbUser) {
                try {
                    const isTeacher = email.includes('admin') || email.includes('teacher');

                    await prisma.user.create({
                        data: {
                            email: email,
                            username: usernameBase + "_" + Math.floor(Math.random() * 10000), // Append random string to ensure unique constraint
                            role: isTeacher ? UserRole.instructor : UserRole.student,
                            is_active: true,
                            profile: {
                                create: {
                                    is_premium: false
                                }
                            }
                        }
                    });
                    console.log(`[SYNC-USERS] ✅ Synced missing user: ${email}`);
                    stats.synced++;
                } catch (e) {
                    console.error(`[SYNC-USERS] ❌ Error syncing user ${email}:`, e);
                    stats.errors++;
                }
            } else {
                // User already exists, but ensure their email is attached if somehow missing
                if (!dbUser.email) {
                    try {
                        await prisma.user.update({
                            where: { id: dbUser.id },
                            data: { email: email }
                        });
                        console.log(`[SYNC-USERS] 🔄 Updated missing email for user: ${dbUser.username}`);
                        stats.synced++;
                    } catch (e) {
                        console.error(`[SYNC-USERS] ❌ Error updating email for ${dbUser.username}:`, e);
                        stats.errors++;
                    }
                } else {
                    stats.skipped++;
                }
            }
        }

        console.log(`[SYNC-USERS] Sync complete. Stats:`, stats);
        return NextResponse.json({ success: true, stats });

    } catch (error) {
        console.error("[SYNC-USERS] Internal server error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
