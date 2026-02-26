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

        // Check if user already exists
        const dbUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username: usernameBase }
                ]
            }
        });

        if (!dbUser) {
            console.log(`[SUPABASE WEBHOOK] Syncing new user: ${email}`);
            const isTeacher = email.includes('admin') || email.includes('teacher');

            await prisma.user.create({
                data: {
                    email: email,
                    username: usernameBase + "_" + Math.floor(Math.random() * 10000), // Append random ID to ensure uniqueness
                    role: isTeacher ? UserRole.instructor : UserRole.student,
                    is_active: true,
                    profile: {
                        create: {
                            is_premium: false
                        }
                    }
                }
            });
            console.log(`[SUPABASE WEBHOOK] ✅ Successfully synced user: ${email}`);
        } else {
            console.log(`[SUPABASE WEBHOOK] User already synced: ${email}`);
            // If they exist by username but no email, update their email
            if (!dbUser.email) {
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { email: email }
                });
                console.log(`[SUPABASE WEBHOOK] 🔄 Updated missing email for user: ${dbUser.username}`);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[SUPABASE WEBHOOK] Error handling webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
