import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextbookChapterWithImages } from '@/lib/textbook-generator/types';
import ReactMarkdown from 'react-markdown';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

import { useState } from 'react';
import { RefreshCcw, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ChapterContentDialogProps {
    chapter: TextbookChapterWithImages;
    textbookId: number;
    trigger: React.ReactNode;
    onRefreshPdf?: (chapterId: number) => Promise<void>;
}

export function ChapterContentDialog({ chapter, textbookId, trigger, onRefreshPdf }: ChapterContentDialogProps) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            const res = await fetch(`/api/admin/textbook-generator/textbooks/${textbookId}/chapters/${chapter.id}/refresh-pdf`, {
                method: 'POST',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to refresh PDF');
            }

            toast.success('PDF refreshed successfully!');
            if (onRefreshPdf) await onRefreshPdf(chapter.id);

            // Reload the page to catch the new PDF URL or use a callback
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to refresh PDF');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                            <DialogTitle>Chapter {chapter.chapter_number}: {chapter.title}</DialogTitle>
                            <Badge variant="outline">{chapter.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={handleRefresh}
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCcw className="w-4 h-4" />
                                )}
                                Refresh PDF
                            </Button>
                            {chapter.pdf_url && (
                                <a
                                    href={chapter.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button size="sm" className="gap-2">
                                        <FileDown className="w-4 h-4" />
                                        Download PDF
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                    <DialogDescription>
                        Generated content preview.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col h-full">
                    <TabsList>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
                        <TabsTrigger value="images">Generated Images</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[60vh] pr-4 border rounded-md p-4 bg-white">
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {chapter.content || '*No content generated yet*'}
                                </ReactMarkdown>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="raw" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[60vh] pr-4 border rounded-md p-4 bg-muted font-mono text-sm">
                            <pre className="whitespace-pre-wrap">
                                {chapter.content || 'No content'}
                            </pre>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="images" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[60vh]">
                            <div className="grid grid-cols-2 gap-4 pb-4">
                                {chapter.images?.map((img, i) => (
                                    <div key={i} className="border rounded-md p-3 space-y-2">
                                        <div className="aspect-video bg-muted rounded overflow-hidden relative">
                                            {img.url ? (
                                                <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                                                    Pending Generation
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Badge variant="secondary" className="mb-1">{img.type}</Badge>
                                            <p className="text-xs text-muted-foreground line-clamp-3" title={img.prompt || ''}>
                                                {img.prompt}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {!chapter.images?.length && (
                                    <div className="col-span-full text-center py-8 text-muted-foreground">
                                        No images requested for this chapter.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
