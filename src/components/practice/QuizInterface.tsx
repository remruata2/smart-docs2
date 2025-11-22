"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { submitQuizAction } from "@/app/app/practice/actions";

interface Question {
    id: string;
    question_text: string;
    question_type: "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "SHORT_ANSWER" | "LONG_ANSWER";
    options?: any; // Json
    points: number;
}

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
}

export function QuizInterface({ quiz }: { quiz: Quiz }) {
    const router = useRouter();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const handleAnswerChange = (value: any) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: value
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        // Validate all questions answered? Or allow partial?
        // Let's warn if not all answered.
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < totalQuestions) {
            if (!confirm(`You have answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`)) {
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await submitQuizAction(quiz.id, answers);
            toast.success(`Quiz submitted! Score: ${result.score}/${result.totalPoints}`);
            router.push(`/app/practice/${quiz.id}/result`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit quiz. Please try again.");
            setSubmitting(false);
        }
    };

    const renderQuestionInput = () => {
        const q = currentQuestion;
        const answer = answers[q.id];

        switch (q.question_type) {
            case "MCQ":
            case "TRUE_FALSE":
                const options = Array.isArray(q.options) ? q.options : [];
                return (
                    <RadioGroup value={answer} onValueChange={handleAnswerChange} className="space-y-3">
                        {options.map((opt: string, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value={opt} id={`opt-${idx}`} />
                                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case "FILL_IN_BLANK":
                return (
                    <div className="space-y-2">
                        <Label>Your Answer</Label>
                        <Input
                            value={answer || ""}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Type the missing word(s)..."
                        />
                    </div>
                );

            case "SHORT_ANSWER":
            case "LONG_ANSWER":
                return (
                    <div className="space-y-2">
                        <Label>Your Answer</Label>
                        <Textarea
                            value={answer || ""}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Type your answer here..."
                            className="min-h-[150px]"
                        />
                    </div>
                );

            default:
                return <div>Unknown question type</div>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6 space-y-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">{quiz.title}</h1>
                    <span className="text-muted-foreground">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                    </span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <Card className="min-h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle className="text-xl font-medium leading-relaxed">
                        {currentQuestion.question_text}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                        Points: {currentQuestion.points}
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    {renderQuestionInput()}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0 || submitting}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>

                    {currentQuestionIndex === totalQuestions - 1 ? (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Submit Quiz
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={submitting}>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
