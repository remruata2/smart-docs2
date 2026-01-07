"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, BrainCircuit, ChevronRight, ChevronLeft, CheckCircle, Swords } from "lucide-react";
import { generateQuizAction } from "@/app/app/practice/actions";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForSubject } from "@/app/app/chapters/actions";

export function QuizGenerator({
    initialSubjectId,
    initialChapterId
}: {
    initialSubjectId?: string;
    initialChapterId?: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectId || "");
    const [selectedChapter, setSelectedChapter] = useState<string>(initialChapterId || "");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "exam">("medium");
    const [questionCount, setQuestionCount] = useState([10]);
    const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQ"]);

    useEffect(() => {
        // Fetch subjects on mount
        getSubjectsForUserProgram().then(data => {
            if (data && data.enrollments && data.enrollments.length > 0) {
                // Flatten subjects from all course enrollments
                const allSubjects = data.enrollments.flatMap(e => e.course.subjects);
                setSubjects(allSubjects);

                // Preselect first subject only if no initialSubjectId provided
                if (!initialSubjectId && allSubjects.length > 0) {
                    setSelectedSubject(allSubjects[0].id.toString());
                }
            }
        }).catch(console.error);
    }, [initialSubjectId]);

    useEffect(() => {
        if (selectedSubject) {
            // Fetch chapters when subject changes
            getChaptersForSubject(parseInt(selectedSubject)).then(data => {
                if (data && data.chapters && data.chapters.length > 0) {
                    setChapters(data.chapters);
                    // Preselect first chapter only if no initialChapterId provided OR if user manually changed subject
                    const isInitialSubject = selectedSubject === initialSubjectId;
                    if (!isInitialSubject || !initialChapterId) {
                        setSelectedChapter(data.chapters[0].id.toString());
                    } else if (initialChapterId) {
                        setSelectedChapter(initialChapterId);
                    }
                }
            }).catch(console.error);
        } else {
            setChapters([]);
            setSelectedChapter("");
        }
    }, [selectedSubject, initialSubjectId, initialChapterId]);

    const handleGenerate = async () => {
        if (!selectedSubject) {
            toast.error("Please select a subject");
            return;
        }
        if (!selectedChapter) {
            toast.error("Please select a chapter");
            return;
        }
        if (questionTypes.length === 0) {
            toast.error("Please select at least one question type");
            return;
        }

        setLoading(true);
        try {
            const quiz = await generateQuizAction(
                parseInt(selectedSubject),
                parseInt(selectedChapter),
                difficulty,
                questionCount[0],
                questionTypes as any
            );

            toast.success("Mock Test generated successfully! 🎉");
            router.push(`/app/practice/${quiz.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate mock test. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestionType = (type: string) => {
        setQuestionTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const canProceedStep1 = selectedSubject && selectedChapter;
    const canProceedStep3 = difficulty === "exam" || questionTypes.length > 0;

    const steps = [
        { number: 1, title: "Select Topic", description: "Choose subject & chapter" },
        { number: 2, title: "Set Difficulty", description: "Configure test settings" },
        { number: 3, title: "Question Types", description: "Pick question formats" },
        { number: 4, title: "Review & Start", description: "Confirm and begin" },
    ];

    const questionTypeOptions = [
        { id: "MCQ", label: "Multiple Choice", icon: "📝" },
        { id: "TRUE_FALSE", label: "True / False", icon: "✅" },
        { id: "FILL_IN_BLANK", label: "Fill in Blank", icon: "📌" },
        { id: "SHORT_ANSWER", label: "Short Answer", icon: "✏️" },
        { id: "LONG_ANSWER", label: "Essay", icon: "📄" },
    ];

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base md:text-lg font-semibold">📚 Subject</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="h-10 md:h-14 text-sm md:text-base border-2">
                                    <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()} className="text-base py-3">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base md:text-lg font-semibold">⚡ Chapter</Label>
                            <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                                <SelectTrigger className="h-10 md:h-14 text-sm md:text-base border-2">
                                    <SelectValue placeholder="Select a chapter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {chapters.map(c => (
                                        <SelectItem
                                            key={c.id}
                                            value={c.id.toString()}
                                            disabled={c.isLocked}
                                            className="text-base py-3"
                                        >
                                            {c.isLocked && <span className="mr-2">🔒</span>}
                                            {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}
                                            {c.title}
                                            {c.isLocked && <span className="ml-2 text-xs text-muted-foreground">(Upgrade to Unlock)</span>}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-lg font-semibold">🎯 Difficulty Level</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant={difficulty === "easy" ? "default" : "outline"}
                                    onClick={() => setDifficulty("easy")}
                                    className={`h-12 md:h-16 text-sm md:text-base font-semibold ${difficulty === "easy" ? "bg-green-600 hover:bg-green-700" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">😊</span>
                                    Easy
                                </Button>
                                <Button
                                    type="button"
                                    variant={difficulty === "medium" ? "default" : "outline"}
                                    onClick={() => setDifficulty("medium")}
                                    className={`h-12 md:h-16 text-sm md:text-base font-semibold ${difficulty === "medium" ? "bg-orange-500 hover:bg-orange-600" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">🤔</span>
                                    Medium
                                </Button>
                                <Button
                                    type="button"
                                    variant={difficulty === "hard" ? "default" : "outline"}
                                    onClick={() => setDifficulty("hard")}
                                    className={`h-12 md:h-16 text-sm md:text-base font-semibold ${difficulty === "hard" ? "bg-red-600 hover:bg-red-700" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">🔥</span>
                                    Hard
                                </Button>
                                <Button
                                    type="button"
                                    variant={difficulty === "exam" ? "default" : "outline"}
                                    onClick={() => setDifficulty("exam")}
                                    className={`h-12 md:h-16 text-sm md:text-base font-semibold ${difficulty === "exam" ? "bg-purple-600 hover:bg-purple-700" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">📝</span>
                                    Exam
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-base md:text-lg font-semibold">📊 Number of Questions</Label>
                                <div className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold text-lg md:text-xl">
                                    {questionCount[0]}
                                </div>
                            </div>
                            <Slider
                                value={questionCount}
                                onValueChange={setQuestionCount}
                                min={5}
                                max={10}
                                step={1}
                                className="py-2"
                            />
                            <div className="flex justify-between text-sm text-muted-foreground px-1">
                                <span>5 questions</span>
                                <span>10 questions</span>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                if (difficulty === "exam") {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center bg-purple-50 rounded-lg border-2 border-purple-100">
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-3xl">📝</span>
                            </div>
                            <h3 className="text-xl font-bold text-purple-900">Exam Mode Active</h3>
                            <p className="text-purple-700 max-w-md">
                                In Exam Mode, we use real questions from past papers.
                                Question types are determined by the available exam questions.
                            </p>
                            <div className="text-sm text-purple-600 font-medium">
                                All available question types will be included.
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        <Label className="text-base md:text-lg font-semibold">✏️ Question Types</Label>
                        <p className="text-xs md:text-sm text-muted-foreground mb-4">Select at least one question type</p>
                        <div className="grid grid-cols-2 gap-3">
                            {questionTypeOptions.map(type => (
                                <Button
                                    key={type.id}
                                    type="button"
                                    variant={questionTypes.includes(type.id) ? "default" : "outline"}
                                    onClick={() => toggleQuestionType(type.id)}
                                    className={`h-16 md:h-20 flex flex-col items-center justify-center gap-1 md:gap-2 text-sm md:text-base ${questionTypes.includes(type.id) ? "bg-green-600 hover:bg-green-700" : ""
                                        }`}
                                >
                                    <span className="text-3xl">{type.icon}</span>
                                    <span className="font-medium text-xs">{type.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                const selectedSubjectName = subjects.find(s => s.id.toString() === selectedSubject)?.name;
                const selectedChapterName = chapters.find(c => c.id.toString() === selectedChapter)?.title;

                return (
                    <div className="space-y-4">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold mb-1">🎉 Ready to Start!</h3>
                            <p className="text-sm text-muted-foreground">Review your test settings below</p>
                        </div>

                        <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-xs font-medium text-muted-foreground">Subject</span>
                                <span className="font-semibold text-sm">{selectedSubjectName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-xs font-medium text-muted-foreground">Chapter</span>
                                <span className="font-semibold text-xs text-right max-w-[60%] truncate">{selectedChapterName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
                                <span className="font-semibold text-sm capitalize">{difficulty}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-xs font-medium text-muted-foreground">Questions</span>
                                <span className="font-semibold text-sm">{questionCount[0]}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-medium text-muted-foreground">Types</span>
                                <div className="text-right">
                                    {questionTypes.map(type => (
                                        <div key={type} className="font-medium text-xs">
                                            {questionTypeOptions.find(q => q.id === type)?.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-full">
            {currentStep === 1 && (
                <div className="mb-4 md:mb-8 text-center">
                    <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                        Practice & Exam Prep
                    </h1>
                    <p className="text-sm md:text-lg text-muted-foreground">
                        Generate AI-powered mock tests to test your knowledge and earn points! 🎯
                    </p>
                </div>
            )}
            <Card className="w-full shadow-xl border-2">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-xl md:text-2xl">Generate Mock Test</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Step {currentStep} of 4 - {steps[currentStep - 1].description}</CardDescription>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-2">
                        {steps.map((step, idx) => (
                            <div key={step.number} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all ${currentStep > step.number
                                            ? "bg-green-500 text-white"
                                            : currentStep === step.number
                                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                                : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                                    </div>
                                    <span className={`text-xs mt-1 hidden sm:block ${currentStep === step.number ? "font-semibold" : ""}`}>
                                        {step.title}
                                    </span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div
                                        className={`h-1 flex-1 mx-2 rounded transition-all ${currentStep > step.number ? "bg-green-500" : "bg-muted"
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 min-h-[320px]">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center gap-4 pt-6 border-t">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                            disabled={currentStep === 1 || loading}
                            className="min-w-[100px]"
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" />
                            Back
                        </Button>

                        {currentStep < 4 ? (
                            <Button
                                size="lg"
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                disabled={
                                    (currentStep === 1 && !canProceedStep1) ||
                                    (currentStep === 3 && !canProceedStep3)
                                }
                                className="min-w-[100px] bg-green-600 hover:bg-green-700"
                            >
                                Next
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                onClick={handleGenerate}
                                disabled={loading}
                                className="min-w-[140px] bg-green-600 hover:bg-green-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Start Test
                                        <ChevronRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>

            </Card>
        </div >
    );
}
