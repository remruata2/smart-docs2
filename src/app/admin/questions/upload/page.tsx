"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Check, Save, Trash2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuestionUploadPage() {
    const router = useRouter();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedChapter, setSelectedChapter] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(false);
    const [processingStep, setProcessingStep] = useState("");
    const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);

    // Fetch Subjects
    useEffect(() => {
        fetch("/api/subjects")
            .then(res => res.json())
            .then(data => setSubjects(data.subjects || []))
            .catch(err => console.error("Failed to fetch subjects", err));
    }, []);

    // Fetch Chapters when Subject changes
    useEffect(() => {
        if (selectedSubject) {
            fetch(`/api/chapters?subjectId=${selectedSubject}`)
                .then(res => res.json())
                .then(data => setChapters(data.chapters || []))
                .catch(err => console.error("Failed to fetch chapters", err));
        } else {
            setChapters([]);
        }
    }, [selectedSubject]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedSubject || !selectedChapter) {
            toast.error("Please select subject, chapter and file");
            return;
        }

        setLoading(true);
        setProcessingStep("Uploading and Parsing PDF...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("subjectId", selectedSubject);
        formData.append("chapterId", selectedChapter);

        try {
            const res = await fetch("/api/admin/questions/upload", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            const data = await res.json();
            setExtractedQuestions(data.questions);
            setIsReviewing(true);
            toast.success(`Successfully extracted ${data.questions.length} questions!`);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to process upload");
        } finally {
            setLoading(false);
            setProcessingStep("");
        }
    };

    const handleSaveToBank = async () => {
        setLoading(true);
        setProcessingStep("Saving to Question Bank...");

        try {
            const res = await fetch("/api/admin/questions/bulk-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questions: extractedQuestions,
                    chapterId: parseInt(selectedChapter)
                })
            });

            if (!res.ok) throw new Error("Failed to save questions");

            toast.success("Questions saved to bank!");
            router.push(`/admin/chapters/${selectedChapter}/questions`);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
            setProcessingStep("");
        }
    };

    const handleDeleteQuestion = (index: number) => {
        const newQuestions = [...extractedQuestions];
        newQuestions.splice(index, 1);
        setExtractedQuestions(newQuestions);
    };

    const handleGenerateAnswers = async () => {
        setLoading(true);
        setProcessingStep("Generating Answers with AI...");

        try {
            const res = await fetch("/api/admin/questions/generate-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questions: extractedQuestions,
                    chapterId: parseInt(selectedChapter)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate answers");
            }

            const data = await res.json();

            // Merge answers back into questions
            // We assume the order is preserved (which it is in our API)
            const updatedQuestions = extractedQuestions.map((q, i) => {
                const answer = data.answers[i];
                return {
                    ...q,
                    correct_answer: answer?.correct_answer || "",
                    explanation: answer?.explanation || ""
                };
            });

            setExtractedQuestions(updatedQuestions);
            toast.success("Answers generated successfully!");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
            setProcessingStep("");
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upload Question Paper</h1>
                    <p className="text-muted-foreground">Upload CBSE exam papers to extract questions and generate answers.</p>
                </div>
            </div>

            {!isReviewing ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Chapter</Label>
                                <Select onValueChange={setSelectedChapter} value={selectedChapter} disabled={!selectedSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Chapter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {chapters.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Question Paper (PDF)</Label>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="font-medium">{file ? file.name : "Click to upload PDF"}</span>
                                    <span className="text-xs text-muted-foreground">Supports CBSE Exam Papers</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-lg"
                            onClick={handleUpload}
                            disabled={loading || !file || !selectedChapter}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {processingStep}
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-5 w-5" />
                                    Extract Questions
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <Check className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold">Extraction Complete</h3>
                                <p className="text-sm text-muted-foreground">Found {extractedQuestions.length} questions</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsReviewing(false)}>Cancel</Button>
                            <Button
                                variant="secondary"
                                onClick={handleGenerateAnswers}
                                disabled={loading}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                                {loading && processingStep.includes("Generating") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Loader2 className="mr-2 h-4 w-4" />}
                                Generate Answers
                            </Button>
                            <Button onClick={handleSaveToBank} disabled={loading}>
                                {loading && processingStep.includes("Saving") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save All to Bank
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {extractedQuestions.map((q, idx) => (
                            <Card key={idx} className="relative group">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                                                {q.question_type}
                                            </span>
                                            {q.points && (
                                                <span className="ml-2 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                                                    {q.points} Marks
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteQuestion(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div>
                                        <p className="font-medium text-lg">{q.question_text}</p>
                                    </div>

                                    {q.options && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4 border-l-2 border-slate-200">
                                            {q.options.map((opt: string, i: number) => (
                                                <div key={i} className="text-sm text-slate-600">
                                                    {String.fromCharCode(65 + i)}. {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-2">
                                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                            <Check className="h-4 w-4" />
                                            AI Generated Answer
                                        </div>
                                        <p className="font-medium text-slate-800">
                                            {Array.isArray(q.correct_answer)
                                                ? q.correct_answer.join(", ")
                                                : q.correct_answer}
                                        </p>
                                        <p className="text-sm text-slate-600 italic">{q.explanation}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
