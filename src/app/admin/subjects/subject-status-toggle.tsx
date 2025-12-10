'use client';

import { updateSubjectStatus } from "@/app/actions/admin-extended";
import { useState } from "react";

export default function SubjectStatusToggle({
    subjectId,
    isActive
}: {
    subjectId: number;
    isActive: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggle(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        try {
            await updateSubjectStatus(subjectId, !isActive);
        } catch (error) {
            console.error("Failed to toggle status", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
            {isLoading ? "Updating..." : (isActive ? 'Deactivate' : 'Activate')}
        </button>
    );
}
