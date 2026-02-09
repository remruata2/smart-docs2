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

		// Extract courses and flatten subjects from enrollments
		const coursesMap = new Map();
		const allSubjectsWithCourse = data.enrollments.flatMap(e => {
			if (!coursesMap.has(e.course.id)) {
				coursesMap.set(e.course.id, {
					id: e.course.id,
					title: e.course.title
				});
			}
			return e.course.subjects.map(s => ({ ...s, courseId: e.course.id }));
		});

		const courses = Array.from(coursesMap.values());

		// De-duplicate subjects by ID and collect their courseIds
		const uniqueSubjectsMap = new Map();
		allSubjectsWithCourse.forEach(s => {
			if (!uniqueSubjectsMap.has(s.id)) {
				uniqueSubjectsMap.set(s.id, {
					id: s.id,
					name: s.name,
					program_id: s.program_id,
					courseIds: [s.courseId]
				});
			} else {
				const existing = uniqueSubjectsMap.get(s.id);
				if (!existing.courseIds.includes(s.courseId)) {
					existing.courseIds.push(s.courseId);
				}
			}
		});
		const subjects = Array.from(uniqueSubjectsMap.values());

		return NextResponse.json({
			subjects,
			courses,
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
