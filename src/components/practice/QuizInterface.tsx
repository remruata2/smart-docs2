"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, Menu, X } from "lucide-react";
import { submitQuizAction } from "@/app/app/practice/actions";
import { QuestionTimer } from "./QuestionTimer";
import { QuestionCard } from "./QuestionCard";
import { QuizNavigation } from "./QuizNavigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

type TimerLimits = {
    MCQ: number;
    TRUE_FALSE: number;
    FILL_IN_BLANK: number;
    SHORT_ANSWER: number;
    LONG_ANSWER: number;
};

export function QuizInterface({ quiz }: { quiz: Quiz }) {
    const router = useRouter();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [timerLimits, setTimerLimits] = useState<TimerLimits | null>(null);
    const [timerKey, setTimerKey] = useState(0); // Force timer reset
    const [showNavigation, setShowNavigation] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const answeredQuestions = new Set(
        quiz.questions.map((q, idx) => answers[q.id] !== undefined ? idx : -1).filter(idx => idx !== -1)
    );

    // Fetch timer limits on mount
    useEffect(() => {
        async function fetchTimerLimits() {
            try {
                const response = await fetch('/api/app/quiz-settings');
                if (response.ok) {
                    const data = await response.json();
                    setTimerLimits(data.timerLimits);
                }
            } catch (error) {
                console.error('Failed to fetch timer limits:', error);
                // Use defaults if fetch fails
                setTimerLimits({
                    MCQ: 15,
                    TRUE_FALSE: 15,
                    FILL_IN_BLANK: 15,
                    SHORT_ANSWER: 30,
                    LONG_ANSWER: 60,
                });
            }
        }
        fetchTimerLimits();
    }, []);

    // Reset timer when question changes
    useEffect(() => {
        setTimerKey(prev => prev + 1);
    }, [currentQuestionIndex]);

    const handleAnswerChange = (value: any) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: value
        }));
    };

    const handleNext = () => {
        setCurrentQuestionIndex(prev => {
            if (prev < totalQuestions - 1) {
                return prev + 1;
            }
            return prev;
        });
    };

    const handlePrevious = () => {
        setCurrentQuestionIndex(prev => {
            if (prev > 0) {
                return prev - 1;
            }
            return prev;
        });
    };

    const handleTimeExpired = () => {
        // Auto-submit current answer (even if empty) and move to next
        toast.warning("Time's up! Moving to next question...");

        // If answer is empty, set it to empty string/null
        if (currentQuestion && answers[currentQuestion.id] === undefined) {
            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: null
            }));
        }

        // Move to next question or submit if last
        setTimeout(() => {
            if (currentQuestionIndex < totalQuestions - 1) {
                handleNext();
            } else {
                handleSubmit(true); // Auto-submit quiz
            }
        }, 500);
    };

    const handleNavigate = (index: number) => {
        setCurrentQuestionIndex(index);
        setShowNavigation(false); // Close mobile sheet
    };

    const handleSubmit = async (autoSubmit = false) => {
        const answeredCount = Object.keys(answers).length;

        if (!autoSubmit && answeredCount < totalQuestions) {
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

    // Guard against undefined question (e.g. during transitions or race conditions)
    if (!currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                            <div
                                key={idx}
                                onClick={() => handleAnswerChange(opt)}
                                className="flex items-center space-x-3 border-2 p-4 rounded-xl hover:bg-accent/50 hover:border-primary/50 cursor-pointer transition-all duration-200 group"
                            >
                                <RadioGroupItem value={opt} id={`opt-${idx}`} className="h-5 w-5" />
                                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-base font-medium group-hover:text-primary transition-colors">
                                    {opt}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case "FILL_IN_BLANK":
                return (
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Your Answer</Label>
                        <Input
                            value={answer || ""}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Type the missing word(s)..."
                            className="text-lg p-6 border-2 focus:border-primary"
                        />
                    </div>
                );

            case "SHORT_ANSWER":
            case "LONG_ANSWER":
                return (
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Your Answer</Label>
                        <Textarea
                            value={answer || ""}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Type your answer here..."
                            className={`text-base p-4 border-2 focus:border-primary resize-none ${q.question_type === "LONG_ANSWER" ? "min-h-[200px]" : "min-h-[120px]"
                                }`}
                        />
                    </div>
                );

            default:
                return <div>Unknown question type</div>;
        }
    };

    const currentTimeLimit = timerLimits ? timerLimits[currentQuestion.question_type] : 30;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container mx-auto py-4 px-4">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl md:text-2xl font-bold truncate">{quiz.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                Question {currentQuestionIndex + 1} of {totalQuestions}
                            </p>
                        </div>

                        {/* Timer - Desktop */}
                        {timerLimits && (
                            <div className="hidden md:block">
                                <QuestionTimer
                                    key={timerKey}
                                    timeLimit={currentTimeLimit}
                                    onTimeExpired={handleTimeExpired}
                                    isPaused={submitting}
                                />
                            </div>
                        )}

                        {/* Mobile Navigation Toggle */}
                        <Sheet open={showNavigation} onOpenChange={setShowNavigation}>
                            <SheetTrigger asChild className="md:hidden">
                                <Button variant="outline" size="sm">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80">
                                <QuizNavigation
                                    totalQuestions={totalQuestions}
                                    currentQuestionIndex={currentQuestionIndex}
                                    answeredQuestions={answeredQuestions}
                                    onNavigate={handleNavigate}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>
                    <Progress value={progress} className="h-1.5 mt-3" />
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto py-6 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Question Area */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Timer - Mobile */}
                        {timerLimits && (
                            <div className="md:hidden flex justify-center">
                                <QuestionTimer
                                    key={timerKey}
                                    timeLimit={currentTimeLimit}
                                    onTimeExpired={handleTimeExpired}
                                    isPaused={submitting}
                                />
                            </div>
                        )}

                        {/* Question Card */}
                        <QuestionCard
                            questionType={currentQuestion.question_type}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={totalQuestions}
                            points={currentQuestion.points}
                            className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                        >
                            <div className="space-y-6">
                                <p className="text-lg md:text-xl font-medium leading-relaxed">
                                    {currentQuestion.question_text}
                                </p>
                                {renderQuestionInput()}
                            </div>
                        </QuestionCard>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center gap-4 pt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handlePrevious}
                                disabled={currentQuestionIndex === 0 || submitting}
                                className="min-w-[120px]"
                            >
                                <ChevronLeft className="mr-2 h-5 w-5" />
                                Previous
                            </Button>

                            {currentQuestionIndex === totalQuestions - 1 ? (
                                <Button
                                    size="lg"
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting}
                                    className="min-w-[120px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="mr-2 h-5 w-5" />
                                            Submit Quiz
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={submitting}
                                    className="min-w-[120px]"
                                >
                                    Next
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Panel - Desktop Only */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24">
                            <QuizNavigation
                                totalQuestions={totalQuestions}
                                currentQuestionIndex={currentQuestionIndex}
                                answeredQuestions={answeredQuestions}
                                onNavigate={handleNavigate}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
