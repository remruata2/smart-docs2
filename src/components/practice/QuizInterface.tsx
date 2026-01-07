"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
import { submitQuizAction } from "@/app/app/practice/actions";
import { QuestionTimer } from "./QuestionTimer";
import { QuestionCard } from "./QuestionCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Checkbox } from "@/components/ui/checkbox";

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
    const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({});

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const answeredQuestions = new Set(
        quiz.questions.map((q, idx) => answers[q.id] !== undefined ? idx : -1).filter(idx => idx !== -1)
    );

    // Shuffle array utility (Fisher-Yates algorithm)
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Initialize shuffled options for all MCQ/TRUE_FALSE questions on mount
    useEffect(() => {
        const shuffled: Record<string, string[]> = {};
        quiz.questions.forEach(q => {
            if ((q.question_type === "MCQ" || q.question_type === "TRUE_FALSE") && Array.isArray(q.options)) {
                shuffled[q.id] = shuffleArray(q.options);
            }
        });
        setShuffledOptions(shuffled);
    }, [quiz.questions]);

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

    const [timeRemaining, setTimeRemaining] = useState(30);
    const expiredTimerKeyRef = useRef<number | null>(null);

    const currentTimeLimit = timerLimits ? timerLimits[currentQuestion.question_type] : 30;

    // Reset timer when question changes
    useEffect(() => {
        setTimerKey(prev => prev + 1);
        setTimeRemaining(currentTimeLimit);
    }, [currentQuestionIndex, currentTimeLimit]);

    // Countdown logic
    useEffect(() => {
        if (submitting) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [submitting, currentQuestionIndex]); // Restart interval on question change

    const playBeep = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    };

    const vibrateDevice = (pattern: number | number[] = 200) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    };


    const handleAnswerChange = (value: any) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: value
        }));
    };

    // Handler for multi-select checkboxes
    const handleCheckboxToggle = (option: string) => {
        const currentAnswers = answers[currentQuestion.id] || [];
        const answerArray = Array.isArray(currentAnswers) ? currentAnswers : [];

        if (answerArray.includes(option)) {
            // Remove if already selected
            handleAnswerChange(answerArray.filter((a: string) => a !== option));
        } else {
            // Add if not selected
            handleAnswerChange([...answerArray, option]);
        }
    };

    const handleNext = () => {
        setCurrentQuestionIndex(prev => {
            if (prev < totalQuestions - 1) {
                return prev + 1;
            }
            return prev;
        });
    };

    const toastShownRef = useRef(false);

    const handleSubmit = async (autoSubmit = false) => {
        if (submitting || toastShownRef.current) return;

        const answeredCount = Object.keys(answers).length;

        if (!autoSubmit && answeredCount < totalQuestions) {
            if (!confirm(`You have answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`)) {
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await submitQuizAction(quiz.id, answers);
            if (!toastShownRef.current) {
                toast.success(`Test submitted! Score: ${result.score}/${result.totalPoints}`);
                toastShownRef.current = true;
            }
            router.push(`/app/practice/${quiz.id}/result`);
        } catch (error) {
            console.error(error);
            if (!toastShownRef.current) {
                toast.error("Failed to submit test. Please try again.");
            }
            setSubmitting(false);
        }
    };

    const handleTimeExpired = useCallback(() => {
        // Auto-submit current answer (even if empty) and move to next

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
    }, [currentQuestion, answers, currentQuestionIndex, totalQuestions, handleNext, handleSubmit]);

    // Alert and Expiration logic
    useEffect(() => {
        if (submitting) return;

        if (timeRemaining === 10) {
            playBeep();
        } else if (timeRemaining <= 5 && timeRemaining > 0) {
            playBeep();
            if (timeRemaining === 5) vibrateDevice();
        } else if (timeRemaining === 0) {
            // Only trigger if we haven't already expired for this specific timer instance
            if (expiredTimerKeyRef.current !== timerKey) {
                toast.warning("Time's up! Moving to next question...");
                playBeep();
                vibrateDevice([100, 50, 100]);
                handleTimeExpired();
                expiredTimerKeyRef.current = timerKey;
            }
        }
    }, [timeRemaining, submitting, handleTimeExpired, timerKey]);

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
                // Use shuffled options if available, otherwise fall back to original
                const options = shuffledOptions[q.id] || (Array.isArray(q.options) ? q.options : []);

                // Detect if multi-select: check question text for keywords like "select all", "choose all", "correct options are", etc.
                const questionTextLower = q.question_text.toLowerCase();
                const isMultiSelect = questionTextLower.includes("select all") ||
                    questionTextLower.includes("choose all") ||
                    questionTextLower.includes("correct options are") ||
                    questionTextLower.includes("correct reason(s)") ||
                    questionTextLower.includes("which of the following are") ||
                    (questionTextLower.includes("(i)") && questionTextLower.includes("(ii)")); // Detect (i), (ii), (iii) pattern

                if (isMultiSelect) {
                    // Render checkboxes for multi-select
                    const selectedAnswers = answer || [];
                    const answerArray = Array.isArray(selectedAnswers) ? selectedAnswers : [];

                    return (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Select all that apply</p>
                            {options.map((opt: string, idx: number) => {
                                const isChecked = answerArray.includes(opt);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleCheckboxToggle(opt)}
                                        className={`
                                            relative flex items-center space-x-4 p-5 md:p-6 rounded-xl cursor-pointer transition-all duration-200 group
                                            border-2 ${isChecked
                                                ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
                                                : 'border-muted bg-card hover:border-primary/60 hover:bg-accent/60 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={() => handleCheckboxToggle(opt)}
                                            id={`opt-${idx}`}
                                            className="h-6 w-6 mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-2"
                                        />
                                        <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-base md:text-lg font-medium leading-normal group-hover:text-primary transition-colors">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <span {...props} />,
                                                }}
                                            >
                                                {opt}
                                            </ReactMarkdown>
                                        </Label>
                                        {isChecked && (
                                            <div className="absolute right-4 md:right-6 text-primary animate-in zoom-in duration-200">
                                                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                } else {
                    // Render radio buttons for single-select
                    return (
                        <RadioGroup value={answer} onValueChange={handleAnswerChange} className="space-y-3">
                            {options.map((opt: string, idx: number) => {
                                const isSelected = answer === opt;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleAnswerChange(opt)}
                                        className={`
                                            relative flex items-center space-x-4 p-5 md:p-6 rounded-xl cursor-pointer transition-all duration-200 group
                                            border-2 ${isSelected
                                                ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
                                                : 'border-muted bg-card hover:border-primary/60 hover:bg-accent/60 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <RadioGroupItem value={opt} id={`opt-${idx}`} className="h-6 w-6 mt-0.5 border-2" />
                                        <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-base md:text-lg font-medium leading-normal group-hover:text-primary transition-colors">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <span {...props} />,
                                                }}
                                            >
                                                {opt}
                                            </ReactMarkdown>
                                        </Label>
                                        {isSelected && (
                                            <div className="absolute right-4 md:right-6 text-primary animate-in zoom-in duration-200">
                                                <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    );
                }

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

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {/* Main Content Area - Centered & Focused */}
            <div className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto w-full bg-background shadow-2xl shadow-black/5 border-x border-border/40">

                {/* Mobile Top Bar - Simplified */}
                <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
                    <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest">Question</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl md:text-2xl font-black leading-none tracking-tight">{currentQuestionIndex + 1}</span>
                            <span className="text-muted-foreground/50 text-sm font-medium">/{totalQuestions}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {timerLimits && (
                            <div className="scale-90 md:scale-100 origin-right">
                                <QuestionTimer
                                    timeLimit={currentTimeLimit}
                                    timeRemaining={timeRemaining}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Line */}
                <div className="w-full h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Scrollable Question Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-32 scroll-smooth">
                    <div className="max-w-3xl mx-auto w-full">
                        <QuestionCard
                            questionType={currentQuestion.question_type}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={totalQuestions}
                            points={currentQuestion.points}
                            className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500 mb-6"
                        >
                            <div className="space-y-6">
                                <div className="prose prose-lg md:prose-xl dark:prose-invert max-w-none text-foreground leading-relaxed">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            table: ({ node, ...props }) => (
                                                <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 my-4" {...props} />
                                            ),
                                            th: ({ node, ...props }) => (
                                                <th className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-left font-semibold" {...props} />
                                            ),
                                            td: ({ node, ...props }) => (
                                                <td className="border border-slate-300 dark:border-slate-600 px-4 py-2" {...props} />
                                            ),
                                        }}
                                    >
                                        {currentQuestion.question_text}
                                    </ReactMarkdown>
                                </div>
                                {renderQuestionInput()}
                            </div>
                        </QuestionCard>
                    </div>
                </div>

                {/* Bottom Bar - Navigation */}
                <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 md:p-6 pb-safe z-20">
                    <div className="max-w-3xl mx-auto w-full flex justify-end">
                        {/* Previous button removed for linear flow */}

                        {currentQuestionIndex === totalQuestions - 1 ? (
                            <Button
                                size="lg"
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="w-full md:w-auto md:min-w-[200px] h-12 md:h-14 text-base md:text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Test
                                        <CheckCircle2 className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                onClick={handleNext}
                                disabled={submitting}
                                className="w-full md:w-auto md:min-w-[200px] h-12 md:h-14 text-base md:text-lg font-bold shadow-lg shadow-black/5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Next Question
                                <ChevronRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

