import nodemailer from "nodemailer";

// ─── SMTP Transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || "support@zirna.io",
        pass: process.env.SMTP_PASS || "",
    },
});

const senderEmail = process.env.SMTP_USER || "support@zirna.io";
const senderName = "Zirna Exam Prep";

// ─── Base Layout ─────────────────────────────────────────────────────
function baseLayout(content: string): string {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #4f46e5; font-size: 28px; margin: 0; letter-spacing: -0.5px;">Zirna</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0 0;">AI Exam Prep</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            ${content}
        </div>
        <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Zirna. All rights reserved.
            </p>
        </div>
    </div>`;
}

function ctaButton(text: string, href: string): string {
    return `
    <div style="text-align: center; margin: 32px 0;">
        <a href="${href}" 
           style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; 
                  padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${text}
        </a>
    </div>`;
}

function fallbackLink(href: string): string {
    return `
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #94a3b8; font-size: 12px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${href}" style="color: #4f46e5; word-break: break-all;">${href}</a>
    </p>`;
}

// ─── Email Templates ─────────────────────────────────────────────────

export function passwordResetEmail(resetLink: string): string {
    return baseLayout(`
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new one:
        </p>
        ${ctaButton("Reset Password", resetLink)}
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
        </p>
        ${fallbackLink(resetLink)}
    `);
}

export function signupConfirmationEmail(confirmLink: string, username: string): string {
    return baseLayout(`
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Welcome to Zirna, ${username}! 🎉</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Thanks for signing up! Please confirm your email address to get started with your exam preparation journey.
        </p>
        ${ctaButton("Confirm Email", confirmLink)}
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            If you didn't create an account, you can safely ignore this email.
        </p>
        ${fallbackLink(confirmLink)}
    `);
}

export function passwordChangedEmail(username: string): string {
    return baseLayout(`
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Password Updated</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Hi ${username}, your password was successfully changed. If you did not make this change, please reset your password immediately or contact support.
        </p>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            — The Zirna Team
        </p>
    `);
}

// ─── Send Functions ──────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<string> {
    const result = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject: "Reset Your Password - Zirna",
        html: passwordResetEmail(resetLink),
    });
    return result.messageId;
}

export async function sendSignupConfirmationEmail(to: string, confirmLink: string, username: string): Promise<string> {
    const result = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject: "Confirm Your Email - Zirna",
        html: signupConfirmationEmail(confirmLink, username),
    });
    return result.messageId;
}

export async function sendPasswordChangedEmail(to: string, username: string): Promise<string> {
    const result = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject: "Your Password Has Been Changed - Zirna",
        html: passwordChangedEmail(username),
    });
    return result.messageId;
}
