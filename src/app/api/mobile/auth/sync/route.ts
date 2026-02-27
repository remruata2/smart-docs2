import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { compare } from "bcryptjs";

// POST /api/mobile/auth/sync - Sync local user to Supabase Auth if needed
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier, password } = body;

        if (!identifier || !password) {
            return NextResponse.json({ error: "Identifier and password required" }, { status: 400 });
        }

        // 1. Find user in Prisma
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { name: identifier },
                    { email: identifier },
                ]
            }
        });

        const supabaseEmailFallback = identifier.includes('@') ? identifier : `${identifier}@aiexamprep.local`;
        let resolvedEmail = user?.email || supabaseEmailFallback;

        if (user) {
            // Case A: User exists in Prisma and has a password hash (Legacy/Migrated User)
            if (user.password_hash) {
                console.log(`[SYNC] Verifying legacy password for: ${user.email}`);
                const isPasswordValid = await compare(password, user.password_hash);
                if (!isPasswordValid) {
                    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
                }

                // Ensure they exist in Supabase Auth
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                const existingSupabaseUser = (users as any[] || []).find(u => u.email === resolvedEmail);

                if (listError || !existingSupabaseUser) {
                    console.log(`[SYNC] Creating user in Supabase for legacy user: ${resolvedEmail}`);
                    await supabaseAdmin.auth.admin.createUser({
                        email: resolvedEmail,
                        password: password,
                        email_confirm: true,
                        user_metadata: {
                            username: user.username,
                            is_derived: !user.email
                        }
                    });
                } else {
                    // Update password in Supabase to match Prisma
                    await supabaseAdmin.auth.admin.updateUserById(existingSupabaseUser.id, {
                        password: password
                    });
                }
            } else {
                // Case B: User exists in Prisma but has no password_hash (Native Supabase User)
                console.log(`[SYNC] Native Supabase user identified: ${user.email}`);
            }
        } else {
            // Case C: User NOT in Prisma yet (Webhook lag or identifier is email)
            console.log(`[SYNC] User not in Prisma, checking Supabase Auth directly: ${resolvedEmail}`);
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            const existingSupabaseUser = (users as any[] || []).find(u => u.email === resolvedEmail);

            if (listError || !existingSupabaseUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
        }

        return NextResponse.json({
            success: true,
            email: resolvedEmail
        });
    } catch (error) {
        console.error("[MOBILE AUTH SYNC] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
