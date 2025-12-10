"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getChaptersForSubject(subjectId: number) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Fetch user profile to verify program access
	const profile = await prisma.profile.findUnique({
		where: { user_id: userId },
		include: {
			program: {
				include: {
					board: true,
				},
			},
		},
	});

	if (!profile?.program_id) {
		return null;
	}

	// Fetch subject and verify it belongs to user's program
	const subject = await prisma.subject.findUnique({
		where: { id: subjectId },
		include: {
			program: true,
		},
	});

	// Security check: ensure subject belongs to user's program
	if (!subject || subject.program_id !== profile.program_id) {
		return null;
	}

	// Fetch chapters for this subject
	// Board access logic:
	// 1. is_global: true (accessible to all boards)
	// 2. accessible_boards contains user's board_id
	// 3. If accessible_boards is empty AND is_global is false,
	//    check if subject's program's board matches user's board (implicit access)
	const userBoardId = profile.program?.board_id;
	const chapters = await prisma.chapter.findMany({
		where: {
			subject_id: subjectId,
			is_active: true,
			OR: [
				{ is_global: true },
				...(userBoardId ? [{ accessible_boards: { has: userBoardId } }] : []),
			],
		},
		include: {
			subject: {
				include: {
					program: {
						include: {
							board: true,
						},
					},
				},
			},
			_count: {
				select: {
					chunks: true,
					pages: true,
				},
			},
		},
		orderBy: [{ chapter_number: "asc" }, { title: "asc" }],
	});

	// Filter chapters that have implicit board access (empty accessible_boards but subject's board matches)
	// This handles legacy chapters or chapters where board wasn't explicitly set
	// userBoardId is already declared above
	const filteredChapters = chapters.filter((chapter) => {
		// Already matched by OR clause above
		if (chapter.is_global || (userBoardId && chapter.accessible_boards.includes(userBoardId))) {
			return true;
		}

		// Check implicit access: if accessible_boards is empty, check subject's program's board
		if (chapter.accessible_boards.length === 0 && !chapter.is_global && userBoardId) {
			return chapter.subject.program.board_id === userBoardId;
		}

		return false;
	});

	return {
		chapters: filteredChapters,
		subjectInfo: {
			subject,
			program: profile.program!,
			board: profile.program!.board,
		},
	};
}

export async function getChapterById(chapterId: string) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Fetch user profile
	const profile = await prisma.profile.findUnique({
		where: { user_id: userId },
		include: {
			program: {
				include: {
					board: true,
				},
			},
		},
	});

	if (!profile?.program_id) {
		return null;
	}

	// Fetch chapter with subject and verify access
	const chapter = await prisma.chapter.findUnique({
		where: { id: BigInt(chapterId) },
		include: {
			subject: {
				include: {
					program: true,
				},
			},
			pages: {
				orderBy: {
					page_number: "asc",
				},
			},
		},
	});

	// Security checks
	if (!chapter) {
		return null;
	}

	// Verify chapter's subject belongs to user's program
	if (chapter.subject.program_id !== profile.program_id) {
		return null;
	}

	// Verify board access
	// Check explicit access (is_global or in accessible_boards)
	// OR implicit access (empty accessible_boards but subject's board matches)
	const userBoardId = profile.program?.board_id;
	if (!userBoardId) {
		return null; // Cannot verify access without board_id
	}
	const hasExplicitAccess =
		chapter.is_global || chapter.accessible_boards.includes(userBoardId);

	const hasImplicitAccess =
		!hasExplicitAccess &&
		chapter.accessible_boards.length === 0 &&
		!chapter.is_global &&
		chapter.subject.program.board_id === userBoardId;

	if (!hasExplicitAccess && !hasImplicitAccess) {
		return null;
	}

	return {
		chapter,
		subjectInfo: {
			subject: chapter.subject,
			program: profile.program!,
			board: profile.program!.board,
		},
	};
}
