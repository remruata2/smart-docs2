'use client';

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteEntityButtonProps {
    entityId: string | number | bigint;
    entityName: string;
    entityType: 'Subject' | 'Program' | 'Institution' | 'Board' | 'Syllabus' | 'Exam';
    deleteAction: (id: any) => Promise<any>;
}

export default function DeleteEntityButton({
    entityId,
    entityName,
    entityType,
    deleteAction
}: DeleteEntityButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        const confirmMessage = entityType === 'Board' || entityType === 'Program' || entityType === 'Subject'
            ? `Permanently delete ${entityType} "${entityName}"? THIS WILL ALSO DELETE ALL ASSOCIATED CONTENT (Subjects, Chapters, and PDF files). This cannot be undone.`
            : `Permanently delete ${entityType} "${entityName}"? This cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await deleteAction(entityId);
            if (result.success) {
                toast.success(`${entityType} "${entityName}" deleted successfully`);
                router.refresh();
            } else {
                toast.error(result.error || `Failed to delete ${entityType}`);
            }
        } catch (error: any) {
            console.error(`Failed to delete ${entityType}`, error);
            toast.error(error.message || `Failed to delete ${entityType}`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
            title={`Delete ${entityType}`}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Trash2 className="w-4 h-4" />
            )}
        </Button>
    );
}
