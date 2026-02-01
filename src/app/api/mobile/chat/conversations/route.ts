import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

// GET: List recent conversations
export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const conversations = await prisma.conversation.findMany({
            where: {
                user_id: userId,
                is_archived: false
            },
            take: 20,
            orderBy: { last_message_at: 'desc' },
            select: {
                id: true,
                title: true,
                updated_at: true,
                last_message_at: true,
                subject_id: true,
                chapter_id: true,
                subject: { select: { name: true } },
                chapter: { select: { title: true } },
                messages: {
                    take: 1,
                    orderBy: { created_at: 'desc' },
                    select: { content: true }
                }
            }
        });

        const formatted = conversations.map(c => ({
            id: c.id,
            title: c.title,
            subjectId: c.subject_id,
            chapterId: c.chapter_id?.toString(),
            subjectName: c.subject?.name,
            chapterTitle: c.chapter?.title,
            lastMessage: c.messages[0]?.content.substring(0, 60) + '...',
            updatedAt: c.updated_at,
            lastMessageAt: c.last_message_at
        }));

        return NextResponse.json({ conversations: formatted });

    } catch (error) {
        console.error("[MOBILE CONVERSATIONS] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Create new conversation
export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const body = await request.json();
        const { title, subjectId, chapterId } = body;

        if (!subjectId || !chapterId) {
            return NextResponse.json({ error: "Subject and Chapter required" }, { status: 400 });
        }

        const conversation = await prisma.conversation.create({
            data: {
                user_id: userId,
                title: title || "New AI Tutor",
                subject_id: Number(subjectId),
                chapter_id: BigInt(chapterId),
                last_message_at: new Date()
            }
        });

        return NextResponse.json({
            conversation: {
                ...conversation,
                id: conversation.id,
                chapter_id: conversation.chapter_id?.toString()
            }
        });

    } catch (error) {
        console.error("[MOBILE CONVERSATIONS] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
