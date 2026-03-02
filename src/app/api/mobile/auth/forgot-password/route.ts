import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier } = body;

        if (!identifier) {
            return NextResponse.json({ error: "Email or username required" }, { status: 400 });
        }

        // 1. Find user in Prisma
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier },
                ]
            }
        });

        if (!user) {
            // Return success anyway to prevent user enumeration
            return NextResponse.json({ success: true, message: "If an account exists, an email will be sent." });
        }

        const resolvedEmail = user.email;

        // If user doesn't have an email in our DB, we can't send a reset link
        if (!resolvedEmail || resolvedEmail.endsWith('@aiexamprep.local')) {
            return NextResponse.json({ error: "No valid email address associated with your account. Please contact support." }, { status: 400 });
        }

        // 2. Ensure they exist in Supabase Auth before resetting
        // We do this for all valid Prisma users (even OAuth ones) so they can recover their account via email
        console.log(`[FORGOT-PASSWORD] Ensuring user exists in Supabase Auth: ${resolvedEmail}`);

        // Generate a secure random password since we only want to trigger a reset
        const dummyPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10) + "A1!";

        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: resolvedEmail,
            password: dummyPassword,
            email_confirm: true,
            user_metadata: {
                username: user.username,
                is_derived: false
            }
        });

        if (createError && !createError.message.includes('already been registered')) {
            console.error("[FORGOT-PASSWORD] Error creating Supabase user:", createError.message);
            // Continue anyway, maybe they do exist
        }

        // 3. Trigger the reset email using Admin API
        // This gives us more control and ensures it triggers even if we just created the user
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: resolvedEmail,
            options: {
                redirectTo: 'zirnaio://auth/callback'
            }
        });

        if (resetError) {
            console.error("[FORGOT-PASSWORD] Supabase reset error:", resetError.message);
            return NextResponse.json({ error: "Failed to generate reset link. Please try again later." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "If an account exists, an email will be sent."
        });
    } catch (error) {
        console.error("[MOBILE FORGOT-PASSWORD] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
