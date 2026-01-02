"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { School, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { enrollInCourse } from "@/app/(browse)/actions";

interface Board {
    id: string;
    name: string;
}

interface Institution {
    id: string;
    name: string;
}

interface CourseEnrollmentDialogProps {
    courseId: number;
    courseTitle: string;
    trigger?: React.ReactNode;
}

export function CourseEnrollmentDialog({
    courseId,
    courseTitle,
    trigger,
}: CourseEnrollmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [boards, setBoards] = useState<Board[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<string>("");
    const [selectedInstitution, setSelectedInstitution] = useState<string>("");
    const router = useRouter();

    // Fetch boards when dialog opens
    useEffect(() => {
        if (open) {
            fetchBoards();
        }
    }, [open]);

    // Fetch institutions when board changes
    useEffect(() => {
        if (selectedBoard) {
            fetchInstitutions(selectedBoard);
        } else {
            setInstitutions([]);
            setSelectedInstitution("");
        }
    }, [selectedBoard]);

    const fetchBoards = async () => {
        try {
            const res = await fetch("/api/dashboard/boards");
            if (res.ok) {
                const data = await res.json();
                setBoards(data.boards || []);
            }
        } catch (error) {
            console.error("Failed to fetch boards", error);
        }
    };

    const fetchInstitutions = async (boardId: string) => {
        try {
            const res = await fetch(`/api/dashboard/institutions?board_id=${boardId}`);
            if (res.ok) {
                const data = await res.json();
                setInstitutions(data.institutions || []);
            }
        } catch (error) {
            console.error("Failed to fetch institutions", error);
        }
    };

    const handleEnroll = async () => {
        setLoading(true);
        try {
            const result = await enrollInCourse(courseId, selectedInstitution || undefined);
            if (result.success) {
                toast.success(`Successfully enrolled in ${courseTitle}`);
                setOpen(false);
                router.refresh();
            }
        } catch (error) {
            toast.error("Failed to enroll in course");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 py-5 text-base font-bold">
                        Enroll Now
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enroll in {courseTitle}</DialogTitle>
                    <DialogDescription>
                        Select your institution to customize your learning experience (optional).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="board">Education Board (Recommended)</Label>
                        <Select
                            value={selectedBoard}
                            onValueChange={setSelectedBoard}
                        >
                            <SelectTrigger id="board">
                                <SelectValue placeholder="Select Board" />
                            </SelectTrigger>
                            <SelectContent>
                                {boards.map((board) => (
                                    <SelectItem key={board.id} value={board.id}>
                                        {board.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="institution">Institution (Optional)</Label>
                        <Select
                            value={selectedInstitution}
                            onValueChange={setSelectedInstitution}
                            disabled={!selectedBoard || institutions.length === 0}
                        >
                            <SelectTrigger id="institution">
                                <SelectValue placeholder={
                                    !selectedBoard
                                        ? "Select board first"
                                        : institutions.length === 0
                                            ? "No institutions found"
                                            : "Select Institution"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {institutions.map((inst) => (
                                    <SelectItem key={inst.id} value={inst.id}>
                                        {inst.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedBoard && institutions.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                No institutions registered for this board yet. You can still enroll!
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="submit"
                        onClick={handleEnroll}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enrolling...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Complete Enrollment
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
