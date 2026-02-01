"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Loader2 } from "lucide-react";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForSubject } from "@/app/app/chapters/actions";

interface ChallengeModalProps {
    targetUser: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSendChallenge: (targetUser: any, subjectId: string, chapterId: string, subjectName: string, chapterName: string) => void;
}

export function ChallengeModal({ targetUser, isOpen, onClose, onSendChallenge }: ChallengeModalProps) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Fetch subjects on mount
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getSubjectsForUserProgram()
                .then((data) => {
                    if (data && data.enrollments) {
                        const allSubjects = data.enrollments.flatMap((e) => e.course.subjects);
                        // Deduplicate subjects
                        const uniqueSubjects = Array.from(new Map(allSubjects.map(s => [s.id, s])).values());
                        setSubjects(uniqueSubjects);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    // Fetch chapters when subject changes
    useEffect(() => {
        if (selectedSubject) {
            setIsLoading(true);
            getChaptersForSubject(parseInt(selectedSubject))
                .then((data) => {
                    if (data && data.chapters && data.chapters.length > 0) {
                        setChapters(data.chapters);
                        const firstUnlocked = data.chapters.find((c: any) => !c.isLocked);
                        setSelectedChapter(firstUnlocked ? firstUnlocked.id.toString() : data.chapters[0].id.toString());
                    } else {
                        setChapters([]);
                        setSelectedChapter("");
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setChapters([]);
            setSelectedChapter("");
        }
    }, [selectedSubject]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedSubject("");
            setSelectedChapter("");
            setChapters([]);
        }
    }, [isOpen]);

    const handleSendChallenge = async () => {
        if (!selectedSubject || !selectedChapter || !targetUser) return;

        const subjectName = subjects.find((s) => s.id.toString() === selectedSubject)?.name || "";
        const chapterName = chapters.find((c) => c.id.toString() === selectedChapter)?.title || "";

        setIsSending(true);
        try {
            await onSendChallenge(targetUser, selectedSubject, selectedChapter, subjectName, chapterName);
            onClose();
        } catch (error) {
            console.error("Failed to send challenge:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!targetUser) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <Swords className="h-5 w-5 text-indigo-400" />
                        </div>
                        Challenge to Battle
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Select a subject and chapter to challenge this player.
                    </DialogDescription>
                </DialogHeader>

                {/* Target User */}
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <Avatar className="h-12 w-12 border-2 border-indigo-500/50">
                        <AvatarImage src={targetUser.image} />
                        <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-semibold">
                            {targetUser.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-slate-100">{targetUser.username}</p>
                        <p className="text-xs text-emerald-400">● Online</p>
                    </div>
                </div>

                {/* Subject Select */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Subject</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isLoading}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                            {subjects.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-indigo-600 focus:text-white">
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Chapter Select */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Chapter</label>
                    <Select
                        value={selectedChapter}
                        onValueChange={setSelectedChapter}
                        disabled={!selectedSubject || chapters.length === 0 || isLoading}
                    >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                            <SelectValue placeholder="Select Chapter" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                            {chapters.map((c) => (
                                <SelectItem
                                    key={c.id}
                                    value={c.id.toString()}
                                    disabled={c.isLocked}
                                    className="focus:bg-indigo-600 focus:text-white"
                                >
                                    {c.isLocked && <span className="mr-2">🔒</span>}
                                    {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}
                                    {c.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendChallenge}
                        disabled={!selectedSubject || !selectedChapter || isSending}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Swords className="mr-2 h-4 w-4" />
                                Send Challenge
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
