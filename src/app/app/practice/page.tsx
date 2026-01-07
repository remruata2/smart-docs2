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
    const initialSubjects = subjectsData?.enrollments.flatMap(e => e.course.subjects) || [];

    return (
        <div className="container max-w-4xl mx-auto py-8">
            <QuizGenerator initialSubjectId={subjectId} initialChapterId={chapterId} initialSubjects={initialSubjects} />
        </div>
    );
}
