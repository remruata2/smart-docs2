import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Bearer Token from Supabase
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error("[MOBILE AUTH] Invalid token:", authError);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. Sync User to Local DB (Profile)
        // We use the Supabase User ID as the unique identifier
        // Check if profile exists, if not create it
        let profile = await prisma.profile.findUnique({
            where: { email: user.email },
        });

        if (!profile && user.email) {
            console.log(`[MOBILE AUTH] Creating new profile for ${user.email}`);
            // Create new profile
            profile = await prisma.profile.create({
                data: {
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split("@")[0],
                    role: "student", // Default role
                    // Link to Supabase ID if we had a field for it, currently using email as link
                    // In a real production app, we should add supabase_id to Profile model
                },
            });
        }

        // 3. Return User Data & Permissions
        return NextResponse.json({
            success: true,
            user: {
                id: profile?.id,
                email: profile?.email,
                full_name: profile?.full_name,
                role: profile?.role,
                supabase_id: user.id,
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
