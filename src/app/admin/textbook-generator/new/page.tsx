'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    BookOpen,
    ArrowLeft,
    Save,
    Loader2,
    AlertCircle,
    FileText,
    PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateTextbookInput, Syllabus } from '@/lib/textbook-generator/types';
import { CONTENT_STYLE_LABELS, CONTENT_STYLE_DESCRIPTIONS, type ContentStyle } from '@/lib/textbook-generator/content-styles';

export default function NewTextbookPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syllabi, setSyllabi] = useState<(Syllabus & { exam_id?: string | null })[]>([]);
    const [fetchingSyllabi, setFetchingSyllabi] = useState(false);
    const [exams, setExams] = useState<{ id: string; code: string; name: string; short_name: string | null }[]>([]);

    // Form State
    const [mode, setMode] = useState<'syllabus' | 'manual'>('syllabus');
    const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [syllabusHasExam, setSyllabusHasExam] = useState(false); // Track if syllabus has an exam
    const [useSyllabusMetadata, setUseSyllabusMetadata] = useState(true);

    const [formData, setFormData] = useState<CreateTextbookInput & { content_style?: string }>({
        title: '',
        description: '',
        class_level: '',
        stream: null,
        subject_name: '',
        board_id: 'MBSE',
        academic_year: '2024-2025',
        author: '',
        raw_syllabus: '',
        content_style: 'academic', // Default content style
    });

    const [programs, setPrograms] = useState<{ id: string | number, name: string }[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch programs
                const programsRes = await fetch('/api/admin/programs');
                if (programsRes.ok) {
                    const data = await programsRes.json();
                    setPrograms(data.programs || []);
                }

                // Fetch exams
                const examsRes = await fetch('/api/admin/exams');
                if (examsRes.ok) {
                    const examsData = await examsRes.json();
                    setExams(examsData.exams || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        }
        fetchData();
    }, []);

    const fetchSyllabi = async () => {
        try {
            setFetchingSyllabi(true);
            const res = await fetch('/api/admin/syllabi');
            if (res.ok) {
                const data = await res.json();
                const parsedSyllabi = data.syllabi.filter((s: Syllabus) => s.status === 'PARSED');
                setSyllabi(parsedSyllabi);
            }
        } catch (e) {
            console.error("Failed to fetch syllabi", e);
        } finally {
            setFetchingSyllabi(false);
        }
    };

    useEffect(() => {
        fetchSyllabi();
    }, []);

    useEffect(() => {
        if (mode === 'syllabus' && selectedSyllabusId && useSyllabusMetadata) {
            const syllabus = syllabi.find(s => s.id.toString() === selectedSyllabusId);
            if (syllabus) {
                setFormData(prev => ({
                    ...prev,
                    title: `Textbook: ${syllabus.title}`,
                    subject_name: syllabus.subject,
                    class_level: syllabus.class_level,
                    stream: syllabus.stream as any,
                    board_id: syllabus.board,
                    academic_year: syllabus.academic_year || prev.academic_year
                }));

                // Prefill exam from syllabus
                if (syllabus.exam_id) {
                    setSelectedExamId(syllabus.exam_id);
                    setSyllabusHasExam(true);
                } else {
                    setSyllabusHasExam(false);
                    // Don't reset exam if user already selected one
                }
            }
        } else if (!selectedSyllabusId) {
            setSyllabusHasExam(false);
        }
    }, [selectedSyllabusId, syllabi, mode, useSyllabusMetadata]);
    // ...
    // Scroll down to find the Select component to update
    // I will use a separate replacement for the Select content since it is far down.
    // Waiting for next step.


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        if (mode === 'syllabus' && !selectedSyllabusId) {
            setError('Please select a syllabus');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                ...formData,
                syllabus_id: mode === 'syllabus' ? parseInt(selectedSyllabusId) : undefined,
                exam_id: selectedExamId || undefined,
            };

            const res = await fetch('/api/admin/textbook-generator/textbooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create textbook');
            }

            const { textbook } = await res.json();
            router.push(`/admin/textbook-generator/${textbook.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const updateField = <K extends keyof CreateTextbookInput>(
        field: K,
        value: CreateTextbookInput[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="container mx-auto py-6 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/textbook-generator">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Create New Textbook</h1>
                        <p className="text-muted-foreground">
                            Set up a new MBSE textbook project
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Tabs value={mode} onValueChange={(v) => setMode(v as 'syllabus' | 'manual')} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="syllabus" className="gap-2">
                        <FileText className="w-4 h-4" />
                        From Syllabus Blueprint
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2">
                        <PenTool className="w-4 h-4" />
                        Manual Creation
                    </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">

                        <TabsContent value="syllabus" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select Syllabus</CardTitle>
                                    <CardDescription>Choose a pre-defined syllabus blueprint to auto-generate structure.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Syllabus Blueprint</Label>
                                        <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a syllabus..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fetchingSyllabi ? (
                                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                                ) : syllabi.length === 0 ? (
                                                    <SelectItem value="none" disabled>No parsed syllabi found</SelectItem>
                                                ) : (
                                                    syllabi.map(s => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>
                                                            {s.title} (Class {s.class_level})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <Checkbox
                                                id="use-meta"
                                                checked={useSyllabusMetadata}
                                                onCheckedChange={(c) => setUseSyllabusMetadata(!!c)}
                                            />
                                            <Label htmlFor="use-meta" className="text-sm font-normal">
                                                Auto-fill basic info from syllabus
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Exam Selection - Prefilled from syllabus */}
                                    <div className="space-y-2">
                                        <Label>Target Exam</Label>
                                        <Select
                                            value={selectedExamId || 'none'}
                                            onValueChange={(v) => setSelectedExamId(v === 'none' ? '' : v)}
                                            disabled={syllabusHasExam}
                                        >
                                            <SelectTrigger className={syllabusHasExam ? 'bg-gray-50' : ''}>
                                                <SelectValue placeholder="Select target exam (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {exams.map(exam => (
                                                    <SelectItem key={exam.id} value={exam.id}>
                                                        {exam.short_name || exam.name} ({exam.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {syllabusHasExam && (
                                            <p className="text-xs text-amber-600">
                                                Exam inherited from syllabus (locked)
                                            </p>
                                        )}
                                        {!syllabusHasExam && (
                                            <p className="text-xs text-muted-foreground">
                                                Optional: Categorize by target exam
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        <p>Don&apos;t see your syllabus? <Link href="/admin/syllabus/new" className="text-primary hover:underline">Create one here</Link>.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="manual">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Manual Syllabus Input</CardTitle>
                                    <CardDescription>Paste raw text and let AI parse it on the fly (Legacy method).</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="raw_syllabus">Raw Syllabus Text</Label>
                                        <Textarea
                                            id="raw_syllabus"
                                            placeholder="Paste syllabus text here..."
                                            value={formData.raw_syllabus || ''}
                                            onChange={(e) => updateField('raw_syllabus', e.target.value)}
                                            rows={10}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <Card>
                            <CardHeader>
                                <CardTitle>Textbook Details</CardTitle>
                                <CardDescription>
                                    Customize the textbook metadata
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Political Science - Class XI"
                                        value={formData.title}
                                        onChange={(e) => updateField('title', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of the textbook..."
                                        value={formData.description || ''}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="class_level">Class Level *</Label>
                                        <Select
                                            value={formData.class_level}
                                            onValueChange={(v) => updateField('class_level', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {programs.map(p => (
                                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="stream">Stream</Label>
                                        <Select
                                            value={formData.stream || 'none'}
                                            onValueChange={(v) => updateField('stream', v === 'none' ? null : v as 'Arts' | 'Science' | 'Commerce' | 'Vocational')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select stream" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Not specified</SelectItem>
                                                <SelectItem value="Arts">Arts</SelectItem>
                                                <SelectItem value="Science">Science</SelectItem>
                                                <SelectItem value="Commerce">Commerce</SelectItem>
                                                <SelectItem value="Vocational">Vocational</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject_name">Subject Name</Label>
                                    <Input
                                        id="subject_name"
                                        placeholder="e.g., Political Science, Physics"
                                        value={formData.subject_name || ''}
                                        onChange={(e) => updateField('subject_name', e.target.value)}
                                    />
                                </div>

                                {/* Content Style Dropdown */}
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="content_style">Content Style</Label>
                                    <Select
                                        value={formData.content_style || 'academic'}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, content_style: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select content style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CONTENT_STYLE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    <div className="flex flex-col">
                                                        <span>{label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {CONTENT_STYLE_DESCRIPTIONS[(formData.content_style || 'academic') as ContentStyle]}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="board_id">Board</Label>
                                        <Select
                                            value={formData.board_id || 'MBSE'}
                                            onValueChange={(v) => updateField('board_id', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MBSE">MBSE (Mizoram Board)</SelectItem>
                                                <SelectItem value="CBSE">CBSE</SelectItem>
                                                <SelectItem value="NCERT">NCERT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="academic_year">Academic Year</Label>
                                        <Input
                                            id="academic_year"
                                            placeholder="e.g., 2024-2025"
                                            value={formData.academic_year || ''}
                                            onChange={(e) => updateField('academic_year', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="author">Author / Editor</Label>
                                    <Input
                                        id="author"
                                        placeholder="e.g., Zirna AI Team"
                                        value={formData.author || ''}
                                        onChange={(e) => updateField('author', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4">
                            <Link href="/admin/textbook-generator">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Create Textbook
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </Tabs>
        </div>
    );
}
