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
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import type { TextbookChapter } from '@/lib/textbook-generator/types';

interface ChapterGenerationDialogProps {
    chapter: TextbookChapter;
    styleConfig?: any; // Passed from parent to provide defaults
    onGenerate: (options: any) => Promise<void>;
    trigger?: React.ReactNode;
}

export function ChapterGenerationDialog({
    chapter,
    styleConfig,
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

    // Dynamic Content Overrides
    const [minWords, setMinWords] = useState(chapter.min_words || styleConfig?.minWords || 800);
    const [maxWords, setMaxWords] = useState(chapter.max_words || styleConfig?.maxWords || 1200);
    const [mcqCount, setMcqCount] = useState(chapter.mcq_count || styleConfig?.mcqCount || 10);
    const [shortAnswerCount, setShortAnswerCount] = useState(chapter.short_answer_count || styleConfig?.shortAnswerCount || 5);
    const [longAnswerCount, setLongAnswerCount] = useState(chapter.long_answer_count || styleConfig?.longAnswerCount || 3);
    const [imageCount, setImageCount] = useState(chapter.image_count || styleConfig?.imageCount || 3);

    const handleGenerate = async () => {
        try {
            setLoading(true);
            await onGenerate({
                customPrompt,
                options: {
                    includeExamHighlights,
                    difficulty,
                    // Pass overrides
                    minWords,
                    maxWords,
                    mcqCount,
                    shortAnswerCount,
                    longAnswerCount,
                    imageCount,
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

                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
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

                    {/* Quantity Overrides */}
                    <div className="space-y-4">
                        <Label className="text-primary font-bold">Content Quantity Overrides</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minWords">Min Words</Label>
                                <Input
                                    id="minWords"
                                    type="number"
                                    value={minWords}
                                    onChange={(e) => setMinWords(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxWords">Max Words</Label>
                                <Input
                                    id="maxWords"
                                    type="number"
                                    value={maxWords}
                                    onChange={(e) => setMaxWords(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mcqCount">MCQ Count</Label>
                                <Input
                                    id="mcqCount"
                                    type="number"
                                    value={mcqCount}
                                    onChange={(e) => setMcqCount(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imageCount">Image Count</Label>
                                <Input
                                    id="imageCount"
                                    type="number"
                                    value={imageCount}
                                    onChange={(e) => setImageCount(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="shortAnswerCount">Short Answers</Label>
                                <Input
                                    id="shortAnswerCount"
                                    type="number"
                                    value={shortAnswerCount}
                                    onChange={(e) => setShortAnswerCount(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longAnswerCount">Long Answers</Label>
                                <Input
                                    id="longAnswerCount"
                                    type="number"
                                    value={longAnswerCount}
                                    onChange={(e) => setLongAnswerCount(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
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
