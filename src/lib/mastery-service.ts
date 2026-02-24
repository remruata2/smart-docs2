import { prisma } from "@/lib/prisma";
import { calculateStreak } from "@/lib/streak-service";

export interface ChapterMastery {
    id: string;
    name: string;
    score: number; // readiness 0-100
    quizzesCompleted: number;
}

export interface SubjectMastery {
    id: number;
    name: string;
    score: number; // readiness 0-100
    syllabusCompletion: number;
    quizAverage: number;
    chapters: ChapterMastery[];
}

export interface CourseMastery {
    courseId: string;
    courseTitle: string;
    mastery: number; // readiness 0-100
    syllabusCompletion: number;
    quizAverage: number;
    subjects: SubjectMastery[];
}

export interface MasteryResult {
    metrics: {
        readinessScore: number;
        syllabusCompletion: number;
        quizAverage: number;
        currentStreak: number;
        totalChapters: number;
        completedChaptersCount: number;
        quizzesCompleted: number;
    };
    courseMasteryData: CourseMastery[];
    weaknessList: {
        id: string;
        title: string;
        subject: string;
        score: number;
    }[];
}

/**
 * Unified mastery calculation for Course → Subject → Chapter.
 * Formula: readiness = (quizAverage * 0.7) + (syllabusCompletion * 0.3)
 * This is used by both the web dashboard and the mobile dashboard API.
 */
export async function calculateUserMastery(userId: number): Promise<MasteryResult> {
    // 1. Fetch all required data in parallel
    const [enrollments, allQuizStats, currentStreak] = await Promise.all([
        // Enrollments with full course/subject/chapter structure
        prisma.userEnrollment.findMany({
            where: { user_id: userId, status: "active" },
            include: {
                course: {
                    include: {
                        subjects: {
                            where: { is_active: true, created_by_user_id: null }, // Official subjects only
                            include: {
                                chapters: {
                                    where: { is_active: true },
                                    select: { id: true, title: true }
                                }
                            }
                        }
                    }
                }
            }
        }),

        // All completed quizzes (lightweight)
        prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            select: {
                id: true,
                score: true,
                total_points: true,
                chapter_id: true,
                subject_id: true,
                subject: {
                    select: { created_by_user_id: true }
                }
            },
            orderBy: { completed_at: "desc" }
        }),

        // Streak via unified service
        calculateStreak(userId),
    ]);

    // 2. Build lookup maps from quiz data
    // Official quizzes exclude user custom notes
    const officialQuizzes = allQuizStats.filter(q => q.subject?.created_by_user_id === null);

    // Map: subjectId -> list of quizzes
    const quizzesBySubject = new Map<number, typeof officialQuizzes>();
    // Map: chapterId -> list of quizzes
    const quizzesByChapter = new Map<number, typeof officialQuizzes>();

    for (const q of officialQuizzes) {
        if (q.subject_id) {
            const arr = quizzesBySubject.get(q.subject_id) ?? [];
            arr.push(q);
            quizzesBySubject.set(q.subject_id, arr);
        }
        if (q.chapter_id) {
            const key = Number(q.chapter_id);
            const arr = quizzesByChapter.get(key) ?? [];
            arr.push(q);
            quizzesByChapter.set(key, arr);
        }
    }

    const officialCompletedChapterIds = new Set(
        officialQuizzes.map(q => q.chapter_id?.toString()).filter(Boolean)
    );

    // 3. Per-course calculations
    let globalTotalChapters = 0;
    let globalCompletedChapters = 0;

    const courseMasteryData: CourseMastery[] = enrollments.map(enrollment => {
        const course = enrollment.course;
        const courseSubjects = course.subjects;
        const courseSubjectIds = new Set(courseSubjects.map(s => s.id));
        const courseQuizzes = allQuizStats.filter(q => q.subject_id && courseSubjectIds.has(q.subject_id));

        let courseTotalChapters = 0;
        const courseCompletedChapterIds = new Set<string>();

        // Per-subject calculations
        const subjects: SubjectMastery[] = courseSubjects.map(subject => {
            const subjectQuizzes = quizzesBySubject.get(subject.id) ?? [];
            const subjectChapters = subject.chapters;

            const subTotalChapters = subjectChapters.length;
            courseTotalChapters += subTotalChapters;

            const subCompletedChapters = subjectChapters.filter(c =>
                officialCompletedChapterIds.has(c.id.toString())
            );
            subCompletedChapters.forEach(c => courseCompletedChapterIds.add(c.id.toString()));

            const subSyllabusCompletion = subTotalChapters > 0
                ? Math.round((subCompletedChapters.length / subTotalChapters) * 100)
                : 0;

            const subTotalScore = subjectQuizzes.reduce((acc, q) =>
                acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
            const subQuizAverage = subjectQuizzes.length > 0
                ? Math.round(subTotalScore / subjectQuizzes.length)
                : 0;

            const subReadiness = Math.round((subQuizAverage * 0.7) + (subSyllabusCompletion * 0.3));

            // Per-chapter calculations
            const chapters: ChapterMastery[] = subjectChapters.map(chapter => {
                const chapQuizzes = quizzesByChapter.get(Number(chapter.id)) ?? [];
                const chapTotalScore = chapQuizzes.reduce((acc, q) =>
                    acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
                const chapQuizAverage = chapQuizzes.length > 0
                    ? Math.round(chapTotalScore / chapQuizzes.length)
                    : 0;
                const isCompleted = officialCompletedChapterIds.has(chapter.id.toString());
                const chapReadiness = Math.round((chapQuizAverage * 0.7) + (isCompleted ? 30 : 0));

                return {
                    id: chapter.id.toString(),
                    name: chapter.title,
                    score: chapReadiness,
                    quizzesCompleted: chapQuizzes.length,
                };
            }).sort((a, b) => b.score - a.score);

            return {
                id: subject.id,
                name: subject.name,
                score: subReadiness,
                syllabusCompletion: subSyllabusCompletion,
                quizAverage: subQuizAverage,
                chapters,
            };
        });

        globalTotalChapters += courseTotalChapters;
        globalCompletedChapters = officialCompletedChapterIds.size; // global, not per-course for top metrics

        const courseSyllabusCompletion = courseTotalChapters > 0
            ? Math.round((courseCompletedChapterIds.size / courseTotalChapters) * 100)
            : 0;

        const courseTotalScore = courseQuizzes.reduce((acc, q) =>
            acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
        const courseQuizAverage = courseQuizzes.length > 0
            ? Math.round(courseTotalScore / courseQuizzes.length)
            : 0;

        const courseReadiness = Math.round((courseQuizAverage * 0.7) + (courseSyllabusCompletion * 0.3));

        return {
            courseId: course.id.toString(),
            courseTitle: course.title,
            mastery: courseReadiness,
            syllabusCompletion: courseSyllabusCompletion,
            quizAverage: courseQuizAverage,
            subjects,
        };
    });

    // 4. Global metrics (across all enrollments)
    const globalTotalScore = allQuizStats.reduce((acc, q) =>
        acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
    const globalQuizAverage = allQuizStats.length > 0
        ? Math.round(globalTotalScore / allQuizStats.length)
        : 0;
    const globalSyllabusCompletion = globalTotalChapters > 0
        ? Math.round((officialCompletedChapterIds.size / globalTotalChapters) * 100)
        : 0;
    const globalReadiness = Math.round((globalQuizAverage * 0.7) + (globalSyllabusCompletion * 0.3));

    // 5. Weakness list (chapters under 60%)
    const chapterPerformance = new Map<string, { total: number; count: number; chapterId: number }>();
    allQuizStats.forEach(q => {
        if (!q.chapter_id || q.total_points <= 0) return;
        const key = q.chapter_id.toString();
        const current = chapterPerformance.get(key) ?? { total: 0, count: 0, chapterId: Number(q.chapter_id) };
        chapterPerformance.set(key, {
            ...current,
            total: current.total + (q.score / q.total_points) * 100,
            count: current.count + 1,
        });
    });

    const weakCandidates = Array.from(chapterPerformance.entries())
        .map(([id, data]) => ({ id, chapterId: data.chapterId, score: Math.round(data.total / data.count) }))
        .filter(w => w.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);

    let weaknessList: MasteryResult["weaknessList"] = [];
    if (weakCandidates.length > 0) {
        const details = await prisma.chapter.findMany({
            where: { id: { in: weakCandidates.map(w => w.chapterId) } },
            select: { id: true, title: true, subject: { select: { name: true } } }
        });
        weaknessList = weakCandidates.map(w => {
            const d = details.find(x => Number(x.id) === w.chapterId);
            return { id: w.id, title: d?.title ?? "Unknown Chapter", subject: d?.subject?.name ?? "Unknown Subject", score: w.score };
        });
    }

    return {
        metrics: {
            readinessScore: globalReadiness,
            syllabusCompletion: globalSyllabusCompletion,
            quizAverage: globalQuizAverage,
            currentStreak,
            totalChapters: globalTotalChapters,
            completedChaptersCount: officialCompletedChapterIds.size,
            quizzesCompleted: allQuizStats.length,
        },
        courseMasteryData,
        weaknessList,
    };
}
