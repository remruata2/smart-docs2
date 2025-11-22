import { QuizGenerator } from "@/components/practice/QuizGenerator";
import { Leaderboard } from "@/components/practice/Leaderboard";

export default function PracticePage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Practice & Exam Prep</h1>
                <p className="text-muted-foreground">
                    Generate AI-powered quizzes to test your knowledge and earn points.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <QuizGenerator />
                </div>
                <div className="lg:col-span-1">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}
