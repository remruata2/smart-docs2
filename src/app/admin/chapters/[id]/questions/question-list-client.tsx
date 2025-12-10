'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QuestionType } from "@/generated/prisma";
import { deleteQuestion, deleteMultipleQuestions } from "./actions";
import QuestionFormDialog from "./question-form-dialog";
import Link from "next/link";

interface Question {
    id: string;
    question_text: string;
    question_type: QuestionType;
    difficulty: string;
    options?: any;
    correct_answer: any;
    explanation?: string | null;
    points: number;
    is_active: boolean;
    created_at: Date;
}

interface QuestionListClientProps {
    chapter: any;
    initialQuestions: Question[];
    stats: {
        total: number;
        byDifficulty: Record<string, number>;
        byType: Record<string, number>;
    };
}

export default function QuestionListClient({
    chapter,
    initialQuestions,
    stats
}: QuestionListClientProps) {
    const [questions, setQuestions] = useState(initialQuestions);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Filter questions
    const filteredQuestions = questions.filter(q => {
        if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
        if (filterType !== "all" && q.question_type !== filterType) return false;
        if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this question?")) return;

        startTransition(async () => {
            try {
                await deleteQuestion(id);
                setQuestions(prev => prev.filter(q => q.id !== id));
                toast.success("Question deleted");
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to delete question");
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) {
            toast.error("No questions selected");
            return;
        }

        if (!confirm(`Delete ${selectedIds.size} selected question(s)?`)) return;

        startTransition(async () => {
            try {
                await deleteMultipleQuestions(Array.from(selectedIds));
                setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
                setSelectedIds(new Set());
                toast.success(`Deleted ${selectedIds.size} question(s)`);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to delete questions");
            }
        });
    };

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
        if (selectedIds.size === filteredQuestions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
        }
    };

    const getDifficultyBadge = (difficulty: string) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800',
            exam: 'bg-purple-100 text-purple-800'
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
        );
    };

    const getTypeBadge = (type: QuestionType) => {
        const labels = {
            MCQ: 'MCQ',
            TRUE_FALSE: 'T/F',
            FILL_IN_BLANK: 'Fill Blank',
            SHORT_ANSWER: 'Short',
            LONG_ANSWER: 'Essay'
        };
        return (
            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                {labels[type]}
            </span>
        );
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Link href="/admin/chapters" className="hover:text-indigo-600">Chapters</Link>
                    <span>/</span>
                    <Link href={`/admin/chapters/${chapter.id}`} className="hover:text-indigo-600">{chapter.title}</Link>
                    <span>/</span>
                    <span className="text-gray-900">Questions</span>
                </div>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">{chapter.title}</h1>
                        <p className="text-gray-600 mt-1">
                            {chapter.subject.name} • {chapter.subject.program.name} • {chapter.subject.program.board.name}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingQuestion(null);
                            setIsFormOpen(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Add New Question
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-green-600">{stats.byDifficulty.easy || 0}</div>
                    <div className="text-sm text-gray-600">Easy</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-yellow-600">{stats.byDifficulty.medium || 0}</div>
                    <div className="text-sm text-gray-600">Medium</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.byDifficulty.hard || 0}</div>
                    <div className="text-sm text-gray-600">Hard</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-blue-600">{stats.byType.MCQ || 0}</div>
                    <div className="text-sm text-gray-600">MCQs</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border rounded-md"
                    />
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-2 border rounded-md"
                    >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="exam">Exam (Past Papers)</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 border rounded-md"
                    >
                        <option value="all">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="FILL_IN_BLANK">Fill in Blank</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="LONG_ANSWER">Long Answer</option>
                    </select>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-900">
                        {selectedIds.size} question(s) selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isPending}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                        {isPending ? "Deleting..." : "Delete Selected"}
                    </button>
                </div>
            )}

            {/* Questions List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {/* Select All */}
                    <li className="bg-gray-50 border-b-2 border-gray-300">
                        <div className="px-4 py-3 flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-3 text-sm font-medium text-gray-700">
                                Select All ({filteredQuestions.length})
                            </label>
                        </div>
                    </li>

                    {filteredQuestions.map((question) => (
                        <li key={question.id} className="hover:bg-gray-50">
                            <div className="px-4 py-4 flex items-start gap-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(question.id)}
                                    onChange={() => toggleSelect(question.id)}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getDifficultyBadge(question.difficulty)}
                                        {getTypeBadge(question.question_type)}
                                        <span className="text-xs text-gray-500">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                        {question.question_text}
                                    </p>
                                    {question.explanation && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                            Explanation: {question.explanation}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingQuestion(question);
                                            setIsFormOpen(true);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(question.id)}
                                        disabled={isPending}
                                        className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}

                    {filteredQuestions.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No questions found. Create one to get started!
                        </li>
                    )}
                </ul>
            </div>

            {/* Question Form Dialog */}
            <QuestionFormDialog
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingQuestion(null);
                }}
                chapterId={chapter.id}
                question={editingQuestion}
                onSuccess={(newQuestion) => {
                    if (editingQuestion) {
                        setQuestions(prev => prev.map(q => q.id === newQuestion.id ? newQuestion : q));
                    } else {
                        setQuestions(prev => [newQuestion, ...prev]);
                    }
                    setIsFormOpen(false);
                    setEditingQuestion(null);
                    router.refresh();
                }}
            />
        </div>
    );
}
