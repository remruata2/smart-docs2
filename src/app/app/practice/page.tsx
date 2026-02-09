import { QuizGenerator } from "@/components/practice/QuizGenerator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";

export const dynamic = "force-dynamic";

export default async function PracticePage({
    searchParams
}: {
    searchParams: Promise<{ subjectId?: string; chapterId?: string }>;
}) {
    const { subjectId, chapterId } = await searchParams;

    // Prefetch subjects without mastery for faster loading
    const subjectsData = await getSubjectsForUserProgram(undefined, false);

    const initialCourses = subjectsData?.enrollments.map(e => ({
        id: e.course.id,
        title: e.course.title
    })) || [];

    // Map subjects and include their course IDs
    const subjectMap = new Map();
    subjectsData?.enrollments.forEach(e => {
        e.course.subjects.forEach(s => {
            if (subjectMap.has(s.id)) {
                const existing = subjectMap.get(s.id);
                if (!existing.courseIds.includes(e.course.id)) {
                    existing.courseIds.push(e.course.id);
                }
            } else {
                subjectMap.set(s.id, {
                    ...s,
                    courseIds: [e.course.id]
                });
            }
        });
    });

    const initialSubjects = Array.from(subjectMap.values());

    return (
        <div className="container max-w-4xl mx-auto py-8">
            <QuizGenerator
                initialSubjectId={subjectId}
                initialChapterId={chapterId}
                initialSubjects={initialSubjects}
                initialCourses={initialCourses}
            />
        </div>
    );
}
