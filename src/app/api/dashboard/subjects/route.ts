import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const data = await getSubjectsForUserProgram();

		if (!data) {
			return NextResponse.json({ error: "No subjects found" }, { status: 404 });
		}

		// Flatten subjects from enrollments
		const subjects = data.enrollments.flatMap(e => e.course.subjects);

		return NextResponse.json({
			subjects: subjects.map((s) => ({
				id: s.id,
				name: s.name,
				program_id: s.program_id,
			})),
			boardId: data.programInfo?.board?.id || null,
		});
	} catch (error) {
		console.error("GET /api/dashboard/subjects error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch subjects" },
			{ status: 500 }
		);
	}
}
