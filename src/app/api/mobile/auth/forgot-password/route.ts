import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import nodemailer from "nodemailer";

// Configure Hostinger SMTP transporter
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.SMTP_USER || "support@zirna.io",
        pass: process.env.SMTP_PASS || "",
    },
});

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
            user_metadata: {
                username: user.username,
                is_derived: false
            }
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

        // 3. Generate the recovery link (does NOT send email)
        console.log(`[FORGOT-PASSWORD] Generating recovery link...`);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: resolvedEmail,
            options: {
                redirectTo: 'zirnaio://auth/callback'
            }
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error("[FORGOT-PASSWORD] Failed to generate link:", linkError?.message);
            return NextResponse.json({ error: "Failed to generate reset link." }, { status: 500 });
        }

        const resetLink = linkData.properties.action_link;
        console.log(`[FORGOT-PASSWORD] Recovery link generated successfully.`);

        // 4. Send email ourselves via Nodemailer + Hostinger SMTP
        console.log(`[FORGOT-PASSWORD] Sending email via Hostinger SMTP to ${resolvedEmail}...`);

        const senderEmail = process.env.SMTP_USER || "support@zirna.io";

        const mailResult = await transporter.sendMail({
            from: `"Zirna Exam Prep" <${senderEmail}>`,
            to: resolvedEmail,
            subject: "Reset Your Password - Zirna",
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Zirna Exam Prep</h1>
                    </div>
                    <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                            We received a request to reset your password. Click the button below to set a new one:
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${resetLink}" 
                               style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; 
                                      padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                            If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <p style="color: #94a3b8; font-size: 12px;">
                            If the button doesn't work, copy and paste this link into your browser:<br/>
                            <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
                        </p>
                    </div>
                </div>
            `,
        });

        console.log(`[FORGOT-PASSWORD] Email sent! Message ID: ${mailResult.messageId}`);

        return NextResponse.json({
            success: true,
            message: "If an account exists, an email will be sent."
        });
    } catch (error: any) {
        console.error("[MOBILE FORGOT-PASSWORD] Unexpected error:", error?.message || error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
