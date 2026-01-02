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

    const fetchTextbooks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (classFilter !== 'all') params.append('class_level', classFilter);
            if (streamFilter !== 'all') params.append('stream', streamFilter);
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
    }, [statusFilter, classFilter, streamFilter, search]);

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
                                <SelectItem value="XI">Class XI</SelectItem>
                                <SelectItem value="XII">Class XII</SelectItem>
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

            {/* Textbook Grid */}
            {!loading && !error && textbooks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {textbooks.map((textbook) => (
                        <Link
                            key={textbook.id}
                            href={`/admin/textbook-generator/${textbook.id}`}
                        >
                            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="line-clamp-2">{textbook.title}</CardTitle>
                                            <CardDescription className="mt-1">
                                                Class {textbook.class_level}
                                                {textbook.stream && ` • ${textbook.stream}`}
                                            </CardDescription>
                                        </div>
                                        {getStatusBadge(textbook.status)}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {textbook.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                            {textbook.description}
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{textbook.progress}%</span>
                                        </div>
                                        <Progress value={textbook.progress} className="h-2" />
                                    </div>
                                </CardContent>
                                <CardFooter className="text-xs text-muted-foreground">
                                    <div className="flex items-center justify-between w-full">
                                        <span>
                                            {textbook._count?.units || 0} units
                                        </span>
                                        <span>
                                            Updated {new Date(textbook.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}

                    {/* Create New Card */}
                    <Link href="/admin/textbook-generator/new">
                        <Card className="h-full border-dashed hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]">
                            <CardContent className="flex flex-col items-center justify-center text-center py-8">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Plus className="w-6 h-6 text-primary" />
                                </div>
                                <p className="font-medium">Create New Textbook</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            )}
        </div>
    );
}
