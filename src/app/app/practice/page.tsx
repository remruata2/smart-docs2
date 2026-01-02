import { QuizGenerator } from "@/components/practice/QuizGenerator";

export const dynamic = "force-dynamic";

export default async function PracticePage({
    searchParams
}: {
    searchParams: Promise<{ subjectId?: string; chapterId?: string }>;
}) {
    const { subjectId, chapterId } = await searchParams;

    return (
        <div className="container mx-auto py-4 md:py-8 px-4 max-w-4xl">
            <QuizGenerator initialSubjectId={subjectId} initialChapterId={chapterId} />
        </div>
    );
}
