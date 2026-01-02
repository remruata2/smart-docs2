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

	// Security check: ensure user is enrolled in a course that contains this subject
	const enrollment = await prisma.userEnrollment.findFirst({
		where: {
			user_id: userId,
			status: "active",
			course: {
				subjects: {
					some: { id: subjectId }
				}
			}
		}
	});

	if (!enrollment) {
		return null;
	}

	// Fetch subject details for return
	const subject = await prisma.subject.findUnique({
		where: { id: subjectId },
		include: { program: { include: { board: true } } }
	});

	if (!subject) return null;

	// Update last accessed time
	await prisma.userEnrollment.update({
		where: { id: enrollment.id },
		data: { last_accessed_at: new Date() }
	});

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

/**
 * Fetches chapter data without user session checks.
 * STRICTLY for use with generateStaticParams / static generation.
 * This skips user-specific authorization!
 */
export async function getChapterData(chapterId: string) {
	const chapter = await prisma.chapter.findUnique({
		where: { id: BigInt(chapterId) },
		include: {
			subject: {
				include: {
					program: {
						include: {
							board: true
						}
					}
				},
			},
			pages: {
				orderBy: {
					page_number: "asc",
				},
			},
		},
	});

	if (!chapter) return null;

	return {
		chapter,
		subjectInfo: {
			subject: chapter.subject,
			program: chapter.subject.program,
			board: chapter.subject.program.board,
		},
	};
}

/**
 * Returns all active chapter IDs for static generation
 */
export async function getAllChapterIds() {
	const chapters = await prisma.chapter.findMany({
		where: { is_active: true },
		select: { id: true }
	});
	return chapters.map(c => ({ id: c.id.toString() }));
}

export async function getTextbookContent(textbookId: number) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Verify enrollment via any course that contains this textbook
	const enrollment = await prisma.userEnrollment.findFirst({
		where: {
			user_id: userId,
			status: "active",
			course: {
				subjects: {
					some: {
						textbooks: {
							some: { id: textbookId }
						}
					}
				}
			}
		},
		include: {
			course: true
		}
	});

	if (!enrollment) {
		return null; // Not enrolled in a course that has this textbook
	}

	const textbook = await prisma.textbook.findUnique({
		where: { id: textbookId },
		include: {
			units: {
				include: {
					chapters: {
						orderBy: { order: 'asc' }
					}
				},
				orderBy: { order: 'asc' }
			}
		}
	});

	if (!textbook) return null;

	// Update last accessed time
	await prisma.userEnrollment.update({
		where: { id: enrollment.id },
		data: { last_accessed_at: new Date() }
	});

	return {
		textbook,
		enrollment
	};
}

export async function updateEnrollmentProgress(enrollmentId: number, progress: number) {
	return await prisma.userEnrollment.update({
		where: { id: enrollmentId },
		data: { progress }
	});
}
