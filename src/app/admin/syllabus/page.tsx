'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, FileText, Loader2, RefreshCw, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Syllabus {
    id: number;
    title: string;
    subject: string;
    class_level: string;
    status: 'DRAFT' | 'PARSING' | 'PARSED' | 'ARCHIVED';
    _count: {
        units: number;
        textbooks: number;
    };
    updated_at: string;
}

export default function SyllabusListPage() {
    const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [examFilter, setExamFilter] = useState('all');
    const [programs, setPrograms] = useState<{ id: string | number, name: string }[]>([]);
    const [exams, setExams] = useState<{ id: string, name: string, short_name: string | null }[]>([]);

    const fetchSyllabi = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (classFilter !== 'all') params.append('class_level', classFilter);
            if (examFilter !== 'all') params.append('exam_id', examFilter);
            if (search) params.append('search', search);

            const res = await fetch(`/api/admin/syllabi?${params}`);
            if (!res.ok) throw new Error('Failed to fetch syllabi');
            const data = await res.json();
            setSyllabi(data.syllabi);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [classFilter, examFilter, search]);

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

    useEffect(() => {
        fetchSyllabi();
    }, [fetchSyllabi]);

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Syllabus Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage raw syllabi and convert them into structured blueprints for textbooks.
                    </p>
                </div>
                <Link href="/admin/syllabus/new">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Syllabus
                    </Button>
                </Link>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search syllabi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by Class" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {programs.map((p) => (
                            <SelectItem key={p.id} value={p.name}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={examFilter} onValueChange={setExamFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by Exam" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Exams</SelectItem>
                        {exams.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                                {e.short_name || e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {error}
                </div>
            ) : syllabi.length === 0 ? (
                <Card>
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Syllabi Found</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                            Generate your first syllabus blueprint by uploading raw text or a PDF content.
                        </p>
                        <Link href="/admin/syllabus/new">
                            <Button>Create Syllabus</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {syllabi.map((syllabus) => (
                            <li key={syllabus.id}>
                                <Link
                                    href={`/admin/syllabus/${syllabus.id}`}
                                    className="block hover:bg-gray-50 transition"
                                >
                                    <div className="px-4 py-5 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="text-base font-bold text-indigo-600 truncate">
                                                    {syllabus.title}
                                                </span>
                                                <span className={`ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${syllabus.status === 'PARSED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                                    {syllabus.status}
                                                </span>
                                            </div>
                                            <div className="ml-2 flex-shrink-0 text-xs text-gray-400">
                                                Updated {new Date(syllabus.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">Class:</span>
                                                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{syllabus.class_level}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">Subject:</span>
                                                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{syllabus.subject}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                    <FileText className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                    <span className="font-bold mr-1.5">Units:</span>
                                                    <span className="tabular-nums font-medium">{syllabus._count.units}</span>
                                                </div>
                                                <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                    <span className="font-bold mr-1.5">Textbooks:</span>
                                                    <span className="tabular-nums font-medium">{syllabus._count.textbooks}</span>
                                                </div>
                                            </div>
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
