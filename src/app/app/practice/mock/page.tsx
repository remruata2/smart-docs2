import { QuizGenerator } from "@/components/practice/QuizGenerator";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MockTestPage({
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
            <div className="mb-6">
                <Link href="/app/practice">
                    <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Practice
                    </Button>
                </Link>
            </div>

            <QuizGenerator
                initialSubjectId={subjectId}
                initialChapterId={chapterId}
                initialSubjects={initialSubjects}
                initialCourses={initialCourses}
            />
        </div>
    );
}
