'use client';

import { useState, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Sparkles, FileText, Layers, Edit, Trash2 } from 'lucide-react';
import type { SyllabusWithRelations } from '@/lib/textbook-generator/types';
import { TopicEditor } from '@/components/admin/TopicEditor';

export default function SyllabusDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [syllabus, setSyllabus] = useState<SyllabusWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [parsing, setParsing] = useState(false);

    const fetchSyllabus = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/syllabi/${id}`);
            if (!res.ok) throw new Error('Failed to fetch syllabus');
            const data = await res.json();
            setSyllabus(data.syllabus);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSyllabus();
    }, [fetchSyllabus]);

    const handleParse = async () => {
        if (!syllabus?.raw_text) {
            toast.error('No raw text available to parse');
            return;
        }

        try {
            setParsing(true);
            const isMultiSplit = (syllabus as any).syllabus_mode === 'multi_split';

            if (isMultiSplit) {
                toast.info('AI is parsing and splitting into separate syllabi... This may take a few minutes.');
            } else {
                toast.info('AI is analyzing the syllabus structure... This may take a minute.');
            }

            const res = await fetch(`/api/admin/syllabi/${id}/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stateContext: (syllabus as any).stateContext
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Parsing failed');

            // Check if this was a split operation
            if (data.split && data.childSyllabi && data.childSyllabi.length > 0) {
                toast.success(`Created ${data.childSyllabi.length} separate syllabi! Check the list below.`);
            } else if (data.splitError) {
                toast.warning(`Parsed but splitting failed: ${data.splitError}`);
            } else {
                toast.success('Syllabus parsed successfully!');
            }

            fetchSyllabus(); // Refresh structure

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setParsing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this syllabus? Associated textbooks might lose their link.')) return;

        try {
            const res = await fetch(`/api/admin/syllabi/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Syllabus deleted');
            router.push('/admin/syllabus');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!syllabus) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">Syllabus not found</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/admin/syllabus" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Syllabi
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{syllabus.title}</h1>
                        <Badge variant={syllabus.status === 'PARSED' ? 'default' : 'secondary'}>
                            {syllabus.status}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive border-destructive/20 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                    {/* Edit Metadata Button could go here */}
                    {syllabus.status !== 'PARSED' || syllabus.units.length === 0 ? (
                        <Button onClick={handleParse} disabled={parsing || !syllabus.raw_text}>
                            {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Parse Structure
                        </Button>
                    ) : (
                        <Button onClick={handleParse} variant="secondary" disabled={parsing}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Re-Parse
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Parsed Structure */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-primary" />
                                Syllabus Blueprint ({syllabus.units.length} Sections)
                            </CardTitle>
                            <CardDescription>
                                Structured breakdown of Units and Chapters (formerly Sub-units).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {syllabus.units.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <p>No structure parsed yet.</p>
                                    <Button variant="link" onClick={handleParse} disabled={!syllabus.raw_text}>
                                        Click to Analyze Content
                                    </Button>
                                </div>
                            ) : (
                                <Accordion type="multiple" defaultValue={syllabus.units.map(u => `unit-${u.id}`)} className="space-y-4">
                                    {syllabus.units.map((unit) => (
                                        <AccordionItem key={unit.id} value={`unit-${unit.id}`} className="border rounded-lg px-4">
                                            <AccordionTrigger className="hover:no-underline py-3">
                                                <div className="flex items-center text-left">
                                                    <Badge variant="outline" className="mr-3 shrink-0">
                                                        Section {unit.order}
                                                    </Badge>
                                                    <div className="font-semibold">{unit.title}</div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4">
                                                <div className="space-y-3 pl-2">
                                                    {unit.chapters.map((chapter) => (
                                                        <div key={chapter.id} className="bg-muted/30 p-3 rounded-md border text-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-medium text-primary">
                                                                    Unit {chapter.chapter_number}: {chapter.title}
                                                                </span>
                                                            </div>
                                                            {/* Topics - Editable */}
                                                            <TopicEditor
                                                                chapterId={chapter.id}
                                                                syllabusId={syllabus.id}
                                                                initialTopics={chapter.subtopics as any}
                                                                onUpdate={fetchSyllabus}
                                                            />
                                                        </div>
                                                    ))}
                                                    {unit.chapters.length === 0 && (
                                                        <div className="text-xs text-muted-foreground italic pl-4">No units in this section</div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Details & Raw Text */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-muted-foreground">Class</div>
                                    <div className="font-medium">{syllabus.class_level}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Subject</div>
                                    <div className="font-medium">{syllabus.subject}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Board</div>
                                    <div className="font-medium">{syllabus.board}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Stream</div>
                                    <div className="font-medium">{syllabus.stream || 'N/A'}</div>
                                </div>
                            </div>
                            <hr className="my-4 border-border" />
                            <div>
                                <div className="text-muted-foreground mb-1">Created</div>
                                <div>{new Date(syllabus.created_at).toLocaleString()}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col max-h-[500px]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Raw Content
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 relative">
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20">
                                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                                    {syllabus.raw_text || 'No raw text content available.'}
                                </pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function RefreshCw({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    )
}
