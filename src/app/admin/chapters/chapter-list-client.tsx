'use client';

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isPending}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {isPending ? "Deleting..." : "Delete Selected"}
                    </button>
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
                                            <span className="text-sm font-medium text-indigo-600">
                                                {chapter.title}
                                            </span>
                                            {getStatusBadge(chapter.processing_status)}
                                            {chapter.is_global && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    Global
                                                </span>
                                            )}
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${chapter.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {chapter.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Subject: {chapter.subject.name}
                                            </p>
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Program: {chapter.subject.program.name}
                                            </p>
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Board: {chapter.subject.program.board.name}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p className="mr-4">Chunks: {chapter._count.chunks}</p>
                                            <p>Pages: {chapter._count.pages}</p>
                                        </div>
                                    </div>
                                    {chapter.processing_status === 'FAILED' && chapter.error_message && (
                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                            Error: {chapter.error_message}
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
