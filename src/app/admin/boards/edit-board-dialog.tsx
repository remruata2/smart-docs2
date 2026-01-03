'use client';

import { useState } from "react";
import { updateBoard } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Country {
    id: string;
    name: string;
}

interface Board {
    id: string;
    name: string;
    country_id: string;
    state: string | null;
}

interface EditBoardDialogProps {
    board: Board;
    countries: Country[];
}

export default function EditBoardDialog({ board, countries }: EditBoardDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await updateBoard(formData);
            if (!result.success) {
                setError(result.error || "Failed to update board");
                toast.error(result.error || "Failed to update board");
            } else {
                toast.success("Board updated successfully");
                setOpen(false);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 p-2 h-auto" title="Edit Board" onClick={(e) => e.stopPropagation()}>
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Board: {board.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <input type="hidden" name="id" value={board.id} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Board Name</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={board.name}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Country</label>
                        <select
                            name="countryId"
                            defaultValue={board.country_id}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            {countries.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">State (Optional)</label>
                        <input
                            type="text"
                            name="state"
                            defaultValue={board.state || ''}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
