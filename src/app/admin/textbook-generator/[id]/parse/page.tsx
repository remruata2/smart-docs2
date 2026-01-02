'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    FileText,
    Edit,
    Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Textbook, ParsedSyllabus } from '@/lib/textbook-generator/types';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ParseSyllabusPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [textbook, setTextbook] = useState<Textbook | null>(null);
    const [loading, setLoading] = useState(true);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parseResult, setParseResult] = useState<ParsedSyllabus | null>(null);
    const [parseMessage, setParseMessage] = useState<string | null>(null);

    // Syllabus editing
    const [editingSyllabus, setEditingSyllabus] = useState(false);
    const [syllabusText, setSyllabusText] = useState('');
    const [savingSyllabus, setSavingSyllabus] = useState(false);

    const fetchTextbook = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/textbook-generator/textbooks/${resolvedParams.id}`);
            if (!res.ok) throw new Error('Failed to fetch textbook');
            const data = await res.json();
            setTextbook(data.textbook);
            setSyllabusText(data.textbook.raw_syllabus || '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.id]);

    useEffect(() => {
        fetchTextbook();
    }, [fetchTextbook]);

    const handleSaveSyllabus = async () => {
        if (!textbook) return;

        try {
            setSavingSyllabus(true);
            const res = await fetch(`/api/admin/textbook-generator/textbooks/${textbook.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_syllabus: syllabusText }),
            });

            if (!res.ok) throw new Error('Failed to save syllabus');

            const data = await res.json();
            setTextbook(data.textbook);
            setEditingSyllabus(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSavingSyllabus(false);
        }
    };

    const handleParse = async () => {
        if (!textbook) return;

        try {
            setParsing(true);
            setError(null);
            setParseResult(null);
            setParseMessage(null);

            const res = await fetch(`/api/admin/textbook-generator/textbooks/${textbook.id}/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to parse syllabus');
            }

            setParseResult(data.parsed);
            setParseMessage(data.message);

            // Redirect to textbook detail after short delay
            setTimeout(() => {
                router.push(`/admin/textbook-generator/${textbook.id}`);
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse syllabus');
        } finally {
            setParsing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!textbook) {
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Textbook not found</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/admin/textbook-generator/${textbook.id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Parse Syllabus</h1>
                    <p className="text-muted-foreground">{textbook.title}</p>
                </div>
            </div>

            {/* Success Message */}
            {parseMessage && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        {parseMessage}. Redirecting to textbook...
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Message */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Syllabus Input */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Syllabus Text</CardTitle>
                            <CardDescription>
                                Paste or edit the MBSE syllabus text to be parsed by AI
                            </CardDescription>
                        </div>
                        {!editingSyllabus && textbook.raw_syllabus && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSyllabus(true)}
                                className="gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {editingSyllabus || !textbook.raw_syllabus ? (
                        <div className="space-y-4">
                            <Textarea
                                placeholder={`CLASS XI

Part A: INDIAN CONSTITUTION AT WORK

1. The Constitution: Why and How?
   Why do we need a Constitution?; The Authority of a Constitution

2. Rights in the Indian Constitution
   The Importance of Rights; Fundamental Rights

...`}
                                value={syllabusText}
                                onChange={(e) => setSyllabusText(e.target.value)}
                                rows={15}
                                className="font-mono text-sm"
                            />
                            {editingSyllabus && (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSaveSyllabus}
                                        disabled={savingSyllabus}
                                        className="gap-2"
                                    >
                                        {savingSyllabus ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSyllabusText(textbook.raw_syllabus || '');
                                            setEditingSyllabus(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                            {textbook.raw_syllabus}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Parse Button */}
            {textbook.raw_syllabus && !editingSyllabus && !parseMessage && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Sparkles className="w-12 h-12 text-primary mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Ready to Parse</h3>
                            <p className="text-muted-foreground mb-4 max-w-md">
                                The AI will analyze the syllabus and extract units, chapters, and topics.
                                This uses <Badge variant="secondary">Gemini 2.0 Flash</Badge> for fast structured extraction.
                            </p>
                            <Button
                                size="lg"
                                onClick={handleParse}
                                disabled={parsing}
                                className="gap-2"
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Parsing with AI...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Parse Syllabus
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Parse Result Preview */}
            {parseResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            Parsed Structure
                        </CardTitle>
                        <CardDescription>
                            Subject: {parseResult.subject} • Class {parseResult.class}
                            {parseResult.stream && ` • ${parseResult.stream}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full" defaultValue={parseResult.units.map((_, i) => `unit-${i}`)}>
                            {parseResult.units.map((unit, unitIndex) => (
                                <AccordionItem key={unitIndex} value={`unit-${unitIndex}`}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{unit.chapters.length}</Badge>
                                            <span>{unit.title}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2 pl-4">
                                            {unit.chapters.map((chapter, chapterIndex) => (
                                                <div
                                                    key={chapterIndex}
                                                    className="flex items-start gap-3 p-2 rounded border bg-muted/30"
                                                >
                                                    <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                                    <div className="flex-1">
                                                        <p className="font-medium">
                                                            Chapter {chapter.number}: {chapter.title}
                                                        </p>
                                                        {chapter.subtopics.length > 0 && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {chapter.subtopics.join(' • ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            {!parseResult && (
                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Tips for best results:</h3>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Include the class level (XI or XII) at the top if available</li>
                            <li>Keep the original structure with Parts/Units and numbered chapters</li>
                            <li>Include subtopics as they appear in the official syllabus</li>
                            <li>Separate chapters clearly with line breaks</li>
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
