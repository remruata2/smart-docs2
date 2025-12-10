'use client';

import { useState } from "react";
import { createInstitution } from "@/app/actions/admin-extended";
import { useRouter } from "next/navigation";

interface Board {
    id: string;
    name: string;
}

export default function InstitutionForm({ boards }: { boards: Board[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            await createInstitution(formData);
            const form = document.getElementById("create-institution-form") as HTMLFormElement;
            form?.reset();
        } catch (err: any) {
            setError(err.message || "Failed to create institution");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Institution</h2>
            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            <form id="create-institution-form" action={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Delhi Public School" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select name="type" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">Select Type</option>
                        <option value="school">School</option>
                        <option value="college">College</option>
                        <option value="university">University</option>
                        <option value="coaching_center">Coaching Center</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Board</label>
                    <select name="boardId" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                        <option value="">Select Board</option>
                        {boards.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">District (Optional)</label>
                    <input type="text" name="district" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State (Optional)</label>
                    <input type="text" name="state" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {isLoading ? "Adding..." : "Add Institution"}
                </button>
            </form>
        </div>
    );
}
