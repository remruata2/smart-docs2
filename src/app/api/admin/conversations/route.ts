import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/conversations
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

		const userRole = (session.user as any).role;
		if (!isAdmin(userRole)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
 * POST /api/admin/conversations
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

		const userRole = (session.user as any).role;
		if (!isAdmin(userRole)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const userId = parseInt((session.user as any).id, 10);
		const body = await request.json();
		const { title } = body;

		// Create conversation
		const conversation = await prisma.conversation.create({
			data: {
				user_id: userId,
				title: title || "New Conversation",
			},
		});

		console.log(
			`[CONVERSATIONS API] Created conversation ${conversation.id} for user ${userId}`
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
