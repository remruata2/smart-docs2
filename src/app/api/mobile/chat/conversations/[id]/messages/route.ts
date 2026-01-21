import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const { id } = await params;
        const conversationId = parseInt(id);

        const body = await request.json();
        const { role, content, sources, tokenCount, metadata } = body;

        if (!role || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify conversation ownership
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                user_id: userId
            }
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        // Create message
        const message = await prisma.conversationMessage.create({
            data: {
                conversation_id: conversationId,
                role,
                content,
                sources: sources || null,
                token_count: tokenCount || null,
                metadata: metadata || null
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                last_message_at: new Date(),
                message_count: { increment: 1 },
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: {
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: message.created_at.toISOString()
            }
        });

    } catch (error) {
        console.error("[MOBILE MESSAGES] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
