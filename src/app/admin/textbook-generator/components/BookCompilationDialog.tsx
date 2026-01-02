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
import { Checkbox } from '@/components/ui/checkbox';
import { Book, Loader2, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BookCompilationDialogProps {
    textbookId: number;
    completedChapters: number;
    totalChapters: number;
    onCompile: (options: any) => Promise<void>;
}

export function BookCompilationDialog({
    textbookId,
    completedChapters,
    totalChapters,
    onCompile
}: BookCompilationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Options
    const [includeCover, setIncludeCover] = useState(true);
    const [includeToc, setIncludeToc] = useState(true);

    const handleCompile = async () => {
        try {
            setLoading(true);
            await onCompile({
                include_cover: includeCover,
                include_toc: includeToc,
            });
            setOpen(false);
        } catch (error) {
            console.error('Compilation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const isReady = completedChapters > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" disabled={!isReady}>
                    <Book className="w-4 h-4" />
                    Compile Book PDF
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Compile Textbook PDF</DialogTitle>
                    <DialogDescription>
                        Merge {completedChapters} completed chapters into a single PDF document.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="space-y-1">
                            <span className="text-sm font-medium">Compilation Status</span>
                            <div className="flex gap-2">
                                <Badge variant={completedChapters === totalChapters ? "default" : "secondary"}>
                                    {completedChapters}/{totalChapters} Chapters Ready
                                </Badge>
                            </div>
                        </div>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="cover"
                                checked={includeCover}
                                onCheckedChange={(c) => setIncludeCover(!!c)}
                            />
                            <Label htmlFor="cover">Include Cover Page</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="toc"
                                checked={includeToc}
                                onCheckedChange={(c) => setIncludeToc(!!c)}
                            />
                            <Label htmlFor="toc">Include Table of Contents</Label>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleCompile} disabled={loading} className="gap-2">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Compiling...
                            </>
                        ) : (
                            <>
                                <FileDown className="w-4 h-4" />
                                Compile & Save
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
