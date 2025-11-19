import { NextRequest, NextResponse } from "next/server";
import { getFilesPaginated } from "@/app/app/files/actions";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const page = parseInt(searchParams.get("page") || "1");
	const pageSize = parseInt(searchParams.get("pageSize") || "50");
	const q = searchParams.get("q") || undefined;
	const category = searchParams.get("category") || undefined;
	const yearParam = searchParams.get("year");
	const year = yearParam ? parseInt(yearParam) : undefined;

	try {
		const result = await getFilesPaginated({
			page,
			pageSize,
			q,
			category,
			year,
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in GET /api/dashboard/files:", error);
		return NextResponse.json(
			{ error: "Failed to fetch files" },
			{ status: 500 }
		);
	}
}
