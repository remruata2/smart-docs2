'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Plus,
    Search,
    Filter,
    BookText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileEdit,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { TextbookWithRelations, TextbookStatus } from '@/lib/textbook-generator/types';

const statusConfig: Record<TextbookStatus, { label: string; color: string; icon: React.ReactNode }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-500', icon: <FileEdit className="w-4 h-4" /> },
    PARSING: { label: 'Parsing', color: 'bg-blue-500', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    GENERATING: { label: 'Generating', color: 'bg-yellow-500', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    REVIEWING: { label: 'Reviewing', color: 'bg-purple-500', icon: <Eye className="w-4 h-4" /> },
    PUBLISHED: { label: 'Published', color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
    ARCHIVED: { label: 'Archived', color: 'bg-gray-400', icon: <Clock className="w-4 h-4" /> },
};

export default function TextbookGeneratorPage() {
    const [textbooks, setTextbooks] = useState<TextbookWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [streamFilter, setStreamFilter] = useState<string>('all');
    const [examFilter, setExamFilter] = useState<string>('all');
    const [programs, setPrograms] = useState<{ id: string | number, name: string }[]>([]);
    const [exams, setExams] = useState<{ id: string, name: string, short_name: string | null }[]>([]);

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
                    const data = await examsRes.json();
                    setExams(data.exams || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        }
        fetchData();
    }, []);

    const fetchTextbooks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (classFilter !== 'all') params.append('class_level', classFilter);
            if (streamFilter !== 'all') params.append('stream', streamFilter);
            if (examFilter !== 'all') params.append('exam_id', examFilter);
            if (search) params.append('search', search);

            const res = await fetch(`/api/admin/textbook-generator/textbooks?${params}`);
            if (!res.ok) throw new Error('Failed to fetch textbooks');

            const data = await res.json();
            setTextbooks(data.textbooks || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, classFilter, streamFilter, examFilter, search]);

    useEffect(() => {
        fetchTextbooks();
    }, [fetchTextbooks]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTextbooks();
    };

    const getStatusBadge = (status: TextbookStatus) => {
        const config = statusConfig[status];
        return (
            <Badge variant="secondary" className={`${config.color} text-white flex items-center gap-1`}>
                {config.icon}
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Textbook Generator</h1>
                        <p className="text-muted-foreground">
                            Generate MBSE Smart Textbooks using Gemini 3 Pro
                        </p>
                    </div>
                </div>
                <Link href="/admin/textbook-generator/new">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Textbook
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search textbooks..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="PARSING">Parsing</SelectItem>
                                <SelectItem value="GENERATING">Generating</SelectItem>
                                <SelectItem value="REVIEWING">Reviewing</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {programs.map(p => (
                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={streamFilter} onValueChange={setStreamFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Stream" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Streams</SelectItem>
                                <SelectItem value="Arts">Arts</SelectItem>
                                <SelectItem value="Science">Science</SelectItem>
                                <SelectItem value="Commerce">Commerce</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={examFilter} onValueChange={setExamFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Exams</SelectItem>
                                {exams.map(e => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.short_name || e.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary" className="gap-2">
                            <Filter className="w-4 h-4" />
                            Apply
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5" />
                            <p>{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && textbooks.length === 0 && (
                <Card>
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                            <BookText className="w-16 h-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No textbooks yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Get started by creating your first textbook from the MBSE syllabus.
                            </p>
                            <Link href="/admin/textbook-generator/new">
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create First Textbook
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Textbook List */}
            {!loading && !error && textbooks.length > 0 && (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {textbooks.map((textbook) => (
                            <li key={textbook.id}>
                                <Link
                                    href={`/admin/textbook-generator/${textbook.id}`}
                                    className="block hover:bg-gray-50 transition"
                                >
                                    <div className="px-4 py-5 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="text-base font-bold text-indigo-600 truncate">
                                                    {textbook.title}
                                                </span>
                                                <div className="ml-3">
                                                    {getStatusBadge(textbook.status)}
                                                </div>
                                            </div>
                                            <div className="ml-2 flex-shrink-0 text-xs text-gray-400">
                                                Updated {new Date(textbook.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <span className="font-semibold text-gray-600 mr-1.5">Class:</span>
                                                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{textbook.class_level}</span>
                                                    </div>
                                                    {textbook.stream && (
                                                        <div className="flex items-center">
                                                            <span className="font-semibold text-gray-600 mr-1.5">Stream:</span>
                                                            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-blue-700">{textbook.stream}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center">
                                                        <span className="font-semibold text-gray-600 mr-1.5">Units:</span>
                                                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{textbook._count?.units || 0}</span>
                                                    </div>
                                                </div>

                                                <div className="max-w-md">
                                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                                        <span className="text-muted-foreground font-medium">Generation Progress</span>
                                                        <span className="font-bold text-indigo-600">{textbook.progress}%</span>
                                                    </div>
                                                    <Progress value={textbook.progress} className="h-1.5" />
                                                </div>
                                            </div>

                                            <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
