import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Bearer Token from Supabase
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Supabase Admin not initialized" }, { status: 500 });
        }
        const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !supabaseUser || !supabaseUser.email) {
            console.error("[MOBILE AUTH] Invalid token:", authError);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. Sync User to Local DB
        let dbUser = null;
        const email = supabaseUser.email;

        // If it's a derived email, look up by username
        if (email.endsWith("@aiexamprep.local")) {
            const username = email.split("@")[0];
            dbUser = await prisma.user.findUnique({
                where: { username },
                include: { profile: true }
            });
        } else {
            // Otherwise look up by email
            dbUser = await prisma.user.findUnique({
                where: { email },
                include: { profile: true }
            });
        }

        if (!dbUser) {
            console.log(`[MOBILE AUTH] Creating new user for ${supabaseUser.email}`);
            // Create new user
            try {
                dbUser = await prisma.user.create({
                    data: {
                        email: supabaseUser.email,
                        username: supabaseUser.email.split("@")[0] + "_" + Math.floor(Math.random() * 10000), // Ensure uniqueness
                        role: UserRole.student,
                        is_active: true,
                        profile: {
                            create: {
                                is_premium: false
                            }
                        }
                    },
                    include: { profile: true }
                });
            } catch (e) {
                // Handle potential username collision by retrying or just failing
                console.error("Error creating user:", e);
                return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });
            }
        } else if (!dbUser.profile) {
            // User exists but no profile, create it
            await prisma.profile.create({
                data: {
                    user_id: dbUser.id,
                    is_premium: false
                }
            });
            // Refetch to get profile
            dbUser = await prisma.user.findUniqueOrThrow({
                where: { id: dbUser.id },
                include: { profile: true }
            });
        }

        // 3. Return User Data & Permissions
        if (!dbUser) {
            return NextResponse.json({ error: "Failed to retrieve user" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: dbUser.profile?.id, // Mobile app expects profile ID as user ID likely? Or maybe user.id?
                // Based on previous code: id: profile?.id. So it wants profile ID.
                // But wait, previous code had: user_id: user.id (Supabase ID).
                // Let's return both to be safe, or stick to what was there.
                // Previous: id: profile?.id, email: profile?.email (wrong), full_name: profile?.full_name (wrong)

                // Let's map correctly:
                profile_id: dbUser.profile?.id,
                user_id: dbUser.id,
                email: dbUser.email,
                username: dbUser.username,
                role: dbUser.role,
                supabase_id: supabaseUser.id,
            },
            sync_compatibility: {
                min_version: 1,
                current_version: 1,
            }
        });

    } catch (error) {
        console.error("[MOBILE AUTH] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
