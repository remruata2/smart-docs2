import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * POST /api/dashboard/conversations/[id]/messages
 * Add a message to a conversation
 * Body:
 *   - role: 'user' | 'assistant'
 *   - content: string
 *   - sources: array (optional, for assistant messages)
 *   - tokenCount: object (optional, for assistant messages)
 *   - metadata: object (optional)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt((session.user as any).id, 10);
        const conversationId = parseInt(id);
        const body = await request.json();

        // Validate required fields
        if (!body.role || !body.content) {
            return NextResponse.json(
                { error: "Missing required fields: role, content" },
                { status: 400 }
            );
        }

        if (!["user", "assistant"].includes(body.role)) {
            return NextResponse.json(
                { error: "Invalid role. Must be 'user' or 'assistant'" },
                { status: 400 }
            );
        }

        // Verify conversation exists and user owns it
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                user_id: userId,
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        // Create message and update conversation in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the message
            const message = await tx.conversationMessage.create({
                data: {
                    conversation_id: conversationId,
                    role: body.role,
                    content: body.content,
                    sources: body.sources || null,
                    token_count: body.tokenCount || null,
                    metadata: body.metadata || null,
                },
            });

            // Update conversation metadata
            await tx.conversation.update({
                where: { id: conversationId },
                data: {
                    last_message_at: new Date(),
                    message_count: {
                        increment: 1,
                    },
                    updated_at: new Date(),
                },
            });

            return message;
        });

        console.log(
            `[CONVERSATIONS API] Added ${body.role} message to conversation ${conversationId}`
        );

        return NextResponse.json({
            success: true,
            message: {
                id: result.id,
                role: result.role,
                content: result.content,
                sources: result.sources,
                tokenCount: result.token_count,
                metadata: result.metadata,
                timestamp: result.created_at.toISOString(),
            },
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error adding message:", error);
        return NextResponse.json(
            { error: "Failed to add message" },
            { status: 500 }
        );
    }
}
