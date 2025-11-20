import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkUsageLimit } from "@/lib/usage-limits";
import { UsageType } from "@/generated/prisma";

export const runtime = "nodejs";

/**
 * GET endpoint to check usage limits
 * Query params: type (file_upload | chat_message | document_export)
 */
export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const typeParam = searchParams.get("type");

		if (!typeParam) {
			return NextResponse.json(
				{ error: "Type parameter is required" },
				{ status: 400 }
			);
		}

		// Map string to UsageType enum
		const usageTypeMap: Record<string, UsageType> = {
			file_upload: UsageType.file_upload,
			chat_message: UsageType.chat_message,
			document_export: UsageType.document_export,
			ai_processing: UsageType.ai_processing,
		};

		const usageType = usageTypeMap[typeParam];
		if (!usageType) {
			return NextResponse.json(
				{ error: "Invalid type parameter" },
				{ status: 400 }
			);
		}

		const userId = parseInt(session.user.id as string);
		const result = await checkUsageLimit(usageType, userId);

		return NextResponse.json({
			allowed: result.allowed,
			currentUsage: result.currentUsage || 0,
			limit: result.limit || 0,
			reason: result.reason,
		});
	} catch (error) {
		console.error("[USAGE-LIMITS-API] Error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

