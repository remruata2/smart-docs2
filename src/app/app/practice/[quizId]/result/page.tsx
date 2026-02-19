import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default async function QuizResultPage({ params }: { params: Promise<{ quizId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }
    const userId = parseInt(session.user.id as string);
    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
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
        redirect(`/app/practice/${quizId}`);
    }

    const percentage = Math.round((quiz.score / quiz.total_points) * 100);
    const isPassing = percentage >= 70;

    // Calculate circular progress stroke
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="min-h-screen bg-gray-50/50 py-8">
            <div className="container mx-auto px-4 max-w-3xl">
                {/* Header / Navigation */}
                <div className="mb-8">
                    <Link href="/app/practice">
                        <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Practice
                        </Button>
                    </Link>
                </div>

                {/* Score Card */}
                <Card className="mb-10 border-none shadow-lg overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-full h-2 ${isPassing ? "bg-green-500" : "bg-orange-500"}`} />
                    <CardContent className="pt-12 pb-10 text-center relative z-10">
                        <div className="flex flex-col items-center justify-center">
                            {/* Circular Progress */}
                            <div className="relative w-40 h-40 mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        className="text-gray-100"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className={`transition-all duration-1000 ease-out ${isPassing ? "text-green-500" : "text-orange-500"}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${isPassing ? "text-green-600" : "text-orange-600"}`}>
                                        {percentage}%
                                    </span>
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {isPassing ? "Great Job!" : "Keep Practicing!"}
                            </h1>
                            <p className="text-gray-500 mb-6">
                                You scored <span className="font-semibold text-gray-900">{quiz.score}</span> out of <span className="font-semibold text-gray-900">{quiz.total_points}</span> points
                            </p>

                            <div className="flex gap-3">
                                {quiz.chapter_id && (
                                    <Link href={`/app/chapters/${quiz.chapter_id}`}>
                                        <Button variant="outline" className="min-w-[120px]">
                                            Review Notes
                                        </Button>
                                    </Link>
                                )}
                                <Link href="/app/practice">
                                    <Button className="min-w-[120px]">
                                        New Quiz
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions Review */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 px-1">Detailed Review</h2>
                    {quiz.questions.map((q, idx) => (
                        <Card key={q.id} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-200">
                            <div className={`h-1.5 w-full ${q.is_correct ? "bg-green-500" : "bg-red-500"}`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                                            {idx + 1}
                                        </span>
                                        <CardTitle className="text-lg font-medium leading-relaxed text-gray-900">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <span {...props} />,
                                                }}
                                            >
                                                {q.question_text}
                                            </ReactMarkdown>
                                        </CardTitle>
                                    </div>
                                    {q.is_correct ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 flex-shrink-0">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Correct
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 flex-shrink-0">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Incorrect
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-6">
                                {/* Answers Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border ${q.is_correct ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                                        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${q.is_correct ? "text-green-600" : "text-red-600"}`}>
                                            Your Answer
                                        </div>
                                        <div className={`font-medium ${q.is_correct ? "text-green-900" : "text-red-900"}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <span {...props} />,
                                                }}
                                            >
                                                {String(q.user_answer || "No answer provided")}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {!q.is_correct && (
                                        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                                            <div className="text-xs font-bold uppercase tracking-wider mb-2 text-green-600">
                                                Correct Answer
                                            </div>
                                            <div className="font-medium text-green-900">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{
                                                        p: ({ node, ...props }) => <span {...props} />,
                                                    }}
                                                >
                                                    {String(q.correct_answer)}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Explanation & Feedback */}
                                {(q.explanation || q.feedback) && (
                                    <div className="space-y-3 pt-2">
                                        {q.explanation && (
                                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed">
                                                <span className="font-semibold text-gray-900 block mb-1">Explanation:</span>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {q.explanation}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {q.feedback && (
                                            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 leading-relaxed border border-blue-100">
                                                <span className="font-semibold text-blue-900 block mb-1">AI Feedback:</span>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {q.feedback}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
