"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider"; // Check if slider exists, else use input
import { Settings, Loader2 } from "lucide-react";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Assumed imports - adjust if needed
// We might not have Slider component yet. I'll check.

interface BattleSettingsDialogProps {
    battleId: string;
    currentSettings: {
        subjectId: number;
        chapterId: number | null;
        questionCount: number;
        durationMinutes: number;
    };
    onUpdate: () => void;
}

export function BattleSettingsDialog({ battleId, currentSettings, onUpdate }: BattleSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);

    // Form State
    const [subjectId, setSubjectId] = useState<string>(currentSettings.subjectId.toString());
    const [chapterId, setChapterId] = useState<string>(currentSettings.chapterId?.toString() || "all");
    const [questionCount, setQuestionCount] = useState<number>(currentSettings.questionCount);
    const [duration, setDuration] = useState<string>(currentSettings.durationMinutes.toString());

    // Fetch subjects on mount/open
    useEffect(() => {
        if (open && subjects.length === 0) {
            getSubjectsForUserProgram(undefined, false).then(data => {
                if (data?.enrollments) {
                    const allSubjects = data.enrollments.flatMap(e => e.course.subjects);
                    setSubjects(allSubjects);
                }
            });
        }
    }, [open, subjects.length]);

    // Update chapters when subject changes
    useEffect(() => {
        const selectedSubject = subjects.find(s => s.id.toString() === subjectId);
        if (selectedSubject) {
            setChapters(selectedSubject.chapters || []);
        } else {
            setChapters([]);
        }
    }, [subjectId, subjects]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/battle/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    battleId,
                    subjectId: parseInt(subjectId),
                    chapterId: chapterId === "all" ? null : parseInt(chapterId),
                    questionCount,
                    durationMinutes: parseInt(duration)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update settings");
            }

            toast.success("Battle settings updated!");
            setOpen(false);
            onUpdate(); // Trigger parent refresh if needed (though broadcast handles it)
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700">
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Battle Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Subject */}
                    <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={subjectId} onValueChange={(val) => { setSubjectId(val); setChapterId("all"); }}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                                <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-slate-800 focus:text-slate-100">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Chapter */}
                    <div className="space-y-2">
                        <Label>Chapter</Label>
                        <Select value={chapterId} onValueChange={setChapterId}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                                <SelectValue placeholder="All Chapters (Mixed)" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                <SelectItem value="all" className="focus:bg-slate-800 focus:text-slate-100">All Chapters (Mixed)</SelectItem>
                                {chapters.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-slate-800 focus:text-slate-100">{c.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Questions */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Questions</Label>
                            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 rounded">
                                {questionCount}
                            </span>
                        </div>
                        {/* Use simple range input for now to avoid dependency check issues */}
                        <input
                            type="range"
                            min="5"
                            max="20"
                            step="1"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>5</span>
                            <span>20</span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label>Total Duration</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {[3, 5, 10, 15].map(mins => (
                                <Button
                                    key={mins}
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDuration(mins.toString())}
                                    className={`
                                        h-10 border-slate-700 hover:bg-slate-800 hover:text-white
                                        ${duration === mins.toString()
                                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 pointer-events-none"
                                            : "bg-slate-950 text-slate-400"}
                                    `}
                                >
                                    {mins}m
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
