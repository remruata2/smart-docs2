import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { processChatMessageEnhancedStream, type ChatMessage } from "@/lib/ai-service-enhanced";
import { sanitizeAIInput, validateConversationHistory, type ConversationMessage } from "@/lib/input-sanitizer";

export async function POST(request: NextRequest) {
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
            console.error("[MOBILE CHAT] Invalid token", authError);
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });

        }

        // 2. Parse Body
        const body = await request.json();
        const { message, conversationHistory, boardId, subjectId, chapterId } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // 3. Sanitize Input
        const sanitizationResult = sanitizeAIInput(message, 6000);
        const sanitizedMessage = sanitizationResult.sanitized;

        // 4. Validate History
        let validHistory: any[] = [];
        if (conversationHistory) {
            const historyValidation = validateConversationHistory(conversationHistory, 50, 6000);
            if (historyValidation.valid && historyValidation.sanitized) {
                validHistory = historyValidation.sanitized;
            }
        }

        // 5. Process Chat (Streaming)
        console.log(`[MOBILE CHAT] User ${user.email} asked: ${sanitizedMessage}`);

        const encoder = new TextEncoder();
        const customReadable = new ReadableStream({
            async start(controller) {
                try {
                    const filters = {
                        boardId: boardId || 'CBSE', // Default to CBSE if not provided
                        subjectId: subjectId ? Number(subjectId) : undefined,
                        chapterId: chapterId ? Number(chapterId) : undefined,
                    };

                    for await (const chunk of processChatMessageEnhancedStream(
                        sanitizedMessage,
                        validHistory,
                        undefined,
                        true,
                        { provider: "gemini" },
                        filters
                    )) {
                        // Stream events: metadata, progress, token, sources, done
                        const data = JSON.stringify(chunk);
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }
                    controller.close();
                } catch (error) {
                    console.error("[MOBILE CHAT] Streaming error:", error);
                    const errorData = JSON.stringify({ type: "error", error: "Failed to process request" });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            },
        });

        return new NextResponse(customReadable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("[MOBILE CHAT] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
