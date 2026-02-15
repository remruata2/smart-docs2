'use client';

import { useState } from "react";
import { createBoard } from "@/app/actions/admin";
import { useRouter } from "next/navigation";

interface Country {
    id: string;
    name: string;
}

export default function BoardForm({ countries }: { countries: Country[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const result = await createBoard(formData);
            if (!result.success) {
                setError(result.error || "Failed to create board");
            } else {
                // Reset form? The page will revalidate, but the form inputs remain.
                // We can use a ref to reset, or just rely on the user seeing the new board.
                // Ideally, we clear the inputs.
                const form = document.getElementById("create-board-form") as HTMLFormElement;
                form?.reset();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Board</h2>
            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            <form id="create-board-form" action={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Board ID (e.g., CBSE)</label>
                    <input type="text" name="id" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <select name="countryId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State (Optional)</label>
                    <input type="text" name="state" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <div className="flex items-center h-10 pb-2">
                    <input
                        id="hideTextbook"
                        name="hideTextbook"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hideTextbook" className="ml-2 block text-sm text-gray-900">
                        Hide Textbook Tab
                    </label>
                </div>
                <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {isLoading ? "Adding..." : "Add Board"}
                </button>
            </form>
        </div>
    );
}
