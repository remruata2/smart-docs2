import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify webhook secret
        const signature = request.headers.get("x-supabase-auth-signature");
        const expectedSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;

        // Note: For advanced verify we'd compute HMAC, but for now simple shared secret comparison.
        if (!signature || signature !== expectedSecret) {
            console.error("[SUPABASE WEBHOOK] Unauthorized request. Invalid signature.");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse payload
        const payload = await request.json();

        // Only process inserts into the auth.users table
        if (payload.type !== "INSERT" || payload.table !== "users") {
            return NextResponse.json({ success: true, message: "Ignored event type or table" });
        }

        const authUser = payload.record;
        if (!authUser || !authUser.email) {
            return NextResponse.json({ success: true, message: "No email found in record payload" });
        }

        // 3. Check and Create User in Prisma
        const email = authUser.email;
        const usernameBase = authUser.raw_user_meta_data?.username || email.split('@')[0];

        // First check by email to avoid duplicates
        let dbUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!dbUser) {
            console.log(`[SUPABASE WEBHOOK] Syncing new user: ${email}`);

            const isTeacher = email.includes('admin') || email.includes('teacher');

            try {
                await prisma.user.create({
                    data: {
                        email: email,
                        username: usernameBase,
                        role: isTeacher ? UserRole.instructor : UserRole.student,
                        is_active: true,
                        profile: {
                            create: {
                                is_premium: false
                            }
                        }
                    }
                });
                console.log(`[SUPABASE WEBHOOK] ✅ Successfully synced user: ${email} as ${usernameBase}`);
            } catch (err: any) {
                if (err.code === 'P2002') {
                    console.error(`[SUPABASE WEBHOOK] ❌ Collision error: Username "${usernameBase}" already exists. Sync skipped for ${email}.`);
                } else {
                    throw err;
                }
            }
        } else {
            console.log(`[SUPABASE WEBHOOK] User already synced: ${email}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[SUPABASE WEBHOOK] Error handling webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
