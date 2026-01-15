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

        if (!user || !user.password_hash) {
            return NextResponse.json({ error: "User not found or no password set" }, { status: 404 });
        }

        // 2. Verify password locally
        const isPasswordValid = await compare(password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 3. Ensure user exists in Supabase
        const supabaseEmail = user.email || `${user.username}@aiexamprep.local`;

        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Supabase Admin not available" }, { status: 500 });
        }

        // Check if user exists in Supabase
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        const existingSupabaseUser = users.find(u => u.email === supabaseEmail);

        if (listError || !existingSupabaseUser) {
            console.log(`[SYNC] Creating user in Supabase for ${supabaseEmail}`);
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: supabaseEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    username: user.username,
                    is_derived: !user.email
                }
            });

            if (createError) {
                console.error("[SYNC] Error creating Supabase user:", createError);
                return NextResponse.json({ error: "Failed to sync user to auth provider" }, { status: 500 });
            }
        } else {
            // User exists, ensure password is in sync
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingSupabaseUser.id, {
                password: password
            });
            if (updateError) {
                console.warn("[SYNC] Failed to update Supabase password:", updateError.message);
            }
        }

        return NextResponse.json({
            success: true,
            email: supabaseEmail
        });
    } catch (error) {
        console.error("[MOBILE AUTH SYNC] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
