"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, Bot, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AISelectionPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Course/Subject, 2: Chapter

    const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
    const [subjects, setSubjects] = useState<Array<{ id: number; name: string; courseIds?: number[] }>>([]);
    const [chapters, setChapters] = useState<Array<{ id: string; title: string; chapter_number: number | null; isLocked?: boolean }>>([]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(false);

    // Initial load: Courses & Subjects
    useEffect(() => {
        async function loadInitialData() {
            try {
                setLoading(true);
                const res = await fetch("/api/dashboard/subjects");
                if (!res.ok) throw new Error("Failed to load initial data");
                const data = await res.json();
                setCourses(data.courses || []);
                setSubjects(data.subjects || []);
            } catch (e) {
                console.error("Failed to fetch subjects", e);
                toast.error("Failed to load available courses");
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    // Load chapters when a subject is selected
    useEffect(() => {
        if (!selectedSubjectId) {
            setChapters([]);
            return;
        }

        async function loadChapters() {
            try {
                setChaptersLoading(true);
                const res = await fetch(`/api/dashboard/chapters?subjectId=${selectedSubjectId}`);
                if (!res.ok) throw new Error("Failed to load chapters");
                const data = await res.json();
                setChapters(data.chapters || []);
            } catch (e) {
                console.error("Failed to fetch chapters", e);
                toast.error("Failed to load chapters for this subject");
            } finally {
                setChaptersLoading(false);
            }
        }
        loadChapters();
    }, [selectedSubjectId]);

    const filteredSubjects = selectedCourseId === "all"
        ? subjects
        : subjects.filter(s => s.courseIds?.includes(parseInt(selectedCourseId)));

    const handleSubjectSelect = (id: number) => {
        setSelectedSubjectId(id);
        setSelectedChapterId(null);
        setStep(2);
    };

    const handleStartChat = () => {
        if (!selectedSubjectId || !selectedChapterId) {
            toast.warning("Please select a chapter to continue");
            return;
        }
        router.push(`/app/chat?subjectId=${selectedSubjectId}&chapterId=${selectedChapterId}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Bot className="w-12 h-12 text-primary animate-bounce" />
                <p className="text-muted-foreground animate-pulse">Loading subjects...</p>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            <div className="text-center mb-8 space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
                    <Bot className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">New AI Tutor Session</h1>
                <p className="text-slate-500">Select a topic to start your specialized study session</p>
            </div>

            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                            step === 1 ? "bg-primary text-white" : "bg-green-500 text-white"
                        )}>
                            {step === 1 ? "1" : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {step === 1 ? "Select Subject" : "Select Chapter"}
                            </p>
                            <p className="text-xs text-slate-500">
                                {step === 1 ? "Choose what you want to study" : "Pick a specific topic"}
                            </p>
                        </div>
                    </div>
                    {step === 2 && (
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs font-bold text-primary">
                            Change Subject
                        </Button>
                    )}
                </div>

                <CardContent className="p-6">
                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Course Filter */}
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={selectedCourseId === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCourseId("all")}
                                    className="rounded-full text-xs"
                                >
                                    All Courses
                                </Button>
                                {courses.map(course => (
                                    <Button
                                        key={course.id}
                                        variant={selectedCourseId === course.id.toString() ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCourseId(course.id.toString())}
                                        className="rounded-full text-xs"
                                    >
                                        {course.title}
                                    </Button>
                                ))}
                            </div>

                            {/* Subject Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredSubjects.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSubjectSelect(sub.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:bg-slate-50 hover:border-primary/30 group",
                                            selectedSubjectId === sub.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-slate-200"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white">
                                            <BookOpen className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-900 truncate">{sub.name}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            {chaptersLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3">
                                    <Layers className="w-8 h-8 text-primary animate-pulse" />
                                    <p className="text-sm text-slate-500">Loading chapters...</p>
                                </div>
                            ) : chapters.length === 0 ? (
                                <div className="py-12 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <p className="text-sm font-medium text-slate-600">No chapters found for this subject</p>
                                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-primary">
                                        Go Back
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {chapters.map(c => (
                                        <button
                                            key={c.id}
                                            disabled={c.isLocked}
                                            onClick={() => setSelectedChapterId(c.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                                c.isLocked ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50 hover:border-primary/30 group",
                                                selectedChapterId === c.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                                                selectedChapterId === c.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {c.chapter_number || "X"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-900 truncate">
                                                    {c.isLocked && "🔒 "}{c.title}
                                                </p>
                                            </div>
                                            {selectedChapterId === c.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <Button
                                className="w-full mt-6 h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
                                disabled={!selectedChapterId || chaptersLoading}
                                onClick={handleStartChat}
                            >
                                Start Study Session
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
