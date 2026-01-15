'use client';

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wand2, Sparkles, Loader2, Trash2, FileSearch, Zap, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChapterListClientProps {
    chapters: any[];
    onDelete: (ids: string[]) => Promise<void>;
}

export default function ChapterListClient({ chapters, onDelete }: ChapterListClientProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Check if any chapters are still processing
    const hasProcessingChapters = chapters.some(
        ch => ch.processing_status === 'PENDING' || ch.processing_status === 'PROCESSING'
    );

    const handleGenerateMaterials = async (chapterId: string) => {
        startTransition(async () => {
            try {
                // We'll use the same action we just restricted
                const { generateStudyMaterialsAction } = await import("@/app/app/study/actions");
                await generateStudyMaterialsAction(chapterId);
                toast.success("Study materials generated successfully");
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to generate materials");
            }
        });
    };

    const handleRegenerateQuiz = async (chapterId: string, title: string) => {
        if (!confirm(`This will delete ALL existing questions for "${title}" and generate new ones using current settings. Continue?`)) {
            return;
        }

        startTransition(async () => {
            try {
                const { regenerateChapterQuizAction } = await import("./actions");
                await regenerateChapterQuizAction(chapterId);
                toast.success("Quiz regeneration started in background");
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to start quiz regeneration");
            }
        });
    };

    const handleBulkGenerate = async () => {
        if (selectedIds.size === 0) return;

        startTransition(async () => {
            try {
                const { generateStudyMaterialsAction } = await import("@/app/app/study/actions");
                const ids = Array.from(selectedIds);
                let successCount = 0;
                let failCount = 0;

                for (const id of ids) {
                    try {
                        await generateStudyMaterialsAction(id);
                        successCount++;
                    } catch (e) {
                        failCount++;
                    }
                }

                if (successCount > 0) toast.success(`Generated materials for ${successCount} chapters`);
                if (failCount > 0) toast.error(`Failed for ${failCount} chapters`);

                setSelectedIds(new Set());
                router.refresh();
            } catch (error: any) {
                toast.error("Bulk generation failed");
            }
        });
    };

    // Auto-refresh when chapters are processing
    useEffect(() => {
        if (!hasProcessingChapters) return;

        const interval = setInterval(() => {
            router.refresh();
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [hasProcessingChapters, router]);

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === chapters.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(chapters.map(c => c.id.toString())));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) {
            toast.error("No chapters selected");
            return;
        }

        if (!confirm(`Delete ${selectedIds.size} selected chapter(s)?`)) {
            return;
        }

        startTransition(async () => {
            try {
                await onDelete(Array.from(selectedIds));
                toast.success(`Deleted ${selectedIds.size} chapter(s)`);
                setSelectedIds(new Set());
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to delete chapters");
            }
        });
    };

    const handleDeleteIndividual = async (id: string, title: string) => {
        if (!confirm(`Permanently delete chapter "${title}"? This cannot be undone.`)) {
            return;
        }

        startTransition(async () => {
            try {
                await onDelete([id]);
                toast.success(`Chapter "${title}" deleted`);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to delete chapter");
            }
        });
    };

    const handleClearCache = async (id: string, title: string) => {
        if (!confirm(`Clear AI response cache for chapter "${title}"?`)) return;

        startTransition(async () => {
            try {
                const response = await fetch(`/api/admin/chapters/${id}/cache`, {
                    method: 'DELETE',
                });
                const data = await response.json();
                if (data.success) {
                    toast.success(`Cleared ${data.entriesCleared} entries for "${title}"`);
                } else {
                    toast.error("Failed to clear cache");
                }
            } catch (error) {
                toast.error("Error clearing cache");
            }
        });
    };

    function getStatusBadge(status: string) {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">🟡 Pending</span>;
            case 'PROCESSING':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">🔵 Processing</span>;
            case 'COMPLETED':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">🟢 Ready</span>;
            case 'FAILED':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">🔴 Failed</span>;
            default:
                return null;
        }
    }

    return (
        <div>
            {/* Processing Notice */}
            {hasProcessingChapters && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-blue-900">
                        {chapters.filter(ch => ch.processing_status === 'PROCESSING').length} chapter(s) processing... Auto-refreshing every 5 seconds
                    </span>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-900">
                        {selectedIds.size} chapter(s) selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkGenerate}
                            disabled={isPending}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isPending ? "Processing..." : "Generate Materials"}
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isPending}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                        >
                            {isPending ? "Deleting..." : "Delete Selected"}
                        </button>
                    </div>
                </div>
            )}

            {/* Chapters List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {/* Select All Row */}
                    <li className="bg-gray-50 border-b-2 border-gray-300">
                        <div className="px-4 py-3 flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === chapters.length && chapters.length > 0}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-3 text-sm font-medium text-gray-700">
                                Select All ({chapters.length})
                            </label>
                        </div>
                    </li>

                    {chapters.map((chapter) => (
                        <li key={chapter.id} className="hover:bg-gray-50 transition">
                            <div className="px-4 py-4 sm:px-6 flex items-start gap-4">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(chapter.id.toString())}
                                    onChange={() => toggleSelect(chapter.id.toString())}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />

                                {/* Chapter Content - Clickable */}
                                <div
                                    className="flex-1 cursor-pointer"
                                    onClick={() => router.push(`/admin/chapters/${chapter.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base font-bold text-indigo-600">
                                                {chapter.title}
                                            </span>
                                            {getStatusBadge(chapter.processing_status)}
                                            {chapter.is_global && (
                                                <span className="px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                    Global
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${chapter.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {chapter.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {chapter.pdf_url && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                >
                                                    <a href={chapter.pdf_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                        <FileSearch className="w-4 h-4 mr-2" />
                                                        PDF
                                                    </a>
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateMaterials(chapter.id.toString());
                                                }}
                                                disabled={isPending}
                                                className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                title="Generate Study Materials"
                                            >
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                Generate
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRegenerateQuiz(chapter.id.toString(), chapter.title);
                                                }}
                                                disabled={isPending}
                                                className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                                                title="Regenerate Quiz Questions"
                                            >
                                                <Dices className="w-4 h-4 mr-2" />
                                                Regen Quiz
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteIndividual(chapter.id.toString(), chapter.title);
                                                }}
                                                disabled={isPending}
                                                className="h-8 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearCache(chapter.id.toString(), chapter.title);
                                                }}
                                                disabled={isPending}
                                                className="h-8 border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                                                title="Clear AI Cache"
                                            >
                                                <Zap className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Subject:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{chapter.subject.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Program:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{chapter.subject.program.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Board:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{chapter.subject.program.board.name}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Chunks:</span>
                                                <span className="tabular-nums font-medium">{chapter._count.chunks}</span>
                                            </div>
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Pages:</span>
                                                <span className="tabular-nums font-medium">{chapter._count.pages}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {chapter.processing_status === 'FAILED' && chapter.error_message && (
                                        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-md flex items-start gap-2">
                                            <span className="font-bold shrink-0">Error:</span>
                                            <span>{chapter.error_message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                    {chapters.length === 0 && (
                        <li className="px-4 py-4 text-center text-gray-500">No chapters found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
