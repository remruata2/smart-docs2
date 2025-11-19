import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * GET /api/dashboard/conversations/[id]
 * Get a specific conversation with all messages
 */
export async function GET(
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

        // Get conversation with messages
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                user_id: userId, // Ensure user owns this conversation
            },
            include: {
                messages: {
                    orderBy: {
                        created_at: "asc",
                    },
                    select: {
                        id: true,
                        role: true,
                        content: true,
                        sources: true,
                        token_count: true,
                        metadata: true,
                        created_at: true,
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        // Format response
        const formattedConversation = {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.created_at.toISOString(),
            updatedAt: conversation.updated_at.toISOString(),
            lastMessageAt: conversation.last_message_at?.toISOString() || null,
            messageCount: conversation.message_count,
            isPinned: conversation.is_pinned,
            isArchived: conversation.is_archived,
            messages: conversation.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                sources: msg.sources,
                tokenCount: msg.token_count,
                metadata: msg.metadata,
                timestamp: msg.created_at.toISOString(),
            })),
        };

        return NextResponse.json({
            success: true,
            conversation: formattedConversation,
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error getting conversation:", error);
        return NextResponse.json(
            { error: "Failed to get conversation" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/dashboard/conversations/[id]
 * Update conversation (title, pin, archive)
 * Body:
 *   - title: string (optional)
 *   - isPinned: boolean (optional)
 *   - isArchived: boolean (optional)
 */
export async function PATCH(
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

        // Verify ownership
        const existingConversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                user_id: userId,
            },
        });

        if (!existingConversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: any = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.isPinned !== undefined) updateData.is_pinned = body.isPinned;
        if (body.isArchived !== undefined) updateData.is_archived = body.isArchived;

        // Update conversation
        const updatedConversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: updateData,
        });

        console.log(`[CONVERSATIONS API] Updated conversation ${conversationId}`);

        return NextResponse.json({
            success: true,
            conversation: {
                id: updatedConversation.id,
                title: updatedConversation.title,
                isPinned: updatedConversation.is_pinned,
                isArchived: updatedConversation.is_archived,
                updatedAt: updatedConversation.updated_at.toISOString(),
            },
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error updating conversation:", error);
        return NextResponse.json(
            { error: "Failed to update conversation" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/dashboard/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(
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

        // Verify ownership before deleting
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

        // Delete conversation (messages will be cascade deleted)
        await prisma.conversation.delete({
            where: { id: conversationId },
        });

        console.log(`[CONVERSATIONS API] Deleted conversation ${conversationId}`);

        return NextResponse.json({
            success: true,
            message: "Conversation deleted",
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error deleting conversation:", error);
        return NextResponse.json(
            { error: "Failed to delete conversation" },
            { status: 500 }
        );
    }
}
