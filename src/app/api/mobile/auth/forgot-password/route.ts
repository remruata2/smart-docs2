import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    console.log("[FORGOT-PASSWORD] Initializing request...");
    try {
        const body = await request.json();
        const { identifier } = body;
        console.log(`[FORGOT-PASSWORD] Received identifier: ${identifier}`);

        if (!identifier) {
            console.log("[FORGOT-PASSWORD] Missing identifier inside body");
            return NextResponse.json({ error: "Email or username required" }, { status: 400 });
        }

        // 1. Find user in Prisma
        console.log(`[FORGOT-PASSWORD] Looking up user in Prisma database...`);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier },
                ]
            }
        });

        if (!user) {
            console.log(`[FORGOT-PASSWORD] User NOT FOUND in Prisma for identifier: ${identifier}`);
            // Return success anyway to prevent user enumeration
            return NextResponse.json({ success: true, message: "If an account exists, an email will be sent." });
        }

        const resolvedEmail = user.email;
        console.log(`[FORGOT-PASSWORD] Found Prisma user. Resolved Email: ${resolvedEmail}`);

        // If user doesn't have an email in our DB, we can't send a reset link
        if (!resolvedEmail || resolvedEmail.endsWith('@aiexamprep.local')) {
            console.log(`[FORGOT-PASSWORD] Invalid or placeholder email address detected: ${resolvedEmail}`);
            return NextResponse.json({ error: "No valid email address associated with your account. Please contact support." }, { status: 400 });
        }

        // 2. Ensure they exist in Supabase Auth before resetting
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

        if (createError) {
            if (createError.message.includes('already been registered')) {
                console.log(`[FORGOT-PASSWORD] User already exists in Supabase Auth. Proceeding to generate link...`);
            } else {
                console.error("[FORGOT-PASSWORD] Error creating Supabase user:", createError.message, createError);
                // Continue anyway, maybe they do exist
            }
        } else {
            console.log(`[FORGOT-PASSWORD] Successfully created placeholder user in Supabase Auth.`);
        }

        // 3. Trigger the reset email
        console.log(`[FORGOT-PASSWORD] Calling resetPasswordForEmail for ${resolvedEmail}...`);
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(resolvedEmail, {
            redirectTo: 'zirnaio://auth/callback'
        });

        if (resetError) {
            console.error("[FORGOT-PASSWORD] Supabase reset error:", resetError.message, resetError);
            return NextResponse.json({ error: "Failed to send reset email. Please try again later.", details: resetError.message }, { status: 500 });
        }

        console.log(`[FORGOT-PASSWORD] Successfully dispatched recovery email!`);

        return NextResponse.json({
            success: true,
            message: "If an account exists, an email will be sent."
        });
    } catch (error) {
        console.error("[MOBILE FORGOT-PASSWORD] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
