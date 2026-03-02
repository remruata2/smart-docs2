import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSignupConfirmationEmail } from "@/lib/email";

// POST /api/mobile/auth/signup-confirm - Send signup confirmation email via our own SMTP
export async function POST(request: NextRequest) {
    console.log("[SIGNUP-CONFIRM] Initializing request...");
    try {
        const body = await request.json();
        const { email, username } = body;
        console.log(`[SIGNUP-CONFIRM] Received email: ${email}, username: ${username}`);

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Generate the signup confirmation link via Supabase Admin
        console.log(`[SIGNUP-CONFIRM] Generating signup confirmation link...`);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            password: body.password || undefined,
            options: { redirectTo: 'zirnaio://auth/callback' }
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error("[SIGNUP-CONFIRM] Failed to generate link:", linkError?.message);
            return NextResponse.json({ error: "Failed to generate confirmation link." }, { status: 500 });
        }

        const confirmLink = linkData.properties.action_link;
        console.log(`[SIGNUP-CONFIRM] Confirmation link generated successfully.`);

        // Send email via Nodemailer
        console.log(`[SIGNUP-CONFIRM] Sending confirmation email to ${email}...`);
        const messageId = await sendSignupConfirmationEmail(email, confirmLink, username || "there");
        console.log(`[SIGNUP-CONFIRM] Email sent! Message ID: ${messageId}`);

        return NextResponse.json({
            success: true,
            message: "Confirmation email sent."
        });
    } catch (error: any) {
        console.error("[SIGNUP-CONFIRM] Unexpected error:", error?.message || error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
