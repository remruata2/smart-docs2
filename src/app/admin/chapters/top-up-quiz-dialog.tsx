'use client';

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ListPlus } from "lucide-react";
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
import { QuestionBankConfig } from "./new/question-bank-config";
import { QuestionBankConfigState } from "@/lib/question-bank-defaults";
import { topUpChapterQuizAction } from "./actions";

interface TopUpQuizDialogProps {
    chapterId: string;
    chapterTitle: string;
}

// Initial state representing 0 for everything
const getEmptyConfig = (): QuestionBankConfigState => ({
    easy: { MCQ: 0, TRUE_FALSE: 0, FILL_IN_BLANK: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
    medium: { MCQ: 0, TRUE_FALSE: 0, FILL_IN_BLANK: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
    hard: { MCQ: 0, TRUE_FALSE: 0, FILL_IN_BLANK: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
});

export default function TopUpQuizDialog({
    chapterId,
    chapterTitle,
}: TopUpQuizDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize with 0s so user can just selectively add
    const [config, setConfig] = useState<QuestionBankConfigState>(getEmptyConfig());

    // Calculate how many questions the user actually wants to top up
    const totalSelected = Object.values(config).reduce((acc: number, diff) => {
        const diffValues = Object.values(diff as Record<string, number>);
        const diffSum = diffValues.reduce((sum: number, count) => sum + (Number(count) || 0), 0);
        return acc + diffSum;
    }, 0);

    const handleTopUp = async () => {
        if (totalSelected === 0) {
            toast.error("Please add at least 1 question to top up.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await topUpChapterQuizAction(chapterId, config);
            if (result.success) {
                toast.success(`Top-up started! Generating ${totalSelected} new questions.`);
                setOpen(false);
                // Reset for next time
                setConfig(getEmptyConfig());
            } else {
                toast.error((result as any).error || "Failed to start quiz top-up");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to start quiz top-up");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) {
                // optionally reset config on close
                // setConfig(getEmptyConfig());
            }
        }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    title="Top-Up Quiz Questions"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ListPlus className="w-4 h-4 mr-2" />
                    Top-Up
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <ListPlus className="w-5 h-5 text-indigo-600" />
                        Top-Up Quiz Questions
                    </DialogTitle>
                    <DialogDescription>
                        This will generate <strong>new</strong> questions for "{chapterTitle}" and add them to the existing bank.
                        <br />
                        Select exactly how many new questions to create:
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <QuestionBankConfig value={config} onChange={setConfig} />
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                    <div className="text-sm font-medium text-gray-700">
                        Total New Questions: {totalSelected}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTopUp}
                            disabled={isSubmitting || totalSelected === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <ListPlus className="w-4 h-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
