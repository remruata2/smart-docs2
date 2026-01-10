'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Settings,
    Play,
    Pause,
    FileText,
    Layers,
    BookText,
    Image as ImageIcon,
    Download,
    Trash2,
    Edit,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    Sparkles,
    Eye,
    Square,
    History,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
    TextbookWithRelations,
    TextbookStatus,
    ChapterGenStatus,
    TextbookUnitWithChapters,
    TextbookChapterWithImages,
    TextbookChapter
} from '@/lib/textbook-generator/types';
import { ChapterGenerationDialog } from '../components/ChapterGenerationDialog';
import { BookCompilationDialog } from '../components/BookCompilationDialog';
import { ChapterContentDialog } from '../components/ChapterContentDialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTENT_STYLE_LABELS, CONTENT_STYLE_DESCRIPTIONS, type ContentStyle } from '@/lib/textbook-generator/content-styles';

const statusConfig: Record<TextbookStatus, { label: string; color: string; bgColor: string }> = {
    DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    PARSING: { label: 'Parsing Syllabus', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    GENERATING: { label: 'Generating Content', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    REVIEWING: { label: 'Ready for Review', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    PUBLISHED: { label: 'Published', color: 'text-green-700', bgColor: 'bg-green-100' },
    ARCHIVED: { label: 'Archived', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

const chapterStatusConfig: Record<ChapterGenStatus | 'COMPLETED', { icon: React.ReactNode; color: string }> = {
    PENDING: { icon: <Clock className="w-4 h-4" />, color: 'text-gray-400' },
    GENERATING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-yellow-500' },
    GENERATED: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-blue-500' },
    FAILED: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-500' },
    REVIEWED: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500' },
    COMPLETED: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500' }, // Treat completed as reviewed/done
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function TextbookDetailPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [textbook, setTextbook] = useState<TextbookWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [generatingChapterIds, setGeneratingChapterIds] = useState<number[]>([]);

    // Status helpers
    const totalChapters = textbook?.units?.reduce((acc, unit) => acc + unit.chapters.length, 0) || 0;
    const completedChapters = textbook?.units?.reduce((acc, unit) =>
        acc + unit.chapters.filter(c => c.status === 'COMPLETED' || c.status === 'REVIEWED' || c.status === 'GENERATED').length, 0
    ) || 0;

    const fetchTextbook = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/textbook-generator/textbooks/${resolvedParams.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Textbook not found');
                throw new Error('Failed to fetch textbook');
            }
            const data = await res.json();
            setTextbook(data.textbook);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.id]);

    useEffect(() => {
        fetchTextbook();
    }, [fetchTextbook]);

    // Polling for generating chapters - OPTIMIZED: only fetch status of generating chapters
    useEffect(() => {
        if (!textbook) return;

        // Collect IDs of generating chapters
        const generatingChapterIds = textbook.units?.flatMap(u =>
            u.chapters.filter(c => c.status === 'GENERATING').map(c => c.id)
        ) || [];

        if (generatingChapterIds.length === 0) return;

        const pollChapterStatuses = async () => {
            for (const chapterId of generatingChapterIds) {
                try {
                    const res = await fetch(
                        `/api/admin/textbook-generator/textbooks/${resolvedParams.id}/chapters/${chapterId}/status`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        // Only update if status changed
                        updateChapterData(chapterId, data.chapter);
                    }
                } catch (err) {
                    console.error(`Failed to poll chapter ${chapterId}:`, err);
                }
            }
        };

        const interval = setInterval(pollChapterStatuses, 5000);
        return () => clearInterval(interval);
    }, [textbook, resolvedParams.id, generatingChapterIds, fetchTextbook]);

    const handleDelete = async () => {
        try {
            setDeleting(true);
            const res = await fetch(`/api/admin/textbook-generator/textbooks/${resolvedParams.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete textbook');
            router.push('/admin/textbook-generator');
            toast.success('Textbook deleted successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
            setDeleting(false);
            toast.error('Failed to delete textbook');
        }
    };

    const handleGenerateChapter = async (chapterId: number, options: any) => {
        try {
            toast.info('Starting chapter generation...');

            // Optimistic update
            updateChapterStatus(chapterId, 'GENERATING');
            setGeneratingChapterIds(prev => [...prev, chapterId]);

            const res = await fetch(
                `/api/admin/textbook-generator/textbooks/${resolvedParams.id}/chapters/${chapterId}/generate`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(options),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Generation failed');
            }

            const data = await res.json();

            if (res.status === 202) {
                toast.success('Generation started in background. You can continue working.');
                // Status is already optimistically set to GENERATING
            } else {
                toast.success('Chapter generated successfully!');
                // Update local state with new chapter data
                updateChapterData(chapterId, data.chapter);
                setGeneratingChapterIds(prev => prev.filter(id => id !== chapterId));
            }

            // Refresh full stats
            fetchTextbook();

        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Generation failed');
            updateChapterStatus(chapterId, 'FAILED');
            setGeneratingChapterIds(prev => prev.filter(id => id !== chapterId));
        }
    };

    const handleStopGeneration = async (chapterId: number) => {
        try {
            toast.info('Stopping generation...');
            const response = await fetch(`/api/admin/textbook-generator/textbooks/${resolvedParams.id}/chapters/${chapterId}/stop`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to stop generation');
            }

            toast.success("Generation Stopped", {
                description: "The chapter generation has been stopped.",
            });

            // Update local state immediately
            updateChapterData(chapterId, { status: 'PENDING' });
            // Remove from generating list
            setGeneratingChapterIds(prev => prev.filter(id => id !== chapterId));

        } catch (error) {
            console.error('Error stopping generation:', error);
            toast.error("Failed to stop generation", {
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        }
    };



    const handleClearAllCache = async () => {
        if (!confirm("Are you sure you want to clear ALL AI response cache? This will affect all chapters.")) return;
        try {
            const response = await fetch(`/api/admin/cache`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Global Cache Cleared", {
                    description: `Cleared ${data.entriesCleared} cache entries globally.`,
                });
            } else {
                throw new Error(data.error || 'Failed to clear global cache');
            }
        } catch (error) {
            toast.error("Failed to clear global cache", {
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        }
    };

    const handleCompileBook = async (options: any) => {
        try {
            toast.info('Starting book compilation...');

            const chapterIds = textbook?.units
                .flatMap(u => u.chapters)
                .filter(c => c.status === 'COMPLETED' || c.status === 'GENERATED') // Filter valid chapters
                .map(c => c.id) || [];

            const res = await fetch(
                `/api/admin/textbook-generator/textbooks/${resolvedParams.id}/compile`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chapter_ids: chapterIds,
                        options
                    }),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Compilation failed');
            }

            const data = await res.json();
            toast.success('Book compiled successfully!');
            fetchTextbook(); // Refresh to get the compiled PDF URL

        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Compilation failed');
        }
    };

    // Helper to update chapter status locally
    const updateChapterStatus = (chapterId: number, status: ChapterGenStatus) => {
        setTextbook(prev => {
            if (!prev) return null;
            return {
                ...prev,
                units: prev.units.map(unit => ({
                    ...unit,
                    chapters: unit.chapters.map(ch =>
                        ch.id === chapterId ? { ...ch, status: status as any } : ch
                    )
                }))
            };
        });
    };

    // Helper to update full chapter data
    const updateChapterData = (chapterId: number, newData: any) => {
        setTextbook(prev => {
            if (!prev) return null;
            return {
                ...prev,
                units: prev.units.map(unit => ({
                    ...unit,
                    chapters: unit.chapters.map(ch =>
                        ch.id === chapterId ? { ...ch, ...newData } : ch
                    )
                }))
            };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !textbook) {
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error || 'Textbook not found'}</AlertDescription>
                </Alert>
                <Link href="/admin/textbook-generator" className="mt-4 inline-block">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Textbooks
                    </Button>
                </Link>
            </div>
        );
    }

    const status = statusConfig[textbook.status];

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link href="/admin/textbook-generator">
                        <Button variant="ghost" size="icon" className="mt-1">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold">{textbook.title}</h1>
                            <Badge className={`${status.bgColor} ${status.color}`}>
                                {status.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Class {textbook.class_level}
                            {textbook.stream && ` • ${textbook.stream}`}
                            {textbook.subject_name && ` • ${textbook.subject_name}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {textbook.compiled_pdf_url && (
                        <a href={textbook.compiled_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <Download className="w-4 h-4" />
                                Download Full Book
                            </Button>
                        </a>
                    )}

                    <BookCompilationDialog
                        textbookId={textbook.id}
                        completedChapters={completedChapters}
                        totalChapters={totalChapters}
                        onCompile={handleCompileBook}
                    />

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Textbook?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete &quot;{textbook.title}&quot; and all its units, chapters, and generated content.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Progress Overview */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Generation Progress</h3>
                            <p className="text-sm text-muted-foreground">
                                {completedChapters} of {totalChapters} chapters generated
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold">{textbook.progress}%</span>
                        </div>
                    </div>
                    <Progress value={textbook.progress} className="h-3" />

                    <div className="flex items-center gap-4 mt-4">
                        {textbook.status === 'DRAFT' && !textbook.units?.length && (
                            <Link href={`/admin/textbook-generator/${textbook.id}/parse`}>
                                <Button className="gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Parse Syllabus
                                </Button>
                            </Link>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" onClick={handleClearAllCache} className="gap-2">
                                <History className="w-4 h-4" /> Clear All Cache
                            </Button>
                            <BookCompilationDialog
                                textbookId={textbook.id}
                                completedChapters={completedChapters}
                                totalChapters={totalChapters}
                                onCompile={handleCompileBook}
                                trigger={
                                    <Button variant="outline" className="gap-2">
                                        <BookText className="w-4 h-4" />
                                        Compile Full Book
                                    </Button>
                                }
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(textbook.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="structure" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="structure" className="gap-2">
                        <Layers className="w-4 h-4" />
                        Structure & Content
                    </TabsTrigger>
                    <TabsTrigger value="images" className="gap-2">
                        <ImageIcon className="w-4 h-4" />
                        All Images
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Structure Tab */}
                <TabsContent value="structure" className="space-y-4">
                    {textbook.units?.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No structure yet</h3>
                                    <p className="text-muted-foreground mb-4 max-w-md">
                                        {textbook.raw_syllabus
                                            ? 'Parse the syllabus to automatically create the textbook structure.'
                                            : 'Add syllabus text first, then parse it to create the structure.'}
                                    </p>
                                    {textbook.raw_syllabus ? (
                                        <Link href={`/admin/textbook-generator/${textbook.id}/parse`}>
                                            <Button className="gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Parse Syllabus
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button variant="outline" className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Add Syllabus
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {textbook.units?.map((unit: TextbookUnitWithChapters, unitIndex: number) => (
                                <Card key={unit.id}>
                                    <CardHeader className="pb-3 border-b bg-muted/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">Unit {unit.order}</Badge>
                                                    <CardTitle className="text-lg">{unit.title}</CardTitle>
                                                </div>
                                                {unit.description && (
                                                    <CardDescription className="mt-1">{unit.description}</CardDescription>
                                                )}
                                            </div>
                                            <Badge variant="secondary">
                                                {unit.chapters.length} chapters
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-1">
                                            {unit.chapters.map((chapter: TextbookChapterWithImages) => {
                                                // Note: Treating 'COMPLETED' same as 'GENERATED' for display
                                                const normalizedStatus = (chapter.status === 'COMPLETED' ? 'GENERATED' : chapter.status) as ChapterGenStatus;
                                                const chStatus = chapterStatusConfig[normalizedStatus] || chapterStatusConfig.PENDING;

                                                return (
                                                    <div
                                                        key={chapter.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-full bg-muted ${chStatus.color.replace('text-', 'bg-').replace('500', '100')}`}>
                                                                {chStatus.icon}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm">Chapter {chapter.chapter_number}</span>
                                                                    <span className="font-medium">{chapter.title}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                    {chapter.pdf_url && (
                                                                        <span className="flex items-center gap-1 text-green-600">
                                                                            <FileText className="w-3 h-3" /> PDF Ready
                                                                        </span>
                                                                    )}
                                                                    {chapter.images?.length > 0 && (
                                                                        <span className="flex items-center gap-1">
                                                                            <ImageIcon className="w-3 h-3" /> {chapter.images.length} Images
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className={`flex items-center gap-2 ${chapter.status === 'GENERATING' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                                            {chapter.status === 'GENERATING' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="gap-2"
                                                                    onClick={() => handleStopGeneration(chapter.id)}
                                                                >
                                                                    <Square className="w-3 h-3" />
                                                                    Stop
                                                                </Button>
                                                            )}

                                                            {chapter.content && (
                                                                <ChapterContentDialog
                                                                    chapter={chapter}
                                                                    textbookId={textbook.id}
                                                                    trigger={
                                                                        <Button size="sm" variant="ghost" className="gap-2">
                                                                            <FileText className="w-4 h-4" /> View Content
                                                                        </Button>
                                                                    }
                                                                />
                                                            )}

                                                            {chapter.pdf_url && (
                                                                <a href={chapter.pdf_url} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="ghost" className="gap-2">
                                                                        <Eye className="w-4 h-4" /> View PDF
                                                                    </Button>
                                                                </a>
                                                            )}

                                                            {chapter.status !== 'GENERATING' && (
                                                                <ChapterGenerationDialog
                                                                    chapter={chapter}
                                                                    onGenerate={(options) => handleGenerateChapter(chapter.id, options)}
                                                                    trigger={
                                                                        <Button size="sm" variant={chapter.status === 'COMPLETED' ? "outline" : "default"} className="gap-2">
                                                                            <Sparkles className="w-3 h-3" />
                                                                            {chapter.status === 'COMPLETED' ? 'Regenerate' : 'Generate'}
                                                                        </Button>
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generated Images</CardTitle>
                            <CardDescription>
                                Diagrams, charts, and illustrations generated by Nano Banana Pro
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {textbook.units?.flatMap(u => u.chapters).flatMap(c => c.images).filter(i => i.url).map((image: any) => (
                                    <div key={image.id} className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                                        <img src={image.url} alt={image.alt_text} className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a href={image.url} target="_blank" rel="noopener noreferrer">
                                                <Button size="sm" variant="secondary">View Full</Button>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                {(!textbook.units?.some(u => u.chapters.some(c => c.images?.some(i => i.url))) || false) && (
                                    <div className="col-span-full py-12 text-center text-muted-foreground">
                                        No images generated yet. Start chapter generation to create images.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Textbook Settings</CardTitle>
                            <CardDescription>
                                Configure generation options and metadata
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Content Style - Editable */}
                            <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                                <div>
                                    <p className="text-sm font-semibold">Content Style</p>
                                    <p className="text-xs text-muted-foreground">Determines how chapter content is formatted</p>
                                </div>
                                <Select
                                    value={(textbook as any).content_style || 'academic'}
                                    onValueChange={async (value) => {
                                        try {
                                            const res = await fetch(`/api/admin/textbook-generator/textbooks/${textbook.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ content_style: value })
                                            });
                                            if (!res.ok) throw new Error('Failed to update');
                                            toast.success(`Content style changed to ${CONTENT_STYLE_LABELS[value as ContentStyle]}`);
                                            fetchTextbook();
                                        } catch (e) {
                                            toast.error('Failed to update content style');
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full max-w-md">
                                        <SelectValue placeholder="Select content style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CONTENT_STYLE_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{label}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {CONTENT_STYLE_DESCRIPTIONS[value as ContentStyle]}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Other settings - Read-only */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium">Board</p>
                                    <p className="text-muted-foreground">{textbook.board_id || 'MBSE'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Academic Year</p>
                                    <p className="text-muted-foreground">{textbook.academic_year || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Author</p>
                                    <p className="text-muted-foreground">{textbook.author || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Created By</p>
                                    <p className="text-muted-foreground">{textbook.creator?.username}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">AI Model (Image)</p>
                                    <p className="text-muted-foreground">Google Nano Banana Pro</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
