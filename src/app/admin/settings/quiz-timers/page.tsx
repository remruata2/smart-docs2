import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { QuizTimerForm } from "./quiz-timer-form";
import { getQuizTimerSettings } from "./actions";

export default async function QuizTimersSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin((session.user as any).role)) {
        redirect("/unauthorized");
    }

    const currentSettings = await getQuizTimerSettings();

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Quiz Timer Settings</h1>
                <p className="text-muted-foreground">
                    Configure time limits for different question types in student quizzes.
                    Timers will auto-submit answers when time expires.
                </p>
            </div>

            <QuizTimerForm initialSettings={currentSettings} />
        </div>
    );
}
