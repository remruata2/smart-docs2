'use client';

import { useState, useEffect } from "react";
import { updateSubject } from "@/app/actions/admin-extended";
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

interface Program {
    id: number;
    name: string;
    board: {
        name: string;
    };
}

interface Subject {
    id: number;
    name: string;
    program_id: number;
    code: string | null;
    term: string | null;
    exam_id?: string | null;
    quizzes_enabled: boolean;
}

interface Exam {
    id: string;
    code: string;
    name: string;
    short_name: string | null;
}

interface EditSubjectDialogProps {
    subject: Subject;
    programs: Program[];
}

export default function EditSubjectDialog({ subject, programs }: EditSubjectDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [exams, setExams] = useState<Exam[]>([]);

    // Fetch exams when dialog opens
    useEffect(() => {
        if (open) {
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
        }
    }, [open]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await updateSubject(subject.id, formData);
            if (!result.success) {
                toast.error(result.error || "Failed to update subject");
            } else {
                toast.success("Subject updated successfully");
                setOpen(false);
                router.refresh();
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 p-2 h-auto" title="Edit Subject" onClick={(e) => e.stopPropagation()}>
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Subject: {subject.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Program</label>
                        <select
                            name="programId"
                            defaultValue={subject.program_id}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.board.name})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={subject.name}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Code (Optional)</label>
                        <input
                            type="text"
                            name="code"
                            defaultValue={subject.code || ''}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Exam (Optional)</label>
                        <select
                            name="examId"
                            defaultValue={subject.exam_id || ''}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            <option value="">None</option>
                            {exams.map(exam => (
                                <option key={exam.id} value={exam.id}>
                                    {exam.short_name || exam.name} ({exam.code})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Categorize by target exam</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Term/Semester (Optional)</label>
                        <input
                            type="text"
                            name="term"
                            defaultValue={subject.term || ''}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id={`quizzesEnabled-${subject.id}`}
                            name="quizzesEnabled"
                            value="true"
                            defaultChecked={subject.quizzes_enabled}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`quizzesEnabled-${subject.id}`} className="text-sm font-medium text-gray-700">
                            Quizzes Enabled (Mock Tests)
                        </label>
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
