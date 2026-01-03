import { redirect } from "next/navigation";
import { getQuizHistory } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Trophy, BookOpen, ArrowRight } from "lucide-react";

export default async function QuizHistoryPage() {
    const quizzes = await getQuizHistory();

    if (!quizzes) {
        redirect("/login");
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    Quiz History
                </h1>
                <p className="text-lg text-muted-foreground">
                    Review your past quizzes and learn from your performance 📚
                </p>
            </div>

            {quizzes.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Trophy className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No quizzes yet
                        </h3>
                        <p className="text-gray-500 mb-6 text-center max-w-md">
                            Start practicing to build your quiz history and track your progress!
                        </p>
                        <Link href="/app/practice">
                            <Button>
                                Start New Quiz
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {quizzes.map((quiz) => {
                        const percentage = Math.round((quiz.score / quiz.total_points) * 100);
                        const scoreColor = percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-amber-600" : "text-red-600";
                        const bgColor = percentage >= 80 ? "bg-green-50 border-green-200" : percentage >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

                        return (
                            <Link key={quiz.id} href={`/app/practice/${quiz.id}/result`} className="block">
                                <Card className="hover:shadow-md transition-all hover:border-indigo-200 cursor-pointer mb-4">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            {/* Score Badge */}
                                            <div className={`w-16 h-16 rounded-xl ${bgColor} border flex flex-col items-center justify-center flex-shrink-0`}>
                                                <span className={`text-xl font-bold ${scoreColor}`}>{percentage}%</span>
                                            </div>

                                            {/* Quiz Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{quiz.title}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {quiz.subject.name}
                                                        {quiz.chapter && ` • ${quiz.chapter.title}`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 flex-shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <Trophy className="w-4 h-4" />
                                                    <span>{quiz.score}/{quiz.total_points}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{quiz.completed_at ? new Date(quiz.completed_at).toLocaleDateString() : "N/A"}</span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        </div>

                                        {/* Mobile Stats */}
                                        <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Trophy className="w-4 h-4" />
                                                <span>{quiz.score}/{quiz.total_points} points</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                <span>{quiz.completed_at ? new Date(quiz.completed_at).toLocaleDateString() : "N/A"}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 text-center">
                <Link href="/app/practice">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        Generate New Quiz
                    </Button>
                </Link>
            </div>
        </div>
    );
}
