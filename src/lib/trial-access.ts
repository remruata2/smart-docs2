/**
 * Trial Access Control Utility
 * 
 * Manages access control for the 3-day trial feature on paid courses.
 * During trial, users get full access to textbook content but AI features
 * (Tutor, Mock Test, Battle Mode) are limited to the first chapter.
 */

import { UserEnrollment, Course } from "@/generated/prisma";

export type TrialStatus =
    | 'full_access'      // Paid course or is_paid=true
    | 'trial_active'     // Within trial period
    | 'trial_expired'    // Trial has ended
    | 'not_enrolled';    // User not enrolled

export interface AccessResult {
    status: TrialStatus;
    hasFullAccess: boolean;
    isTrialActive: boolean;
    trialDaysRemaining: number | null;
    trialEndsAt: Date | null;
}

export interface ChapterAccessResult extends AccessResult {
    canAccessAIFeatures: boolean;
    upgradeRequired: boolean;
}

/**
 * Calculate trial access status for an enrollment
 */
export function getTrialAccess(
    enrollment: Pick<UserEnrollment, 'is_paid' | 'trial_ends_at'> | null,
    course: Pick<Course, 'is_free'> | null
): AccessResult {
    // Not enrolled
    if (!enrollment || !course) {
        return {
            status: 'not_enrolled',
            hasFullAccess: false,
            isTrialActive: false,
            trialDaysRemaining: null,
            trialEndsAt: null,
        };
    }

    // Free course - full access
    if (course.is_free) {
        return {
            status: 'full_access',
            hasFullAccess: true,
            isTrialActive: false,
            trialDaysRemaining: null,
            trialEndsAt: null,
        };
    }

    // Paid course with payment confirmed
    if (enrollment.is_paid) {
        return {
            status: 'full_access',
            hasFullAccess: true,
            isTrialActive: false,
            trialDaysRemaining: null,
            trialEndsAt: null,
        };
    }

    // Check trial status
    const now = new Date();
    const trialEndsAt = enrollment.trial_ends_at ? new Date(enrollment.trial_ends_at) : null;

    if (!trialEndsAt) {
        // No trial set (shouldn't happen for paid courses, but handle gracefully)
        return {
            status: 'trial_expired',
            hasFullAccess: false,
            isTrialActive: false,
            trialDaysRemaining: null,
            trialEndsAt: null,
        };
    }

    if (now < trialEndsAt) {
        // Trial is active
        const msRemaining = trialEndsAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        return {
            status: 'trial_active',
            hasFullAccess: false,
            isTrialActive: true,
            trialDaysRemaining: daysRemaining,
            trialEndsAt,
        };
    }

    // Trial has expired
    return {
        status: 'trial_expired',
        hasFullAccess: false,
        isTrialActive: false,
        trialDaysRemaining: 0,
        trialEndsAt,
    };
}

/**
 * Check if user can access AI features for a specific chapter
 * During trial, only first chapter (chapter_number <= 1) is accessible for AI features
 */
export function getChapterAccess(
    enrollment: Pick<UserEnrollment, 'is_paid' | 'trial_ends_at'> | null,
    course: Pick<Course, 'is_free'> | null,
    chapterNumber: number
): ChapterAccessResult {
    const baseAccess = getTrialAccess(enrollment, course);

    // Full access users can access all chapters
    if (baseAccess.hasFullAccess) {
        return {
            ...baseAccess,
            canAccessAIFeatures: true,
            upgradeRequired: false,
        };
    }

    // Trial users can only access first chapter for AI features
    if (baseAccess.isTrialActive) {
        const isFirstChapter = chapterNumber <= 1;
        return {
            ...baseAccess,
            canAccessAIFeatures: isFirstChapter,
            upgradeRequired: !isFirstChapter,
        };
    }

    // Trial expired or not enrolled - no AI access
    return {
        ...baseAccess,
        canAccessAIFeatures: false,
        upgradeRequired: true,
    };
}

/**
 * Calculate trial end date (3 days from now)
 */
export function calculateTrialEndDate(): Date {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 3);
    return trialEnd;
}

/**
 * Format trial days remaining for display
 */
export function formatTrialRemaining(daysRemaining: number | null): string {
    if (daysRemaining === null) return '';
    if (daysRemaining <= 0) return 'Trial expired';
    if (daysRemaining === 1) return '1 day left in trial';
    return `${daysRemaining} days left in trial`;
}

/**
 * Check AI feature access from API routes
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function checkAIFeatureAccess(
    userId: number,
    chapterId: bigint | number | null,
    prisma: any
): Promise<{ allowed: boolean; reason?: string; trialDaysRemaining?: number }> {
    // If no chapter context, allow access (general chat)
    if (!chapterId) {
        return { allowed: true };
    }

    // Get chapter with course info
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        select: {
            chapter_number: true,
            subject: {
                select: {
                    courses: {
                        select: {
                            id: true,
                            is_free: true,
                        }
                    }
                }
            }
        }
    });

    if (!chapter) {
        return { allowed: true }; // Chapter not found, allow (will fail later anyway)
    }

    // Get the courses this chapter belongs to
    const courses = chapter.subject?.courses || [];

    // If no courses or all courses are free, allow access
    if (courses.length === 0 || courses.every((c: any) => c.is_free)) {
        return { allowed: true };
    }

    // Check user enrollment for each paid course
    for (const course of courses) {
        if (course.is_free) continue;

        const enrollment = await prisma.userEnrollment.findUnique({
            where: {
                user_id_course_id: {
                    user_id: userId,
                    course_id: course.id,
                }
            },
            select: {
                is_paid: true,
                trial_ends_at: true,
            }
        });

        if (!enrollment) {
            return {
                allowed: false,
                reason: 'You need to enroll in this course to access AI features.'
            };
        }

        const accessResult = getTrialAccess(enrollment, { is_free: false });

        // Full access (paid)
        if (accessResult.hasFullAccess) {
            return { allowed: true };
        }

        // Trial active - check chapter number
        if (accessResult.isTrialActive) {
            const chapterNum = chapter.chapter_number || 1;
            if (chapterNum <= 1) {
                return {
                    allowed: true,
                    trialDaysRemaining: accessResult.trialDaysRemaining || undefined
                };
            } else {
                return {
                    allowed: false,
                    reason: `AI features for Chapter ${chapterNum} require a paid subscription. During trial, only Chapter 1 is available.`,
                    trialDaysRemaining: accessResult.trialDaysRemaining || undefined
                };
            }
        }

        // Trial expired
        return {
            allowed: false,
            reason: 'Your trial has expired. Please upgrade to continue using AI features.',
        };
    }

    // Default allow if we somehow get here
    return { allowed: true };
}

/**
 * Check if user can access a specific chapter (all features including textbook content)
 * During trial, only Chapter 1 is accessible. All other chapters are completely locked.
 */
export async function checkChapterAccess(
    userId: number,
    chapterId: bigint | number,
    prisma: any
): Promise<{ allowed: boolean; reason?: string; trialDaysRemaining?: number }> {
    // Get chapter with course info
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        select: {
            chapter_number: true,
            subject: {
                select: {
                    courses: {
                        select: {
                            id: true,
                            is_free: true,
                        }
                    }
                }
            }
        }
    });

    if (!chapter) {
        return { allowed: false, reason: 'Chapter not found.' };
    }

    // Get the courses this chapter belongs to
    const courses = chapter.subject?.courses || [];

    // If no courses or all courses are free, allow access
    if (courses.length === 0 || courses.every((c: any) => c.is_free)) {
        return { allowed: true };
    }

    // Check user enrollment for each paid course
    for (const course of courses) {
        if (course.is_free) continue;

        const enrollment = await prisma.userEnrollment.findUnique({
            where: {
                user_id_course_id: {
                    user_id: userId,
                    course_id: course.id,
                }
            },
            select: {
                is_paid: true,
                trial_ends_at: true,
            }
        });

        if (!enrollment) {
            return {
                allowed: false,
                reason: 'You need to enroll in this course to access this chapter.'
            };
        }

        const accessResult = getTrialAccess(enrollment, { is_free: false });

        // Full access (paid)
        if (accessResult.hasFullAccess) {
            return { allowed: true };
        }

        // Trial active - check chapter number
        if (accessResult.isTrialActive) {
            const chapterNum = chapter.chapter_number || 1;
            if (chapterNum <= 1) {
                return {
                    allowed: true,
                    trialDaysRemaining: accessResult.trialDaysRemaining || undefined
                };
            } else {
                return {
                    allowed: false,
                    reason: `Chapter ${chapterNum} requires a paid subscription. During trial, only Chapter 1 is available.`,
                    trialDaysRemaining: accessResult.trialDaysRemaining || undefined
                };
            }
        }

        // Trial expired
        return {
            allowed: false,
            reason: 'Your trial has expired. Please upgrade to continue accessing this course.',
        };
    }

    // Default allow if we somehow get here
    return { allowed: true };
}
