import { QuizGenerator } from "@/components/practice/QuizGenerator";

export default function PracticePage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    Practice & Exam Prep
                </h1>
                <p className="text-lg text-muted-foreground">
                    Generate AI-powered quizzes to test your knowledge and earn points! 🎯
                </p>
            </div>

            <QuizGenerator />
        </div>
    );
}
