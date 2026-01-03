import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Helper to serialize BigInt
function serializeBigInt(obj: any): any {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj === "bigint") return obj.toString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (typeof obj === "object") {
		const newObj: any = {};
		for (const key in obj) {
			newObj[key] = serializeBigInt(obj[key]);
		}
		return newObj;
	}
	return obj;
}

function parseUserId(rawId: unknown) {
	const parsed = Number(rawId);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}

export async function GET(request: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = parseUserId(session.user.id);
	if (!userId) {
		return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
	}

	try {
		const profile = await prisma.profile.findUnique({
			where: { user_id: userId },
		});

		// Get latest enrollment context
		const enrollment = await prisma.userEnrollment.findFirst({
			where: { user_id: userId, status: "active" },
			include: {
				program: {
					include: {
						board: true,
					},
				},
				institution: true,
			},
			orderBy: { last_accessed_at: "desc" }
		});

		return NextResponse.json({
			profile: serializeBigInt({
				...profile,
				program: enrollment?.program,
				institution: enrollment?.institution,
				program_id: enrollment?.program_id,
				institution_id: enrollment?.institution_id,
			})
		});
	} catch (error) {
		console.error("Error fetching profile:", error);
		return NextResponse.json(
			{ error: "Failed to fetch profile" },
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = parseUserId(session.user.id);
	if (!userId) {
		return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
	}

	try {
		// Just ensure profile exists. Program/Institution selection now handled via Enrollment.
		const profile = await prisma.profile.upsert({
			where: { user_id: userId },
			create: { user_id: userId },
			update: {}
		});

		return NextResponse.json({ profile: serializeBigInt(profile) });
	} catch (error) {
		console.error("Error updating profile:", error);
		return NextResponse.json(
			{ error: "Failed to update profile" },
			{ status: 500 }
		);
	}
}
