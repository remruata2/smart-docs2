"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

import { checkChapterAccess } from "@/lib/trial-access";

// ... imports

export async function getChaptersForSubject(subjectId: number) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		console.log("[getChaptersForSubject] No session user id");
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Fetch user profile
	const profile = await prisma.profile.findUnique({
		where: { user_id: userId },
	});

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
		},
		include: {
			course: {
				select: {
					id: true,
					is_free: true
				}
			}
		}
	});

	if (!enrollment) {
		console.log(`[getChaptersForSubject] No enrollment found for user ${userId} and subject ${subjectId}`);
		return null;
	}

	// Fetch subject details for return
	const subject = await prisma.subject.findUnique({
		where: { id: subjectId },
		include: { program: { include: { board: true } } }
	});

	if (!subject) {
		console.log(`[getChaptersForSubject] Subject ${subjectId} not found`);
		return null;
	}

	// Update last accessed time
	await prisma.userEnrollment.update({
		where: { id: enrollment.id },
		data: { last_accessed_at: new Date() }
	});

	// Fetch chapters for this subject
	const chaptersData = await prisma.chapter.findMany({
		where: {
			subject_id: subjectId,
			is_active: true,
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
				},
			},
		},
		orderBy: [{ chapter_number: "asc" }, { title: "asc" }],
	});

	// Calculate lock status for each chapter
	const chapters = await Promise.all(chaptersData.map(async (chapter) => {
		const access = await checkChapterAccess(userId, Number(chapter.id), prisma);
		return {
			...chapter,
			isLocked: !access.allowed
		};
	}));

	return {
		chapters,
		subjectInfo: {
			subject,
			program: subject.program,
			board: subject.program.board,
		},
		enrollment,
	};
}

export async function getChapterById(chapterId: string) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		console.log("[getChapterById] No session user id");
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Fetch user profile
	const profile = await prisma.profile.findUnique({
		where: { user_id: userId },
	});

	// Fetch chapter with subject and verify access
	const chapter = await prisma.chapter.findUnique({
		where: { id: BigInt(chapterId) },
		include: {
			subject: {
				include: {
					program: {
						include: {
							board: true
						}
					},
				},
			},
		},
	});

	if (!chapter) {
		console.log(`[getChapterById] Chapter ${chapterId} not found`);
		return null;
	}

	// Security check: ensure user is enrolled in a course that contains this subject
	const enrollment = await prisma.userEnrollment.findFirst({
		where: {
			user_id: userId,
			status: "active",
			course: {
				subjects: {
					some: { id: chapter.subject_id }
				}
			}
		}
	});

	if (!enrollment) {
		console.log(`[getChapterById] No enrollment found for user ${userId} and subject ${chapter.subject_id}`);
		return null;
	}

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
