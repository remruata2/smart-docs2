'use client';

import { useState, useTransition } from "react";
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

    return (
        <div>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-indigo-600">
                                                {chapter.title}
                                            </span>
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
