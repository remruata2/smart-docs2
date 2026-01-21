'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSyllabusMetadata } from "@/app/actions/admin-extended";

interface EditSyllabusDialogProps {
    syllabus: any;
    programs: { id: string | number, name: string }[];
    exams: { id: string, name: string, short_name: string | null }[];
}

export default function EditSyllabusDialog({ syllabus, programs, exams }: EditSyllabusDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        try {
            const result = await updateSyllabusMetadata(syllabus.id, formData);
            if (result.success) {
                toast.success("Syllabus updated successfully");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update syllabus");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 p-2 h-auto" title="Edit Syllabus Details" onClick={(e) => e.stopPropagation()}>
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Syllabus Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            defaultValue={syllabus.title}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                name="subject"
                                defaultValue={syllabus.subject}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="classLevel">Class Level</Label>
                            <Input
                                id="classLevel"
                                name="classLevel"
                                defaultValue={syllabus.class_level}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stream">Stream (Optional)</Label>
                            <Select
                                key={`stream-${syllabus.id}-${syllabus.stream}`}
                                name="stream"
                                defaultValue={syllabus.stream || "none"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Stream" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Arts">Arts</SelectItem>
                                    <SelectItem value="Science">Science</SelectItem>
                                    <SelectItem value="Commerce">Commerce</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="board">Board</Label>
                            <Input
                                id="board"
                                name="board"
                                defaultValue={syllabus.board || "MBSE"}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="examId">Target Exam</Label>
                        <Select
                            key={`exam-${syllabus.id}-${syllabus.exam_id}`}
                            name="examId"
                            defaultValue={syllabus.exam_id || "none"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Target Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None / All Exams</SelectItem>
                                {exams.map((exam) => (
                                    <SelectItem key={exam.id} value={exam.id}>
                                        {exam.short_name || exam.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground italic">
                            Categorizing by exam helps in filtering textbooks and generating exam-focused content.
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
