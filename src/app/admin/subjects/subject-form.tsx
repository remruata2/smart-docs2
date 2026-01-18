'use client';

import { useState, useEffect } from "react";
import { createSubject } from "@/app/actions/admin-extended";

interface Program {
    id: number;
    name: string;
    board: {
        name: string;
    };
}

interface Exam {
    id: string;
    code: string;
    name: string;
    short_name: string | null;
}

export default function SubjectForm({ programs }: { programs: Program[] }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);

    useEffect(() => {
        async function fetchExams() {
            try {
                const res = await fetch('/api/admin/exams');
                if (res.ok) {
                    const data = await res.json();
                    setExams(data.exams || []);
                }
            } catch (error) {
                console.error('Failed to fetch exams:', error);
            }
        }
        fetchExams();
    }, []);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            await createSubject(formData);
            const form = document.getElementById("create-subject-form") as HTMLFormElement;
            form?.reset();
        } catch (err: any) {
            setError(err.message || "Failed to create subject");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Subject</h2>
            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            <form id="create-subject-form" action={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Program *</label>
                    <select name="programId" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">Select Program</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.board.name})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject Name *</label>
                    <input type="text" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Physics" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Code (Optional)</label>
                    <input type="text" name="code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="PHY" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Target Exam (Optional)</label>
                    <select name="examId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">None</option>
                        {exams.length === 0 ? (
                            <option value="" disabled>Loading exams...</option>
                        ) : (
                            exams.map(exam => (
                                <option key={exam.id} value={exam.id}>
                                    {exam.short_name || exam.name} ({exam.code})
                                </option>
                            ))
                        )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Categorize by target exam ({exams.length} available)
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Term/Semester (Optional)</label>
                    <input type="text" name="term" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Semester 1" />
                </div>
                <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {isLoading ? "Adding..." : "Add Subject"}
                </button>
            </form>
        </div>
    );
}
