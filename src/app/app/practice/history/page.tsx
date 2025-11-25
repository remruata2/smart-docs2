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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => {
                        const percentage = Math.round((quiz.score / quiz.total_points) * 100);
                        const scoreColor = percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-yellow-600" : "text-red-600";
                        const bgColor = percentage >= 80 ? "bg-green-50" : percentage >= 60 ? "bg-yellow-50" : "bg-red-50";

                        return (
                            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base font-semibold text-gray-900 mb-1">
                                                {quiz.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <BookOpen className="w-4 h-4" />
                                                <span className="truncate">
                                                    {quiz.subject.name}
                                                    {quiz.chapter && ` • ${quiz.chapter.title}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`${bgColor} ${scoreColor} rounded-full px-3 py-1 text-sm font-bold`}>
                                            {percentage}%
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm mb-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Trophy className="w-4 h-4" />
                                            <span>{quiz.score} / {quiz.total_points} points</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {quiz.completed_at ? new Date(quiz.completed_at).toLocaleDateString() : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                    <Link href={`/app/practice/${quiz.id}/result`}>
                                        <Button variant="outline" className="w-full group">
                                            Review Quiz
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
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
