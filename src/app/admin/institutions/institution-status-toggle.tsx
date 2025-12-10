'use client';

import { updateInstitutionStatus } from "@/app/actions/admin-extended";
import { useState } from "react";

export default function InstitutionStatusToggle({
    institutionId,
    isActive
}: {
    institutionId: bigint;
    isActive: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggle(e: React.MouseEvent) {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Stop event bubbling
        setIsLoading(true);
        try {
            await updateInstitutionStatus(institutionId, !isActive);
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
