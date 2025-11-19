import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { getGeminiClient } from "@/lib/ai-key-store";

/**
 * POST /api/dashboard/conversations/[id]/generate-title
 * Generate an AI title for a conversation based on its messages
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

        // Get conversation with first few messages
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                user_id: userId,
            },
            include: {
                messages: {
                    take: 4, // First 2 exchanges
                    orderBy: {
                        created_at: "asc",
                    },
                    select: {
                        role: true,
                        content: true,
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

        if (conversation.messages.length === 0) {
            return NextResponse.json(
                { error: "Conversation has no messages" },
                { status: 400 }
            );
        }

        // Build context from messages
        const messageContext = conversation.messages
            .map((msg: any) => {
                const truncatedContent =
                    msg.content.length > 200
                        ? msg.content.substring(0, 200) + "..."
                        : msg.content;
                return `${msg.role === "user" ? "User" : "Assistant"
                    }: ${truncatedContent}`;
            })
            .join("\n\n");

        // Generate title using AI
        const prompt = `Based on this conversation, generate a short, descriptive title (max 50 characters, no quotes):

${messageContext}

Title (concise, descriptive, no quotes):`;

        try {
            const { client } = await getGeminiClient({ provider: "gemini" });
            const model = client.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let title = response.text().trim();

            // Clean up the title
            title = title.replace(/^["']|["']$/g, ""); // Remove quotes
            title = title.replace(/^Title:\s*/i, ""); // Remove "Title:" prefix
            title = title.substring(0, 50); // Limit to 50 chars

            // Update conversation with generated title
            const updatedConversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: { title },
            });

            console.log(
                `[CONVERSATIONS API] Generated title for conversation ${conversationId}: "${title}"`
            );

            return NextResponse.json({
                success: true,
                title: updatedConversation.title,
            });
        } catch (aiError) {
            console.error(
                "[CONVERSATIONS API] Error generating title with AI:",
                aiError
            );
            // Fallback: use first user message as title
            const firstUserMessage = conversation.messages.find(
                (m: any) => m.role === "user"
            );
            if (firstUserMessage) {
                const fallbackTitle = firstUserMessage.content.substring(0, 50).trim();
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { title: fallbackTitle },
                });
                return NextResponse.json({
                    success: true,
                    title: fallbackTitle,
                    fallback: true,
                });
            }

            throw aiError;
        }
    } catch (error) {
        console.error("[CONVERSATIONS API] Error generating title:", error);
        return NextResponse.json(
            { error: "Failed to generate title" },
            { status: 500 }
        );
    }
}
