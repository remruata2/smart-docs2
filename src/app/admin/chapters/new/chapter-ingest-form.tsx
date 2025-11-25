'use client';

import { useState } from "react";
import { batchCreateChapters, analyzeTextbook } from "@/app/actions/admin";
import { ingestChapterAsync } from "../actions-async";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TextbookSplitter, DetectedChapter, LlamaParsePageResult } from "@/lib/textbook-splitter";

interface Board {
    id: string;
    name: string;
}

interface Program {
    id: number;
    name: string;
    board: { id: string; name: string };
    institution: { id: bigint; name: string } | null;
}

interface Subject {
    id: number;
    name: string;
    program: {
        id: number;
        name: string;
        board: { id: string; name: string };
    };
}

type UploadMode = 'individual' | 'textbook';

export default function ChapterIngestForm({
    boards,
    programs,
    subjects
}: {
    boards: Board[];
    programs: Program[];
    subjects: Subject[];
}) {
    const router = useRouter();
    const [uploadMode, setUploadMode] = useState<UploadMode>('individual');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<number | "">("");

    // Individual mode state
    const [uploadingFiles, setUploadingFiles] = useState<Array<{
        file: File;
        status: 'pending' | 'uploading' | 'success' | 'error';
        error?: string;
        title: string;
        subjectId: string;
        chapterNumber: string;
        accessibleBoards: string[];
    }>>([]);

    // Textbook mode state
    const [textbookFile, setTextbookFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detectedChapters, setDetectedChapters] = useState<DetectedChapter[]>([]);
    const [fullPages, setFullPages] = useState<LlamaParsePageResult[]>([]);
    const [textbookSubjectId, setTextbookSubjectId] = useState<string>("");
    const [textbookBoards, setTextbookBoards] = useState<string[]>([]);

    // Filter subjects based on selected program
    const filteredSubjects = selectedProgram
        ? subjects.filter(s => s.program.id === selectedProgram)
        : subjects;

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setUploadingFiles([]);
            return;
        }

        if (files.length > 5) {
            toast.error("Maximum 5 files allowed per upload");
            e.target.value = "";
            return;
        }

        const maxSize = 100 * 1024 * 1024;
        const oversizedFiles = Array.from(files).filter(f => f.size > maxSize);
        if (oversizedFiles.length > 0) {
            toast.error(`${oversizedFiles.length} file(s) too large. Maximum size is 100MB.`);
            e.target.value = "";
            return;
        }

        const fileRecords = Array.from(files).map(file => ({
            file,
            status: 'pending' as const,
            title: file.name.replace(/\.pdf$/i, ""),
            subjectId: "",
            chapterNumber: "",
            accessibleBoards: [] as string[],
        }));

        setUploadingFiles(fileRecords);
    }

    async function handleTextbookAnalyze() {
        if (!textbookFile) {
            toast.error("Please select a textbook PDF");
            return;
        }

        setIsAnalyzing(true);
        try {
            // SERVER-SIDE: Extract text using API route (avoids bundling issues)
            const formData = new FormData();
            formData.append('file', textbookFile);

            const response = await fetch('/api/extract-pdf-text', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to extract PDF text');
            }

            const { pages } = await response.json();

            // Detect chapters from extracted text
            const chapters = await TextbookSplitter.detectChapters(pages);

            setFullPages(pages);
            setDetectedChapters(chapters);

            toast.success(`Detected ${chapters.length} chapter(s) - Ready to save!`);
        } catch (error: any) {
            toast.error(error.message || "Failed to analyze textbook");
            console.error("Textbook analysis error:", error);
        } finally {
            setIsAnalyzing(false);
        }
    }

    async function handleIndividualSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (uploadingFiles.length === 0) {
            toast.error("Please select at least one PDF file");
            return;
        }

        const invalidFiles = uploadingFiles.filter(f => !f.subjectId);
        if (invalidFiles.length > 0) {
            toast.error("Please select a subject for all files");
            return;
        }

        setIsLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < uploadingFiles.length; i++) {
            const fileRecord = uploadingFiles[i];

            setUploadingFiles(prev => {
                const updated = [...prev];
                updated[i] = { ...updated[i], status: 'uploading' };
                return updated;
            });

            try {
                const formData = new FormData();
                formData.append("file", fileRecord.file);
                formData.append("title", fileRecord.title);
                formData.append("subjectId", fileRecord.subjectId);
                if (fileRecord.chapterNumber) {
                    formData.append("chapterNumber", fileRecord.chapterNumber);
                }

                if (fileRecord.accessibleBoards.length > 0) {
                    fileRecord.accessibleBoards.forEach(boardId => {
                        formData.append("accessibleBoards", boardId);
                    });
                }

                // Use async action
                const result = await ingestChapterAsync(formData);

                if (result.success) {
                    successCount++;
                    setUploadingFiles(prev => {
                        const updated = [...prev];
                        updated[i] = { ...updated[i], status: 'success' };
                        return updated;
                    });
                } else {
                    errorCount++;
                    setUploadingFiles(prev => {
                        const updated = [...prev];
                        updated[i] = { ...updated[i], status: 'error', error: result.error };
                        return updated;
                    });
                }
            } catch (err) {
                errorCount++;
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setUploadingFiles(prev => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'error', error: errorMessage };
                    return updated;
                });
            }
        }

        if (successCount > 0) {
            toast.success(`Started processing ${successCount} chapter(s).`);
        }
        if (errorCount > 0) {
            toast.error(`Failed to upload ${errorCount} chapter(s).`);
        }

        setIsLoading(false);

        if (successCount > 0 && errorCount === 0) {
            setTimeout(() => {
                router.push("/admin/chapters");
                router.refresh();
            }, 1000);
        }
    }

    async function handleTextbookSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!textbookSubjectId) {
            toast.error("Please select a subject");
            return;
        }

        if (detectedChapters.length === 0) {
            toast.error("No chapters detected. Please analyze the textbook first.");
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("subjectId", textbookSubjectId);
            formData.append("chapters", JSON.stringify(detectedChapters));
            formData.append("fullPages", JSON.stringify(fullPages));

            if (textbookBoards.length > 0) {
                textbookBoards.forEach(boardId => {
                    formData.append("accessibleBoards", boardId);
                });
            }

            if (textbookFile) {
                formData.append("file", textbookFile);
            }

            // Use async action - creates chapters immediately with PENDING status
            const { batchCreateChaptersAsync } = await import('../actions-async');
            const result = await batchCreateChaptersAsync(formData);

            if (result.success) {
                toast.success(result.message || `Created ${detectedChapters.length} chapters - Processing in background`);
                // Redirect immediately - no waiting!
                router.push("/admin/chapters");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to create chapters");
                setIsLoading(false);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to create chapters");
            setIsLoading(false);
        }
    }

    function updateChapter(id: string, updates: Partial<DetectedChapter>) {
        setDetectedChapters(prev => prev.map(ch =>
            ch.id === id ? { ...ch, ...updates } : ch
        ));
    }

    function deleteChapter(id: string) {
        setDetectedChapters(prev => prev.filter(ch => ch.id !== id));
    }

    function mergeChapters(id1: string, id2: string) {
        const ch1 = detectedChapters.find(c => c.id === id1);
        const ch2 = detectedChapters.find(c => c.id === id2);

        if (!ch1 || !ch2) return;

        const merged = TextbookSplitter.mergeChapters(ch1, ch2);
        setDetectedChapters(prev => prev
            .filter(c => c.id !== id1 && c.id !== id2)
            .concat(merged)
            .sort((a, b) => a.startPage - b.startPage)
        );
    }

    return (
        <div className="space-y-6">
            {/* Upload Mode Selection */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Upload Mode</h2>
                <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={uploadMode === 'individual'}
                            onChange={() => setUploadMode('individual')}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium">Individual Chapters (up to 5 files)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={uploadMode === 'textbook'}
                            onChange={() => setUploadMode('textbook')}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium">Whole Textbook (auto-split)</span>
                    </label>
                </div>
            </div>

            {/* Individual Chapters Mode */}
            {uploadMode === 'individual' && (
                <form onSubmit={handleIndividualSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Program (Optional)
                        </label>
                        <select
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value ? parseInt(e.target.value) : "")}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            <option value="">All Programs</option>
                            {programs.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.board.name}{p.institution ? ` - ${p.institution.name}` : ""})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            PDF Files *
                            {uploadingFiles.length > 0 && (
                                <span className="ml-2 text-sm text-gray-500">
                                    ({uploadingFiles.filter(f => f.status === 'success').length}/{uploadingFiles.length} uploaded)
                                </span>
                            )}
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            multiple
                            onChange={handleFileSelect}
                            disabled={isLoading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Upload up to 5 PDF files (max 100MB each).
                        </p>
                    </div>

                    {/* File List - Same as before (keeping existing code) */}
                    {uploadingFiles.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">Files to Upload</h3>
                            {uploadingFiles.map((fileRecord, index) => (
                                <div key={index} className="p-4 border rounded-md bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{fileRecord.file.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {(fileRecord.file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        {fileRecord.status !== 'pending' && (
                                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${fileRecord.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                                                fileRecord.status === 'success' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {fileRecord.status}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                                            <input
                                                type="text"
                                                value={fileRecord.title}
                                                onChange={(e) => {
                                                    const updated = [...uploadingFiles];
                                                    updated[index].title = e.target.value;
                                                    setUploadingFiles(updated);
                                                }}
                                                disabled={isLoading}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Chapter Number</label>
                                            <input
                                                type="number"
                                                value={fileRecord.chapterNumber}
                                                onChange={(e) => {
                                                    const updated = [...uploadingFiles];
                                                    updated[index].chapterNumber = e.target.value;
                                                    setUploadingFiles(updated);
                                                }}
                                                disabled={isLoading}
                                                placeholder="Optional"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                                        <select
                                            value={fileRecord.subjectId}
                                            onChange={(e) => {
                                                const updated = [...uploadingFiles];
                                                updated[index].subjectId = e.target.value;
                                                setUploadingFiles(updated);
                                            }}
                                            disabled={isLoading}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                        >
                                            <option value="">Select Subject</option>
                                            {filteredSubjects.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.program.name} - {s.program.board.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Accessible Boards</label>
                                        <p className="text-xs text-gray-500 mb-1">Hold Ctrl/Cmd to select multiple.</p>
                                        <select
                                            multiple
                                            value={fileRecord.accessibleBoards}
                                            onChange={(e) => {
                                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                const updated = [...uploadingFiles];
                                                updated[index].accessibleBoards = selected;
                                                setUploadingFiles(updated);
                                            }}
                                            disabled={isLoading}
                                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm border p-2 h-24"
                                        >
                                            <option value="GLOBAL">GLOBAL (All Boards)</option>
                                            {boards.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {fileRecord.error && (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                            Error: {fileRecord.error}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || uploadingFiles.length === 0}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Ingesting..." : `Ingest ${uploadingFiles.length} Chapter(s)`}
                        </button>
                    </div>
                </form>
            )}

            {/* Textbook Mode */}
            {uploadMode === 'textbook' && (
                <form onSubmit={handleTextbookSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Textbook PDF *
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 500 * 1024 * 1024) {
                                        toast.error("File too large. Maximum size is 500MB.");
                                        e.target.value = "";
                                        return;
                                    }
                                    setTextbookFile(file);
                                    setDetectedChapters([]);
                                }
                            }}
                            disabled={isLoading || isAnalyzing}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Upload a complete textbook PDF (max 500MB). System will auto-detect chapters.
                        </p>
                    </div>

                    {textbookFile && detectedChapters.length === 0 && (
                        <div>
                            {!isAnalyzing ? (
                                <button
                                    type="button"
                                    onClick={handleTextbookAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Analyze & Detect Chapters
                                </button>
                            ) : (
                                <div className="w-full border border-blue-200 rounded-lg p-6 bg-blue-50">
                                    <div className="flex flex-col items-center space-y-4">
                                        {/* Animated Spinner */}
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Progress Text */}
                                        <div className="text-center">
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                                                Analyzing Textbook...
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Processing PDF with LlamaParse AI
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                This may take 1-3 minutes for large files. Please wait...
                                            </p>
                                        </div>

                                        {/* Animated Progress Dots */}
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Detected Chapters Preview */}
                    {detectedChapters.length > 0 && (
                        <>
                            <div>
                                <h3 className="font-medium text-gray-900 mb-4">
                                    Detected {detectedChapters.length} Chapter(s)
                                </h3>

                                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                    {detectedChapters.map((chapter, index) => (
                                        <div key={chapter.id} className="border rounded-lg p-4 bg-gray-50 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-semibold text-gray-500">Chapter {index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteChapter(chapter.id)}
                                                    className="text-red-600 hover:text-red-800 text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                value={chapter.title}
                                                onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                                                className="w-full text-sm font-medium border rounded px-2 py-1"
                                            />

                                            <div className="text-xs text-gray-600">
                                                Pages {chapter.startPage}-{chapter.endPage}
                                            </div>

                                            <p className="text-xs text-gray-500 line-clamp-3">
                                                {chapter.previewText}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                                <select
                                    value={textbookSubjectId}
                                    onChange={(e) => setTextbookSubjectId(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.program.name} - {s.program.board.name})
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    All detected chapters will be created under this subject.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Accessible Boards</label>
                                <select
                                    multiple
                                    value={textbookBoards}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setTextbookBoards(selected);
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm border p-2 h-24"
                                >
                                    <option value="GLOBAL">GLOBAL (All Boards)</option>
                                    {boards.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    applies to all chapters in this textbook.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDetectedChapters([]);
                                        setTextbookFile(null);
                                    }}
                                    disabled={isLoading}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Start Over
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !textbookSubjectId}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Creating..." : `Create ${detectedChapters.length} Chapters`}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            )}
        </div>
    );
}
