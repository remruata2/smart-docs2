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
			include: {
				program: {
					include: {
						board: true,
					},
				},
				institution: true,
			},
		});

		return NextResponse.json({ profile: serializeBigInt(profile) });
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
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const body = await request.json();
		const { program_id, institution_id } = body;

		if (!program_id) {
			return NextResponse.json(
				{ error: "program_id is required" },
				{ status: 400 }
			);
		}

		// Check if profile exists
		const existingProfile = await prisma.profile.findUnique({
			where: { user_id: userId },
		});

		const parsedProgramId = Number(program_id);
		if (!Number.isInteger(parsedProgramId)) {
			return NextResponse.json(
				{ error: "program_id must be an integer" },
				{ status: 400 }
			);
		}

		const parsedInstitutionId =
			institution_id === undefined || institution_id === null
				? null
				: BigInt(institution_id);

		let profile;
		if (existingProfile) {
			// Update existing profile
			profile = await prisma.profile.update({
				where: { user_id: userId },
				data: {
					program_id: parsedProgramId,
					institution_id: parsedInstitutionId,
				},
				include: {
					program: {
						include: {
							board: true,
						},
					},
					institution: true,
				},
			});
		} else {
			// Create new profile
			profile = await prisma.profile.create({
				data: {
					user_id: userId,
					program_id: parsedProgramId,
					institution_id: parsedInstitutionId,
				},
				include: {
					program: {
						include: {
							board: true,
						},
					},
					institution: true,
				},
			});
		}

		return NextResponse.json({ profile: serializeBigInt(profile) });
	} catch (error) {
		console.error("Error updating profile:", error);
		return NextResponse.json(
			{ error: "Failed to update profile" },
			{ status: 500 }
		);
	}
}
