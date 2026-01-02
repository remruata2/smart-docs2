"use client";

import { useState, useEffect } from "react";
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
import { Pencil, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfileInstitution } from "./actions";

interface Board {
    id: string;
    name: string;
}

interface Institution {
    id: string;
    name: string;
}

interface ProfileEditFormProps {
    currentInstitutionId?: string;
    currentBoardId?: string;
}

export function ProfileEditForm({
    currentInstitutionId,
    currentBoardId,
}: ProfileEditFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [boards, setBoards] = useState<Board[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<string>(currentBoardId || "");
    const [selectedInstitution, setSelectedInstitution] = useState<string>(currentInstitutionId || "");

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

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const result = await updateProfileInstitution(selectedInstitution || null);
            if (result.success) {
                toast.success("Profile updated successfully");
                setOpen(false);
            }
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit institution</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Institution</DialogTitle>
                    <DialogDescription>
                        Update your academic institution or education board.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="board">Education Board</Label>
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
                            disabled={!selectedBoard || (institutions.length === 0 && selectedBoard !== currentBoardId)}
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
                                <SelectItem value="none">None / Independent</SelectItem>
                                {institutions.map((inst) => (
                                    <SelectItem key={inst.id} value={inst.id.toString()}>
                                        {inst.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
