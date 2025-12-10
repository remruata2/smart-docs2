import { QuizGenerator } from "@/components/practice/QuizGenerator";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
    return (
        <div className="container mx-auto py-4 md:py-8 px-4 max-w-4xl">
            <QuizGenerator />
        </div>
    );
}
