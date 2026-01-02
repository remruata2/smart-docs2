import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Supabase Admin not initialized" }, { status: 500 });
        }
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. Parse Query Params
        const searchParams = request.nextUrl.searchParams;
        const lastPulledAt = parseInt(searchParams.get("last_pulled_at") || "0");
        // const schemaVersion = parseInt(searchParams.get("schema_version") || "1");
        // const migration = searchParams.get("migration");

        console.log(`[MOBILE SYNC] Pull request from ${user.email} since ${lastPulledAt}`);

        // 3. Fetch Changes
        // We need to fetch changes for: subjects, chapters, chapter_pages
        // Filter by accessible boards for the user (TODO: Get user's board from profile)
        // For now, we'll assume global access or 'CBSE'

        const timestamp = Date.now();
        const changes = {
            subjects: { created: [], updated: [], deleted: [] },
            chapters: { created: [], updated: [], deleted: [] },
        };

        // Fetch Subjects (assuming all subjects are visible for now, or filter by board if we had a relation)
        // Since we don't have a 'updated_at' on all tables in the schema provided in context, 
        // we might need to rely on created_at or add updated_at. 
        // Checking schema... Subject has created_at, updated_at? 
        // Let's assume standard timestamps exist. If not, we'll need to check schema.

        // Fetch Subjects (Subject only has created_at, not updated_at)
        const subjects = await prisma.subject.findMany({
            where: {
                created_at: { gt: new Date(lastPulledAt) }
            }
        });

        // Fetch Chapters (Chapter has both created_at and updated_at)
        // TODO: Filter by user's board
        const chapters = await prisma.chapter.findMany({
            where: {
                updated_at: { gt: new Date(lastPulledAt) }
            }
        });


        // Map to WatermelonDB format
        // Note: WatermelonDB expects 'created' for new records and 'updated' for modified.
        // Since we don't track soft deletes or have a separate log table yet, 
        // we'll treat everything as 'updated' (upsert) for simplicity in this V1, 
        // or 'created' if it's new. 
        // Actually, WatermelonDB pull protocol usually sends { created: [], updated: [], deleted: [] }
        // Distinguishing created vs updated requires knowing if the client has it.
        // A simpler approach for V1 is to put everything in 'updated' or 'created' based on created_at vs lastPulledAt.

        // Helper to categorize
        const categorize = (records: any[], target: any) => {
            records.forEach(r => {
                if (new Date(r.created_at).getTime() > lastPulledAt) {
                    target.created.push(r);
                } else {
                    target.updated.push(r);
                }
            });
        };

        categorize(subjects, changes.subjects);
        categorize(chapters, changes.chapters);

        return NextResponse.json({
            changes,
            timestamp,
        });

    } catch (error) {
        console.error("[MOBILE SYNC] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
