'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, FileText, Loader2, RefreshCw } from 'lucide-react';

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

    const fetchSyllabi = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/syllabi');
            if (!res.ok) throw new Error('Failed to fetch syllabi');
            const data = await res.json();
            setSyllabi(data.syllabi);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {syllabi.map((syllabus) => (
                        <Link key={syllabus.id} href={`/admin/syllabus/${syllabus.id}`}>
                            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <Badge variant={syllabus.status === 'PARSED' ? 'default' : 'secondary'}>
                                            {syllabus.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(syllabus.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="line-clamp-2 mt-2">{syllabus.title}</CardTitle>
                                    <CardDescription>
                                        Class {syllabus.class_level} • {syllabus.subject}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            {syllabus._count.units > 0 ? `${syllabus._count.units} Units` : 'No structure'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <RefreshCw className="w-4 h-4" />
                                            {syllabus._count.textbooks} Textbooks
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
