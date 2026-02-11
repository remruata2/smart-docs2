"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

import { checkChapterAccess, getTrialAccess } from "@/lib/trial-access";

// ... imports

export async function getChaptersForSubject(subjectId: number) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return null;
	}

	const userId = parseInt(session.user.id as string);

	// Fetch chapters and minimal enrollment info in parallel
	const [chaptersData, enrollment] = await Promise.all([
		// Fetch chapters for this subject
		prisma.chapter.findMany({
			where: {
				subject_id: subjectId,
				is_active: true,
			},
			select: {
				id: true,
				title: true,
				chapter_number: true,
				quizzes_enabled: true,
				key_points: true,
				subject: {
					select: {
						id: true,
						name: true,
						quizzes_enabled: true,
						program: {
							select: {
								id: true,
								name: true,
								board: { select: { id: true, name: true } }
							}
						}
					}
				},
				_count: {
					select: { chunks: true }
				},
				study_materials: {
					select: {
						summary: true
					}
				}
			},
			orderBy: [{ chapter_number: "asc" }, { title: "asc" }],
		}),
		// Minimal enrollment lookup - just for trial status
		prisma.userEnrollment.findFirst({
			where: {
				user_id: userId,
				status: "active",
				course: { subjects: { some: { id: subjectId } } }
			},
			select: {
				id: true,
				is_paid: true,
				trial_ends_at: true,
				course: { select: { is_free: true } }
			}
		})
	]);

	// Fetch question counts grouping for all these chapters
	const chapterIds = chaptersData.map(c => c.id);
	const questionCounts = await prisma.question.groupBy({
		by: ['chapter_id', 'question_type'],
		where: {
			chapter_id: { in: chapterIds }
		},
		_count: {
			_all: true
		}
	});

	// Create a map for easy lookup
	// Map<chapterId, Record<QuestionType, number>>
	const questionsByChapter = new Map<string, Record<string, number>>();

	questionCounts.forEach(count => {
		const cId = count.chapter_id.toString();
		const type = count.question_type;
		const num = count._count._all;

		if (!questionsByChapter.has(cId)) {
			questionsByChapter.set(cId, {});
		}
		questionsByChapter.get(cId)![type] = num;
	});

	if (!enrollment || chaptersData.length === 0) {
		return { chapters: [], subjectInfo: null, enrollment: null };
	}

	// Calculate trial access status
	const accessResult = getTrialAccess(enrollment, enrollment.course);

	// Calculate lock status for each chapter
	const chapters = chaptersData.map((chapter) => {
		let isLocked = false;

		if (!accessResult.hasFullAccess) {
			if (accessResult.isTrialActive) {
				isLocked = (chapter.chapter_number || 1) > 1;
			} else {
				isLocked = true;
			}
		}

		return {
			...chapter,
			isLocked,
			question_counts: questionsByChapter.get(chapter.id.toString()) || {}
		};
	});

	// Update last_accessed in background (non-blocking)
	prisma.userEnrollment.update({
		where: { id: enrollment.id },
		data: { last_accessed_at: new Date() }
	}).catch(() => { });

	return {
		chapters,
		subjectInfo: chaptersData[0]?.subject ? {
			subject: chaptersData[0].subject,
			program: chaptersData[0].subject.program,
			board: chaptersData[0].subject.program.board,
		} : null,
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
			subject: true,
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
