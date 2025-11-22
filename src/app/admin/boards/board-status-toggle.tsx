'use client';

import { updateBoardStatus } from "@/app/actions/admin";
import { useState } from "react";

export default function BoardStatusToggle({
    boardId,
    isActive
}: {
    boardId: string;
    isActive: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggle(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        try {
            await updateBoardStatus(boardId, !isActive);
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
