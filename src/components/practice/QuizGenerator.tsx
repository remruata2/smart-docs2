"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, BrainCircuit } from "lucide-react";
import { generateQuizAction } from "@/app/app/practice/actions";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForSubject } from "@/app/app/chapters/actions";

export function QuizGenerator() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("all");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [questionCount, setQuestionCount] = useState([10]);
    const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQ"]);

    useEffect(() => {
        // Fetch subjects on mount
        getSubjectsForUserProgram().then(data => {
            if (data && data.subjects) {
                setSubjects(data.subjects);
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            // Fetch chapters when subject changes
            getChaptersForSubject(parseInt(selectedSubject)).then(data => {
                if (data && data.chapters) {
                    setChapters(data.chapters);
                }
            }).catch(console.error);
            setSelectedChapter("all");
        } else {
            setChapters([]);
        }
    }, [selectedSubject]);

    const handleGenerate = async () => {
        if (!selectedSubject) {
            toast.error("Please select a subject");
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
                selectedChapter === "all" ? null : parseInt(selectedChapter),
                difficulty,
                questionCount[0],
                questionTypes as any
            );

            toast.success("Quiz generated successfully!");
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

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                    Generate Practice Quiz
                </CardTitle>
                <CardDescription>
                    Customize your practice session with AI-generated questions.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Chapter (Optional)</Label>
                    <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Chapters" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Chapters</SelectItem>
                            {chapters.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}{c.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Number of Questions: {questionCount[0]}</Label>
                        <Slider
                            value={questionCount}
                            onValueChange={setQuestionCount}
                            min={5}
                            max={20}
                            step={1}
                            className="py-4"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Question Types</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: "MCQ", label: "Multiple Choice" },
                            { id: "TRUE_FALSE", label: "True / False" },
                            { id: "FILL_IN_BLANK", label: "Fill in the Blank" },
                            { id: "SHORT_ANSWER", label: "Short Answer" },
                            { id: "LONG_ANSWER", label: "Long Answer" },
                        ].map(type => (
                            <div key={type.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={type.id}
                                    checked={questionTypes.includes(type.id)}
                                    onCheckedChange={() => toggleQuestionType(type.id)}
                                />
                                <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Quiz...
                        </>
                    ) : (
                        "Start Quiz"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
