'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";

interface Subject {
    id: number;
    name: string;
    program: {
        name: string;
        board: {
            name: string;
        };
    };
}

interface Chapter {
    id: string;
    title: string;
    subject_id: number;
    chapter_number: number | null;
    is_active: boolean;
    is_global: boolean;
    subject: {
        name: string;
        program: {
            name: string;
            board: {
                name: string;
            };
        };
    };
}

interface EditChapterDialogProps {
    chapter: Chapter & { quizzes_enabled: boolean };
    subjects: Subject[];
    exams: any[];
    onUpdate: (
        chapterId: string,
        data: {
            title: string;
            subject_id: number;
            chapter_number: number | null;
            is_active: boolean;
            is_global: boolean;
            quizzes_enabled: boolean;
        }
    ) => Promise<{ success: boolean; error?: string }>;
}

export default function EditChapterDialog({
    chapter,
    subjects,
    exams,
    onUpdate,
}: EditChapterDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState(chapter.title);
    const [subjectId, setSubjectId] = useState(chapter.subject_id.toString());
    const [chapterNumber, setChapterNumber] = useState(
        chapter.chapter_number?.toString() || ""
    );
    const [isActive, setIsActive] = useState(chapter.is_active);
    const [isGlobal, setIsGlobal] = useState(chapter.is_global);
    const [quizzesEnabled, setQuizzesEnabled] = useState(chapter.quizzes_enabled);

    // Exam filter state (not saved, just UI helper)
    const [filterExamId, setFilterExamId] = useState<string>("ALL");

    // Reset form when chapter changes or dialog opens
    useEffect(() => {
        if (open) {
            setTitle(chapter.title);
            setSubjectId(chapter.subject_id.toString());
            setChapterNumber(chapter.chapter_number?.toString() || "");
            setIsActive(chapter.is_active);
            setIsGlobal(chapter.is_global);
            setQuizzesEnabled(chapter.quizzes_enabled);

            // Try to auto-set filter based on current subject
            const currentSub = subjects.find(s => s.id === chapter.subject_id);
            /* @ts-ignore */
            if (currentSub?.exam_id) {
                /* @ts-ignore */
                setFilterExamId(currentSub.exam_id);
            } else {
                setFilterExamId("ALL");
            }
        }
    }, [open, chapter, subjects]);

    // Filter subjects
    const filteredSubjects = filterExamId === "ALL"
        ? subjects
        /* @ts-ignore */
        : subjects.filter(s => s.exam_id === filterExamId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Chapter title is required");
            return;
        }

        if (!subjectId) {
            toast.error("Please select a subject");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await onUpdate(chapter.id, {
                title: title.trim(),
                subject_id: parseInt(subjectId),
                chapter_number: chapterNumber ? parseInt(chapterNumber) : null,
                is_active: isActive,
                is_global: isGlobal,
                quizzes_enabled: quizzesEnabled,
            });

            if (result.success) {
                toast.success("Chapter updated successfully");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update chapter");
            }
        } catch (error: any) {
            toast.error(error.message || "Error updating chapter");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasChanges =
        title !== chapter.title ||
        subjectId !== chapter.subject_id.toString() ||
        chapterNumber !== (chapter.chapter_number?.toString() || "") ||
        isActive !== chapter.is_active ||
        isGlobal !== chapter.is_global ||
        quizzesEnabled !== chapter.quizzes_enabled;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50"
                    title="Edit Chapter"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Edit Chapter</DialogTitle>
                    <DialogDescription>
                        Update chapter details. Changes will be saved immediately.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">
                            Chapter Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter chapter title"
                            className="h-10"
                        />
                    </div>

                    {/* Exam Filter & Subject Selection */}
                    <div className="space-y-4 bg-gray-50 p-3 rounded-md border">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase">
                                Step 1: Filter by Exam (Optional)
                            </Label>
                            <Select value={filterExamId} onValueChange={setFilterExamId}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="All Exams" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Exams</SelectItem>
                                    {exams.map((exam: any) => (
                                        <SelectItem key={exam.id} value={exam.id}>
                                            {exam.short_name || exam.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject" className="text-sm font-medium">
                                Step 2: Select Subject <span className="text-red-500">*</span>
                            </Label>
                            <Select value={subjectId} onValueChange={setSubjectId}>
                                <SelectTrigger id="subject" className="h-10">
                                    <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {filteredSubjects.map((subject) => (
                                        <SelectItem
                                            key={subject.id}
                                            value={subject.id.toString()}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">{subject.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {subject.program.name} • {subject.program.board.name}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {subjectId !== chapter.subject_id.toString() && (
                                <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ Changing the subject will move this chapter to a different subject.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Chapter Number */}
                    <div className="space-y-2">
                        <Label htmlFor="chapterNumber" className="text-sm font-medium">
                            Chapter Number
                        </Label>
                        <Input
                            id="chapterNumber"
                            type="number"
                            value={chapterNumber}
                            onChange={(e) => setChapterNumber(e.target.value)}
                            placeholder="Optional chapter number"
                            min={1}
                            className="h-10"
                        />
                    </div>

                    {/* Status Toggles */}
                    <div className="flex flex-col gap-4 pt-2">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="isActive"
                                checked={isActive}
                                onCheckedChange={(checked) => setIsActive(checked === true)}
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                                    Active
                                </Label>
                                <span className="text-xs text-gray-500">
                                    Inactive chapters won&apos;t appear in student views
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="isGlobal"
                                checked={isGlobal}
                                onCheckedChange={(checked) => setIsGlobal(checked === true)}
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="isGlobal" className="text-sm font-medium cursor-pointer">
                                    Global Chapter
                                </Label>
                                <span className="text-xs text-gray-500">
                                    Global chapters are accessible across all boards
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="quizzesEnabled"
                                checked={quizzesEnabled}
                                onCheckedChange={(checked) => setQuizzesEnabled(checked === true)}
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="quizzesEnabled" className="text-sm font-medium cursor-pointer">
                                    Quizzes Enabled
                                </Label>
                                <span className="text-xs text-gray-500">
                                    Allow students to take mock tests for this chapter
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !hasChanges}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
