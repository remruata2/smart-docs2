import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * GET /api/dashboard/conversations
 * List all conversations for the current user
 * Query params:
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 *   - search: string (optional - search in titles)
 *   - pinned_only: boolean (optional)
 *   - archived: boolean (optional - include archived, default: false)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const search = searchParams.get("search");
        const pinnedOnly = searchParams.get("pinned_only") === "true";
        const includeArchived = searchParams.get("archived") === "true";

        // Build where clause
        const userId = parseInt((session.user as any).id, 10);
        const where: any = {
            user_id: userId,
        };

        if (!includeArchived) {
            where.is_archived = false;
        }

        if (pinnedOnly) {
            where.is_pinned = true;
        }

        if (search) {
            where.title = {
                contains: search,
                mode: "insensitive",
            };
        }

        // Get conversations
        const conversations = await prisma.conversation.findMany({
            where,
            select: {
                id: true,
                title: true,
                created_at: true,
                updated_at: true,
                last_message_at: true,
                message_count: true,
                is_pinned: true,
                is_archived: true,
                subject_id: true,
                chapter_id: true,
                subject: {
                    select: {
                        name: true,
                        courses: {
                            take: 1,
                            select: { title: true }
                        }
                    }
                },
                chapter: {
                    select: {
                        title: true,
                        chapter_number: true
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        created_at: "desc",
                    },
                    select: {
                        content: true,
                        role: true,
                    },
                },
            },
            orderBy: [
                { is_pinned: "desc" },
                { last_message_at: "desc" },
                { updated_at: "desc" },
            ],
            take: limit,
            skip: offset,
        });

        // Get total count for pagination
        const total = await prisma.conversation.count({ where });

        // Format response
        const formattedConversations = conversations.map((conv) => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.created_at.toISOString(),
            updatedAt: conv.updated_at.toISOString(),
            lastMessageAt: conv.last_message_at?.toISOString() || null,
            messageCount: conv.message_count,
            isPinned: conv.is_pinned,
            isArchived: conv.is_archived,
            subjectId: conv.subject_id,
            chapterId: conv.chapter_id?.toString(),
            subjectName: conv.subject?.name,
            chapterTitle: conv.chapter?.title,
            courseTitle: conv.subject?.courses[0]?.title,
            lastMessage:
                conv.messages[0]?.role === "assistant"
                    ? conv.messages[0].content.substring(0, 100) + "..."
                    : null,
        }));

        return NextResponse.json({
            success: true,
            conversations: formattedConversations,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error listing conversations:", error);
        return NextResponse.json(
            { error: "Failed to list conversations" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/dashboard/conversations
 * Create a new conversation
 * Body:
 *   - title: string (optional)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt((session.user as any).id, 10);
        const body = await request.json();
        const { title, subjectId, chapterId } = body;

        // Create conversation
        const conversation = await prisma.conversation.create({
            data: {
                user_id: userId,
                title: title || "New Conversation",
                // subject_id: subjectId ? parseInt(subjectId) : undefined,
                // chapter_id: chapterId ? BigInt(chapterId) : undefined,
            },
        });

        console.log(
            `[CONVERSATIONS API] Created conversation ${conversation.id} for user ${userId} (Subject: ${subjectId}, Chapter: ${chapterId})`
        );

        return NextResponse.json({
            success: true,
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.created_at.toISOString(),
                updatedAt: conversation.updated_at.toISOString(),
                messageCount: 0,
                isPinned: false,
                isArchived: false,
                // subjectId: conversation.subject_id,
                // chapterId: conversation.chapter_id?.toString(),
            },
        });
    } catch (error) {
        console.error("[CONVERSATIONS API] Error creating conversation:", error);
        return NextResponse.json(
            { error: "Failed to create conversation" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/dashboard/conversations
 * Delete all conversations for the current user
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt((session.user as any).id, 10);

        // Delete all conversations for this user (messages will be cascade deleted)
        const result = await prisma.conversation.deleteMany({
            where: {
                user_id: userId,
            },
        });

        console.log(
            `[CONVERSATIONS API] Deleted ${result.count} conversations for user ${userId}`
        );

        return NextResponse.json({
            success: true,
            message: `Deleted ${result.count} conversation${result.count !== 1 ? "s" : ""
                }`,
            deletedCount: result.count,
        });
    } catch (error) {
        console.error(
            "[CONVERSATIONS API] Error deleting all conversations:",
            error
        );
        return NextResponse.json(
            { error: "Failed to delete conversations" },
            { status: 500 }
        );
    }
}
