'use client';

import { useState } from "react";
import { updateProgram } from "@/app/actions/admin-extended";
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

interface Board {
    id: string;
    name: string;
}

interface Institution {
    id: bigint;
    name: string;
    board_id: string;
}

interface Program {
    id: number;
    name: string;
    board_id: string;
    institution_id: bigint | null;
    code: string | null;
    level: string | null;
    duration_years: number | null;
}

interface EditProgramDialogProps {
    program: Program;
    boards: Board[];
    institutions: Institution[];
}

export default function EditProgramDialog({ program, boards, institutions }: EditProgramDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState<string>(program.board_id);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await updateProgram(program.id, formData);
            if (!result.success) {
                toast.error(result.error || "Failed to update program");
            } else {
                toast.success("Program updated successfully");
                setOpen(false);
                router.refresh();
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    const filteredInstitutions = institutions.filter(i => !selectedBoard || i.board_id === selectedBoard);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 p-2 h-auto" title="Edit Program" onClick={(e) => e.stopPropagation()}>
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Program: {program.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Board</label>
                            <select
                                name="boardId"
                                value={selectedBoard}
                                onChange={(e) => setSelectedBoard(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                {boards.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={program.name}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Institution (Optional)</label>
                            <select
                                name="institutionId"
                                defaultValue={program.institution_id?.toString() || ""}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                <option value="">Board-level</option>
                                {filteredInstitutions.map(i => (
                                    <option key={i.id.toString()} value={i.id.toString()}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Code</label>
                            <input
                                type="text"
                                name="code"
                                defaultValue={program.code || ''}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Level</label>
                            <select
                                name="level"
                                defaultValue={program.level || ""}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
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
                            <input
                                type="number"
                                name="durationYears"
                                defaultValue={program.duration_years || ''}
                                min="1"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
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
