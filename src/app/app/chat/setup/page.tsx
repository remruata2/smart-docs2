"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Sparkles, BookOpen, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conversation {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    subjectName?: string;
    chapterTitle?: string;
    courseTitle?: string;
}

export default function AISelectionPage() {
    const router = useRouter();

    // Data states
    const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
    const [subjects, setSubjects] = useState<Array<{ id: number; name: string; courseIds?: number[] }>>([]);
    const [chapters, setChapters] = useState<Array<{ id: string; title: string; chapter_number: number | null; isLocked?: boolean }>>([]);
    const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

    // Selection states
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(false);

    // Initial load: Courses, Subjects, and Recent Conversations
    useEffect(() => {
        async function loadInitialData() {
            try {
                setLoading(true);
                const [subjectsRes, convsRes] = await Promise.all([
                    fetch("/api/dashboard/subjects"),
                    fetch("/api/dashboard/conversations?limit=5")
                ]);

                if (!subjectsRes.ok) throw new Error("Failed to load initial data");
                const subjectsData = await subjectsRes.json();
                setCourses(subjectsData.courses || []);
                setSubjects(subjectsData.subjects || []);

                if (convsRes.ok) {
                    const convsData = await convsRes.json();
                    setRecentConversations(convsData.conversations || []);
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
                toast.error("Failed to load available topics");
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
                setChapters([]);
            } finally {
                setChaptersLoading(false);
            }
        }
        loadChapters();
    }, [selectedSubjectId]);

    const filteredSubjects = selectedCourseId === "all"
        ? subjects
        : subjects.filter(s => s.courseIds?.includes(parseInt(selectedCourseId)));

    const handleStartChat = () => {
        if (!selectedSubjectId || !selectedChapterId) {
            toast.warning("Please select both a subject and a chapter");
            return;
        }
        router.push(`/app/chat?subjectId=${selectedSubjectId}&chapterId=${selectedChapterId}`);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                <p className="text-sm font-medium text-slate-500">Preparing AI Tutor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/30">
            <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
                {/* Header */}
                <div className="text-center md:text-left md:px-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Tutor</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Selection Column (Left) */}
                    <div className="md:col-span-7 space-y-4">
                        {/* Course Selection */}
                        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                            <CardContent className="p-4 space-y-3">
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">1. SELECT COURSE (OPTIONAL)</h3>
                                <div className="relative group">
                                    <select
                                        className="w-full h-14 bg-slate-50/50 border border-slate-100 rounded-xl px-4 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white transition-all cursor-pointer text-slate-700"
                                        value={selectedCourseId}
                                        onChange={(e) => {
                                            setSelectedCourseId(e.target.value);
                                            setSelectedSubjectId(null);
                                            setSelectedChapterId(null);
                                        }}
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id.toString()}>{c.title}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Subject Selection */}
                        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                            <CardContent className="p-4 space-y-3">
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">2. SELECT SUBJECT</h3>
                                <div className="relative group">
                                    <select
                                        className="w-full h-14 bg-slate-50/50 border border-slate-100 rounded-xl px-4 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white transition-all cursor-pointer text-slate-700 disabled:opacity-50"
                                        value={selectedSubjectId || ""}
                                        onChange={(e) => {
                                            setSelectedSubjectId(e.target.value ? parseInt(e.target.value) : null);
                                            setSelectedChapterId(null);
                                        }}
                                    >
                                        <option value="" disabled>Choose a subject...</option>
                                        {filteredSubjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Chapter Selection */}
                        <Card className={cn(
                            "border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white transition-all duration-300",
                            !selectedSubjectId && "opacity-50 grayscale pointer-events-none"
                        )}>
                            <CardContent className="p-4 space-y-3">
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">3. SELECT CHAPTER</h3>
                                <div className="relative group">
                                    <select
                                        className="w-full h-14 bg-slate-50/50 border border-slate-100 rounded-xl px-4 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white transition-all cursor-pointer text-slate-700 disabled:opacity-50"
                                        value={selectedChapterId || ""}
                                        onChange={(e) => setSelectedChapterId(e.target.value)}
                                        disabled={chaptersLoading || !selectedSubjectId}
                                    >
                                        <option value="" disabled>{chaptersLoading ? "Loading chapters..." : (selectedSubjectId ? "Choose a chapter..." : "Select a subject first")}</option>
                                        {chapters.map(c => (
                                            <option key={c.id} value={c.id} disabled={c.isLocked}>
                                                {c.isLocked ? "🔒 " : ""}{c.chapter_number ? `${c.chapter_number}. ` : ""}{c.title}
                                            </option>
                                        ))}
                                    </select>
                                    {chaptersLoading ? (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
                                    ) : (
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Start Learning Button */}
                        <div className="pt-2">
                            <Button
                                className={cn(
                                    "w-full h-14 rounded-2xl text-base font-bold transition-all shadow-md active:scale-[0.98]",
                                    (!selectedSubjectId || !selectedChapterId)
                                        ? "bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                                )}
                                disabled={!selectedSubjectId || !selectedChapterId}
                                onClick={handleStartChat}
                            >
                                Start Learning
                            </Button>
                        </div>
                    </div>

                    {/* Recent Conversations Column (Right) */}
                    <div className="md:col-span-5 space-y-4">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">RECENT CONVERSATIONS</h2>
                        {recentConversations.length > 0 ? (
                            <div className="space-y-3">
                                {recentConversations.map(conv => (
                                    <Card
                                        key={conv.id}
                                        className="border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:bg-slate-50 transition-all cursor-pointer group active:scale-[0.99] bg-white text-left"
                                        onClick={() => router.push(`/app/chat?id=${conv.id}`)}
                                    >
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                    {conv.title}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-medium tracking-tight truncate">
                                                    {conv.courseTitle || "Individual Course"} • {formatDate(conv.updatedAt)}
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shrink-0">
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-semibold text-slate-400">No recent sessions found</p>
                                <p className="text-[10px] text-slate-300 mt-1">Select a subject to start learning</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
