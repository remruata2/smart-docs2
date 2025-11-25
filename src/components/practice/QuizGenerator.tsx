"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, BrainCircuit, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import { generateQuizAction } from "@/app/app/practice/actions";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForSubject } from "@/app/app/chapters/actions";

export function QuizGenerator() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [questionCount, setQuestionCount] = useState([5]);
    const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQ"]);

    useEffect(() => {
        // Fetch subjects on mount and preselect first one
        getSubjectsForUserProgram().then(data => {
            if (data && data.subjects && data.subjects.length > 0) {
                setSubjects(data.subjects);
                // Preselect first subject
                setSelectedSubject(data.subjects[0].id.toString());
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            // Fetch chapters when subject changes and preselect first one
            getChaptersForSubject(parseInt(selectedSubject)).then(data => {
                if (data && data.chapters && data.chapters.length > 0) {
                    setChapters(data.chapters);
                    // Preselect first chapter
                    setSelectedChapter(data.chapters[0].id.toString());
                }
            }).catch(console.error);
        } else {
            setChapters([]);
            setSelectedChapter("");
        }
    }, [selectedSubject]);

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

            toast.success("Quiz generated successfully! 🎉");
            router.push(`/app/practice/${quiz.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate quiz. Please try again.");
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
    const canProceedStep3 = questionTypes.length > 0;

    const steps = [
        { number: 1, title: "Select Topic", description: "Choose subject & chapter" },
        { number: 2, title: "Set Difficulty", description: "Configure quiz settings" },
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
                            <Label className="text-lg font-semibold">📚 Subject</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="h-14 text-base border-2">
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
                            <Label className="text-lg font-semibold">⚡ Chapter</Label>
                            <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                                <SelectTrigger className="h-14 text-base border-2">
                                    <SelectValue placeholder="Select a chapter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {chapters.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()} className="text-base py-3">
                                            {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}{c.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">🎯 Difficulty Level</Label>
                            <div className="flex flex-col gap-3">
                                <Button
                                    type="button"
                                    variant={difficulty === "easy" ? "default" : "outline"}
                                    onClick={() => setDifficulty("easy")}
                                    className={`h-16 text-base font-semibold ${difficulty === "easy" ? "bg-green-600 hover:bg-green-700" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">😊</span>
                                    Easy
                                </Button>
                                <Button
                                    type="button"
                                    variant={difficulty === "medium" ? "default" : "outline"}
                                    onClick={() => setDifficulty("medium")}
                                    className={`h-16 text-base font-semibold ${difficulty === "medium" ? "bg-orange-500 hover:bg-orange-600" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">🤔</span>
                                    Medium
                                </Button>
                                <Button
                                    type="button"
                                    variant={difficulty === "hard" ? "default" : "outline"}
                                    onClick={() => setDifficulty("hard")}
                                    className={`h-16 text-base font-semibold ${difficulty === "hard" ? "bg-red-600 hover:bg-red-700" : ""
                                        }`}
                                >
                                    <span className="mr-2 text-xl">🔥</span>
                                    Hard
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-lg font-semibold">📊 Number of Questions</Label>
                                <div className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold text-xl">
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
                return (
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">✏️ Question Types</Label>
                        <p className="text-sm text-muted-foreground mb-4">Select at least one question type</p>
                        <div className="grid grid-cols-2 gap-3">
                            {questionTypeOptions.map(type => (
                                <Button
                                    key={type.id}
                                    type="button"
                                    variant={questionTypes.includes(type.id) ? "default" : "outline"}
                                    onClick={() => toggleQuestionType(type.id)}
                                    className={`h-20 flex flex-col items-center justify-center gap-2 text-base ${questionTypes.includes(type.id) ? "bg-green-600 hover:bg-green-700" : ""
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
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold mb-2">🎉 Ready to Start!</h3>
                            <p className="text-muted-foreground">Review your quiz settings below</p>
                        </div>

                        <div className="space-y-4 bg-muted/30 rounded-lg p-6">
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-sm font-medium text-muted-foreground">Subject</span>
                                <span className="font-semibold">{selectedSubjectName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-sm font-medium text-muted-foreground">Chapter</span>
                                <span className="font-semibold text-sm">{selectedChapterName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-sm font-medium text-muted-foreground">Difficulty</span>
                                <span className="font-semibold capitalize">{difficulty}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-sm font-medium text-muted-foreground">Questions</span>
                                <span className="font-semibold">{questionCount[0]}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-muted-foreground">Types</span>
                                <div className="text-right">
                                    {questionTypes.map(type => (
                                        <div key={type} className="font-medium text-sm">
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
        <Card className="w-full shadow-xl border-2">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-2xl">Generate Practice Quiz</CardTitle>
                        <CardDescription>Step {currentStep} of 4 - {steps[currentStep - 1].description}</CardDescription>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-between mb-2">
                    {steps.map((step, idx) => (
                        <div key={step.number} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${currentStep > step.number
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
                                    Start Quiz
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
