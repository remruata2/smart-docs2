
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function getMobileUser(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    console.log(`[DEBUG-AUTH] Auth header: ${authHeader ? (authHeader.substring(0, 15) + '...') : 'MISSING'}`);

    if (!authHeader?.startsWith("Bearer ")) {
        console.error("[DEBUG-AUTH] Error: Missing Bearer token");
        throw new Error("Missing Bearer token");
    }

    const token = authHeader.split(" ")[1];
    if (!supabaseAdmin) {
        console.error("[DEBUG-AUTH] Error: Supabase Admin not initialized");
        throw new Error("Supabase Admin not initialized");
    }

    console.log(`[DEBUG-AUTH] Validating token with Supabase...`);
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !supabaseUser || !supabaseUser.email) {
        console.error("[DEBUG-AUTH] Error: Invalid token or user mismatch", authError?.message);
        throw new Error("Invalid token");
    }

    console.log(`[DEBUG-AUTH] User authenticated in Supabase: ${supabaseUser.email}`);

    // Find Prisma user
    let dbUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: supabaseUser.email },
            ]
        }
    });

    if (!dbUser) {
        console.log(`[DEBUG-AUTH] User not found by email, trying username match...`);
        if (supabaseUser.email.endsWith("@aiexamprep.local")) {
            const username = supabaseUser.email.split("@")[0];
            dbUser = await prisma.user.findUnique({
                where: { username }
            });
        }
    }

    if (!dbUser) {
        console.error("[DEBUG-AUTH] Error: User not found in database for email", supabaseUser.email);
        throw new Error("User not found in database");
    }

    console.log(`[DEBUG-AUTH] Database user matched: ID ${dbUser.id}`);
    return dbUser;
}
