import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getChaptersForSubject } from "@/app/app/chapters/actions";

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const searchParams = req.nextUrl.searchParams;
	const subjectId = searchParams.get("subjectId");

	if (!subjectId) {
		return NextResponse.json(
			{ error: "subjectId query parameter is required" },
			{ status: 400 }
		);
	}

	try {
		const subjectIdNum = parseInt(subjectId, 10);
		if (isNaN(subjectIdNum)) {
			return NextResponse.json({ error: "Invalid subjectId" }, { status: 400 });
		}

		const data = await getChaptersForSubject(subjectIdNum);

		if (!data) {
			return NextResponse.json(
				{ error: "Subject not found or no access" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			chapters: data.chapters.map((c) => ({
				id: c.id.toString(),
				title: c.title,
				chapter_number: c.chapter_number,
			})),
		});
	} catch (error) {
		console.error("GET /api/dashboard/chapters error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch chapters" },
			{ status: 500 }
		);
	}
}
