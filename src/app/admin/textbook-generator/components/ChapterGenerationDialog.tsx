'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import type { TextbookChapter } from '@/lib/textbook-generator/types';

interface ChapterGenerationDialogProps {
    chapter: TextbookChapter;
    onGenerate: (options: any) => Promise<void>;
    trigger?: React.ReactNode;
}

export function ChapterGenerationDialog({
    chapter,
    onGenerate,
    trigger
}: ChapterGenerationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Options
    const [customPrompt, setCustomPrompt] = useState('');
    const [includeExamHighlights, setIncludeExamHighlights] = useState(true);
    const [difficulty, setDifficulty] = useState('intermediate');
    const [generateImages, setGenerateImages] = useState(true);
    const [generatePdf, setGeneratePdf] = useState(true);

    const handleGenerate = async () => {
        try {
            setLoading(true);
            await onGenerate({
                customPrompt,
                options: {
                    includeExamHighlights,
                    difficulty,
                },
                generateImages,
                generatePdf,
            });
            setOpen(false);
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        Generate
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Generate Chapter Content</DialogTitle>
                    <DialogDescription>
                        Configure AI generation for {chapter.chapter_number}: {chapter.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Custom Prompt */}
                    <div className="space-y-2">
                        <Label>Custom Instructions (Optional)</Label>
                        <Textarea
                            placeholder="e.g., Focus specifically on real-world examples from India..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="basic">Basic (Class XI/XII Foundation)</SelectItem>
                                <SelectItem value="intermediate">Intermediate (Standard)</SelectItem>
                                <SelectItem value="advanced">Advanced (Competitive Level)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="exam"
                                checked={includeExamHighlights}
                                onCheckedChange={(c) => setIncludeExamHighlights(!!c)}
                            />
                            <Label htmlFor="exam">Include Exam Highlights (NEET/JEE/CUET)</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="images"
                                checked={generateImages}
                                onCheckedChange={(c) => setGenerateImages(!!c)}
                            />
                            <Label htmlFor="images" className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                Generate Images (Nano Banana Pro)
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pdf"
                                checked={generatePdf}
                                onCheckedChange={(c) => setGeneratePdf(!!c)}
                            />
                            <Label htmlFor="pdf" className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Generate PDF
                            </Label>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Start Generation
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
