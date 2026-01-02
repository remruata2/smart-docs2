'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function CreateSyllabusPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '',
        class_level: '',
        stream: '',
        academic_year: '2024-2025',
        board: 'MBSE',
        raw_text: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.subject || !formData.class_level) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch('/api/admin/syllabi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create syllabus');
            }

            toast.success('Syllabus created successfully');

            // If raw text provided, simulate "Parsing" triggered? 
            // Better to redirect to detail page where user can click "Parse".
            router.push(`/admin/syllabus/${data.syllabus.id}`);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-3xl">
            <div className="mb-6">
                <Link href="/admin/syllabus" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Syllabi
                </Link>
                <h1 className="text-3xl font-bold">Create New Syllabus</h1>
                <p className="text-muted-foreground">Define the metadata and input raw context.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Syllabus Details</CardTitle>
                    <CardDescription>Enter the syllabus information for proper categorization</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="e.g. MBSE Physics Class XI"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    name="subject"
                                    placeholder="e.g. Physics"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class_level">Class Level *</Label>
                                <Select
                                    value={formData.class_level}
                                    onValueChange={(val) => handleSelectChange('class_level', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="XI">XI</SelectItem>
                                        <SelectItem value="XII">XII</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stream">Stream (Optional)</Label>
                                <Select
                                    value={formData.stream}
                                    onValueChange={(val) => handleSelectChange('stream', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Stream" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Science">Science</SelectItem>
                                        <SelectItem value="Arts">Arts</SelectItem>
                                        <SelectItem value="Commerce">Commerce</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="raw_text">Raw Syllabus Text</Label>
                            <Textarea
                                id="raw_text"
                                name="raw_text"
                                placeholder="Paste the full syllabus content here..."
                                className="min-h-[200px] font-mono text-sm"
                                value={formData.raw_text}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">
                                You can paste the text content from PDF or markdown.
                                For best results, ensure headings like "Unit I" or "Part A" are clear.
                            </p>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Draft
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
