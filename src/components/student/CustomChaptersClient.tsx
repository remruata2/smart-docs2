"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Plus,
    Trash2,
    Loader2,
    BookOpen,
    BrainCircuit,
    AlertCircle,
    FileUp,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";

interface Chapter {
    id: string;
    title: string;
    processing_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    error_message?: string;
    created_at: string;
    subject_id: string;
    hasStudyMaterial: boolean;
    questionCount: number;
}

interface CustomChaptersClientProps {
    courseId: number;
    courseTitle: string;
}

export function CustomChaptersClient({ courseId, courseTitle }: CustomChaptersClientProps) {
    const router = useRouter();
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [subject, setSubject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadTitle, setUploadTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchChapters = useCallback(async () => {
        try {
            const res = await fetch(`/api/student-chapters?courseId=${courseId}`);
            if (!res.ok) throw new Error("Failed to fetch chapters");
            const data = await res.json();
            setChapters(data.chapters || []);
            setSubject(data.subject);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load custom chapters");
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchChapters();
    }, [fetchChapters]);

    // Polling for processing status
    useEffect(() => {
        const hasUnfinished = chapters.some(c => c.processing_status === "PENDING" || c.processing_status === "PROCESSING");
        if (!hasUnfinished) return;

        const interval = setInterval(fetchChapters, 5000);
        return () => clearInterval(interval);
    }, [chapters, fetchChapters]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !uploadTitle.trim()) return;

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("File size exceeds 10MB limit");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", uploadTitle);
        formData.append("courseId", courseId.toString());

        try {
            const res = await fetch("/api/student-chapters", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Upload failed");
            }

            toast.success("Chapter uploaded! Processing started.");
            setUploadTitle("");
            setSelectedFile(null);
            fetchChapters();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (chapterId: string) => {
        if (!confirm("Are you sure you want to delete this chapter?")) return;

        try {
            const res = await fetch(`/api/student-chapters/${chapterId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Chapter deleted");
            setChapters(prev => prev.filter(c => c.id !== chapterId));
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const getStatusBadge = (status: Chapter["processing_status"]) => {
        switch (status) {
            case "COMPLETED":
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Ready</Badge>;
            case "PROCESSING":
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
            case "FAILED":
                return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
        }
    };

    return (
        <div className="space-y-4 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/app/subjects?courseId=${courseId}`}
                    className="flex items-center text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors w-max"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to All Subjects
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Custom Chapters</h1>
                        <p className="text-sm md:text-base text-gray-500 mt-1">Manage your own study materials for <span className="font-semibold text-indigo-600">{courseTitle}</span></p>
                    </div>
                    {chapters.length < 5 && (
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-600">{chapters.length} / 5 Chapters</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 md:p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
                <div className="p-2 md:p-3 bg-white rounded-lg shadow-sm shrink-0">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm md:text-base font-bold text-gray-900 leading-tight">Build Your Personal Study Hub</h4>
                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed mt-0.5">
                        Transform your study materials into AI-powered mock tests and structured chapters.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
                {/* Chapters List */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-gray-900 text-lg">My Chapters</h3>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : chapters.length === 0 ? (
                        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
                            <CardContent className="py-24 text-center">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <FileText className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No custom chapters yet</h3>
                                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                    Upload your first PDF material on the right to generate AI-powered notes and practice quizzes personalized for you.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {chapters.map(chapter => (
                                <Card key={chapter.id} className="hover:shadow-md transition-all border-none bg-white group">
                                    <CardContent className="p-3 md:p-5">
                                        <div className="flex flex-col gap-3">
                                            {/* Top row: icon + info + delete */}
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                                                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 leading-tight">{chapter.title}</h4>
                                                        {getStatusBadge(chapter.processing_status)}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Uploaded on {new Date(chapter.created_at).toLocaleDateString()}
                                                    </p>
                                                    {chapter.processing_status === "FAILED" && (
                                                        <p className="text-xs text-red-500 font-medium">{chapter.error_message}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-500 h-7 w-7 md:h-8 md:w-8 hover:bg-red-50 transition-colors shrink-0"
                                                    onClick={() => handleDelete(chapter.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                </Button>
                                            </div>

                                            {/* Action buttons row */}
                                            {chapter.processing_status === "COMPLETED" && (
                                                <div className="grid grid-cols-3 md:flex md:items-center gap-2 md:bg-gray-50 md:p-1 md:rounded-lg md:w-fit">
                                                    <Link href={`/app/study/${chapter.id}`}>
                                                        <Button size="sm" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-2 md:px-3 text-xs md:text-sm">
                                                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                                                            Study
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/app/practice?courseId=${courseId}&subjectId=${chapter.subject_id}&chapterId=${chapter.id}`}>
                                                        <Button variant="outline" size="sm" className="w-full md:w-auto border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 font-bold h-8 px-2 md:px-3 text-xs md:text-sm">
                                                            <BrainCircuit className="h-3.5 w-3.5 mr-1" />
                                                            Practice
                                                            <Badge variant="secondary" className="ml-1 px-1 bg-green-50 text-[10px] text-green-600 border-green-100 h-4 hidden md:inline-flex">
                                                                {chapter.questionCount}
                                                            </Badge>
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/app/chat?chapterId=${chapter.id}&subjectId=${chapter.subject_id}`}>
                                                        <Button variant="outline" size="sm" className="w-full md:w-auto border-gray-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 font-bold h-8 px-2 md:px-3 text-xs md:text-sm">
                                                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                                            Ask AI
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}

                                            {(chapter.processing_status === "PENDING" || chapter.processing_status === "PROCESSING") && (
                                                <div className="mt-4 space-y-1.5">
                                                    <Progress value={chapter.processing_status === "PENDING" ? 10 : 60} className="h-1.5" />
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">
                                                        Analyzing content & generating questions...
                                                    </p>
                                                    <p className="text-[11px] text-indigo-600 font-medium text-center bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/50 mt-1.5">
                                                        Processing takes 1-5 mins. You can safely leave this page.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6">
                            <CardTitle className="text-xl flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <FileUp className="w-6 h-6" />
                                </div>
                                Upload PDF
                            </CardTitle>
                            <CardDescription className="text-indigo-100 mt-2">
                                Select a PDF file to generate your personalised study materials.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {chapters.length >= 5 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
                                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-amber-800 text-sm">Limit Reached</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            You've reached the limit of 5 custom chapters for this course. Please delete an old chapter to upload a new one.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleUpload} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Chapter Title</label>
                                        <Input
                                            className="h-11 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                                            placeholder="e.g. Molecular Biology Intro"
                                            value={uploadTitle}
                                            onChange={e => setUploadTitle(e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">PDF File (Max 10MB)</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                id="file-upload"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                                disabled={isUploading}
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className={`flex items-center gap-3 px-4 h-11 rounded-md border-2 border-dashed transition-all cursor-pointer ${selectedFile
                                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-500'
                                                    }`}
                                            >
                                                <FileText className={`w-5 h-5 ${selectedFile ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                <span className="text-sm font-medium truncate flex-1">
                                                    {selectedFile ? selectedFile.name : "Choose File..."}
                                                </span>
                                                {!selectedFile && <span className="text-xs text-gray-400">No file chosen</span>}
                                            </label>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                        disabled={isUploading || !selectedFile || !uploadTitle}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5 mr-2" />
                                                Create Chapter
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
