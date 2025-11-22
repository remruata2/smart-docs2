'use client';

import { useState } from "react";
import { createProgram } from "@/app/actions/admin-extended";

interface Board {
    id: string;
    name: string;
}

interface Institution {
    id: bigint;
    name: string;
    board_id: string;
}

export default function ProgramForm({
    boards,
    institutions
}: {
    boards: Board[];
    institutions: Institution[];
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedBoard, setSelectedBoard] = useState<string>("");

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            await createProgram(formData);
            const form = document.getElementById("create-program-form") as HTMLFormElement;
            form?.reset();
            setSelectedBoard("");
        } catch (err: any) {
            setError(err.message || "Failed to create program");
        } finally {
            setIsLoading(false);
        }
    }

    const filteredInstitutions = institutions.filter(i => !selectedBoard || i.board_id === selectedBoard);

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Program</h2>
            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            <form id="create-program-form" action={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Board</label>
                    <select
                        name="boardId"
                        required
                        value={selectedBoard}
                        onChange={(e) => setSelectedBoard(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Board</option>
                        {boards.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Class 10" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Institution (Optional)</label>
                    <select name="institutionId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">Board-level</option>
                        {filteredInstitutions.map(i => (
                            <option key={i.id.toString()} value={i.id.toString()}>{i.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <input type="text" name="code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="CLS10" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Level</label>
                    <select name="level" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">Select Level</option>
                        <option value="secondary">Secondary</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="postgraduate">Postgraduate</option>
                        <option value="competitive">Competitive</option>
                        <option value="professional">Professional</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (years)</label>
                    <input type="number" name="durationYears" min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {isLoading ? "Adding..." : "Add Program"}
                </button>
            </form>
        </div>
    );
}
