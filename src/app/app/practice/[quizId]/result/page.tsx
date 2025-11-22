import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function QuizResultPage({ params }: { params: { quizId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/auth/signin");
    }
    const userId = parseInt(session.user.id as string);

    const quiz = await prisma.quiz.findUnique({
        where: { id: params.quizId },
        include: {
            questions: {
                orderBy: { id: 'asc' }
            }
        }
    });

    if (!quiz) {
        redirect("/app/practice");
    }

    if (quiz.user_id !== userId) {
        redirect("/app/practice");
    }

    if (quiz.status !== "COMPLETED") {
        redirect(`/app/practice/${params.quizId}`);
    }

    const percentage = Math.round((quiz.score / quiz.total_points) * 100);

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-6">
                <Link href="/app/practice">
                    <Button variant="ghost" className="pl-0">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Practice
                    </Button>
                </Link>
            </div>

            <Card className="mb-8 bg-primary/5 border-primary/20">
                <CardContent className="pt-6 text-center">
                    <h1 className="text-3xl font-bold mb-2">Quiz Results</h1>
                    <div className="text-5xl font-bold text-primary mb-2">
                        {quiz.score} <span className="text-2xl text-muted-foreground">/ {quiz.total_points}</span>
                    </div>
                    <Badge variant={percentage >= 70 ? "default" : "destructive"} className="text-lg px-4 py-1">
                        {percentage}% Score
                    </Badge>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {quiz.questions.map((q, idx) => (
                    <Card key={q.id} className={`border-l-4 ${q.is_correct ? "border-l-green-500" : "border-l-red-500"}`}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">
                                    <span className="mr-2 text-muted-foreground">{idx + 1}.</span>
                                    {q.question_text}
                                </CardTitle>
                                {q.is_correct ? (
                                    <CheckCircle2 className="text-green-500 h-6 w-6 flex-shrink-0" />
                                ) : (
                                    <XCircle className="text-red-500 h-6 w-6 flex-shrink-0" />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Your Answer</div>
                                    <div className={q.is_correct ? "text-green-700" : "text-red-700"}>
                                        {String(q.user_answer || "No answer")}
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <div className="text-xs font-semibold text-green-700 uppercase mb-1">Correct Answer</div>
                                    <div className="text-green-900 font-medium">
                                        {String(q.correct_answer)}
                                    </div>
                                </div>
                            </div>

                            {q.explanation && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="text-sm font-semibold mb-1">Explanation</div>
                                    <p className="text-sm text-muted-foreground">{q.explanation}</p>
                                </div>
                            )}

                            {q.feedback && (
                                <div className="mt-4 pt-4 border-t bg-blue-50 p-3 rounded-lg">
                                    <div className="text-sm font-semibold text-blue-800 mb-1">AI Feedback</div>
                                    <p className="text-sm text-blue-700">{q.feedback}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
