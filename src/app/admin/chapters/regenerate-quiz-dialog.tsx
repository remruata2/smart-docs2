'use client';

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Dices, RefreshCcw } from "lucide-react";
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
import { QuestionBankConfigState, getQuestionDefaults } from "@/lib/question-bank-defaults";
import { regenerateChapterQuizAction } from "./actions";

interface RegenerateQuizDialogProps {
    chapterId: string;
    chapterTitle: string;
    examCategory?: string | null;
    subjectName?: string;
}

export default function RegenerateQuizDialog({
    chapterId,
    chapterTitle,
    examCategory,
    subjectName
}: RegenerateQuizDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize with dynamic defaults based on context
    const [config, setConfig] = useState<QuestionBankConfigState>(
        getQuestionDefaults(examCategory, subjectName)
    );

    const handleRegenerate = async () => {
        setIsSubmitting(true);
        try {
            const result = await regenerateChapterQuizAction(chapterId, config);
            toast.success(`Quiz regeneration started! Deleted ${result.deletedCount} old questions.`);
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to start quiz regeneration");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                    title="Regenerate Quiz Questions"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Dices className="w-4 h-4 mr-2" />
                    Regen Quiz
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-green-600" />
                        Regenerate Quiz
                    </DialogTitle>
                    <DialogDescription>
                        This will <strong>delete all existing questions</strong> for "{chapterTitle}" and generate new ones.
                        <br />
                        Customize the question distribution below:
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <QuestionBankConfig value={config} onChange={setConfig} />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRegenerate}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Dices className="w-4 h-4 mr-2" />
                                Confirm & Regenerate
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
