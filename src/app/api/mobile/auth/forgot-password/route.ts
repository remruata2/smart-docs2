import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPasswordResetEmail } from "@/lib/email";

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
            return NextResponse.json({ success: true, message: "If an account exists, an email will be sent." });
        }

        const resolvedEmail = user.email;
        console.log(`[FORGOT-PASSWORD] Found Prisma user. Resolved Email: ${resolvedEmail}`);

        if (!resolvedEmail || resolvedEmail.endsWith('@aiexamprep.local')) {
            console.log(`[FORGOT-PASSWORD] Invalid or placeholder email address detected: ${resolvedEmail}`);
            return NextResponse.json({ error: "No valid email address associated with your account. Please contact support." }, { status: 400 });
        }

        // 2. Ensure they exist in Supabase Auth
        console.log(`[FORGOT-PASSWORD] Ensuring user exists in Supabase Auth: ${resolvedEmail}`);
        const dummyPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10) + "A1!";

        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: resolvedEmail,
            password: dummyPassword,
            email_confirm: true,
            user_metadata: { username: user.username, is_derived: false }
        });

        if (createError) {
            if (createError.message.includes('already been registered')) {
                console.log(`[FORGOT-PASSWORD] User already exists in Supabase Auth.`);
            } else {
                console.error("[FORGOT-PASSWORD] Error creating Supabase user:", createError.message);
            }
        } else {
            console.log(`[FORGOT-PASSWORD] Created placeholder user in Supabase Auth.`);
        }

        // 3. Generate the recovery link
        console.log(`[FORGOT-PASSWORD] Generating recovery link...`);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: resolvedEmail,
            options: { redirectTo: 'zirnaio://auth/callback' }
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error("[FORGOT-PASSWORD] Failed to generate link:", linkError?.message);
            return NextResponse.json({ error: "Failed to generate reset link." }, { status: 500 });
        }

        const resetLink = linkData.properties.action_link;
        console.log(`[FORGOT-PASSWORD] Recovery link generated successfully.`);

        // 4. Send email via Nodemailer
        console.log(`[FORGOT-PASSWORD] Sending email via Hostinger SMTP to ${resolvedEmail}...`);
        const messageId = await sendPasswordResetEmail(resolvedEmail, resetLink);
        console.log(`[FORGOT-PASSWORD] Email sent! Message ID: ${messageId}`);

        return NextResponse.json({
            success: true,
            message: "If an account exists, an email will be sent."
        });
    } catch (error: any) {
        console.error("[MOBILE FORGOT-PASSWORD] Unexpected error:", error?.message || error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
