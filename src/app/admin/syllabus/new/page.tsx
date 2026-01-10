'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, Save, Plus, Trash2, ListTree, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Unit {
    title: string;
    chapters: {
        number: string;
        title: string;
        subtopics: string[];
    }[];
}

export default function CreateSyllabusPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState<{ id: string | number, name: string }[]>([]);
    const [inputType, setInputType] = useState<'raw' | 'manual'>('raw');
    const [isCustomLevel, setIsCustomLevel] = useState(false);

    // Manual Builder State
    const [units, setUnits] = useState<Unit[]>([
        { title: '', chapters: [{ number: '1', title: '', subtopics: [''] }] }
    ]);

    // Syllabus splitting state (for competitive exams)
    const [syllabusMode, setSyllabusMode] = useState<'single' | 'multi_split'>('single');
    const [stateContext, setStateContext] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '',
        class_level: '',
        custom_class_level: '',
        stream: '',
        exam_category: 'academic_board', // Default to board exams
        academic_year: '2024-2025',
        board: 'MBSE',
        raw_text: ''
    });

    // Check if current exam category supports splitting
    const isCompetitiveCategory = ['government_prelims', 'government_mains', 'banking'].includes(formData.exam_category);

    useEffect(() => {
        async function fetchPrograms() {
            try {
                const res = await fetch('/api/admin/programs');
                if (res.ok) {
                    const data = await res.json();
                    setPrograms(data.programs || []);
                }
            } catch (error) {
                console.error('Failed to fetch programs:', error);
            }
        }
        fetchPrograms();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        if (name === 'class_level') {
            if (value === 'CUSTOM') {
                setIsCustomLevel(true);
                setFormData(prev => ({ ...prev, class_level: '' }));
            } else {
                setIsCustomLevel(false);
                setFormData(prev => ({ ...prev, class_level: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Manual Unit/Chapter Handlers
    const addUnit = () => {
        setUnits([...units, { title: '', chapters: [{ number: (units.length + 1).toString(), title: '', subtopics: [''] }] }]);
    };

    const removeUnit = (uIdx: number) => {
        setUnits(units.filter((_, i) => i !== uIdx));
    };

    const updateUnitTitle = (uIdx: number, title: string) => {
        const newUnits = [...units];
        newUnits[uIdx].title = title;
        setUnits(newUnits);
    };

    const addChapter = (uIdx: number) => {
        const newUnits = [...units];
        const nextNum = (newUnits[uIdx].chapters.length + 1).toString();
        newUnits[uIdx].chapters.push({ number: nextNum, title: '', subtopics: [''] });
        setUnits(newUnits);
    };

    const removeChapter = (uIdx: number, cIdx: number) => {
        const newUnits = [...units];
        newUnits[uIdx].chapters = newUnits[uIdx].chapters.filter((_, i) => i !== cIdx);
        setUnits(newUnits);
    };

    const updateChapter = (uIdx: number, cIdx: number, field: string, value: any) => {
        const newUnits = [...units];
        (newUnits[uIdx].chapters[cIdx] as any)[field] = value;
        setUnits(newUnits);
    };

    const addSubtopic = (uIdx: number, cIdx: number) => {
        const newUnits = [...units];
        newUnits[uIdx].chapters[cIdx].subtopics.push('');
        setUnits(newUnits);
    };

    const updateSubtopic = (uIdx: number, cIdx: number, sIdx: number, value: string) => {
        const newUnits = [...units];
        newUnits[uIdx].chapters[cIdx].subtopics[sIdx] = value;
        setUnits(newUnits);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const classLevel = isCustomLevel ? formData.custom_class_level : formData.class_level;

        if (!formData.title || !formData.subject || !classLevel) {
            toast.error('Please fill in all required fields');
            return;
        }

        const submissionData = {
            ...formData,
            class_level: classLevel,
            syllabus_mode: syllabusMode, // Now works for all categories
            stateContext: stateContext || undefined, // Pass for later use during parse
            units: inputType === 'manual' ? units : undefined
        };

        try {
            setLoading(true);

            const res = await fetch('/api/admin/syllabi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create syllabus');
            }

            const syllabusId = data.syllabus.id;

            if (syllabusMode === 'multi_split') {
                toast.success('Syllabus created! Click "Parse" to split into separate subjects.');
            } else {
                toast.success('Syllabus created successfully');
            }
            router.push(`/admin/syllabus/${syllabusId}`);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6">
                <Link href="/admin/syllabus" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Syllabi
                </Link>
                <h1 className="text-3xl font-bold">Create New Syllabus</h1>
                <p className="text-muted-foreground">Define the metadata and input syllabus content.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Syllabus Details</CardTitle>
                        <CardDescription>Basic information for categorization</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                {isCustomLevel ? (
                                    <div className="flex gap-2">
                                        <Input
                                            name="custom_class_level"
                                            placeholder="Enter Custom Class (e.g. Class 9)"
                                            value={formData.custom_class_level}
                                            onChange={handleChange}
                                            required
                                        />
                                        <Button variant="outline" onClick={() => setIsCustomLevel(false)}>Cancel</Button>
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.class_level}
                                        onValueChange={(val) => handleSelectChange('class_level', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Class/Program" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs.map(p => (
                                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                            ))}
                                            <SelectItem value="CUSTOM" className="font-bold text-indigo-600">Enter Custom...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
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
                            <div className="space-y-2">
                                <Label htmlFor="exam_category">Exam Category *</Label>
                                <Select
                                    value={formData.exam_category}
                                    onValueChange={(val) => handleSelectChange('exam_category', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Exam Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="academic_board">Academic (Board Exams - CBSE/MBSE)</SelectItem>
                                        <SelectItem value="engineering">Engineering (JEE Main/Advanced)</SelectItem>
                                        <SelectItem value="medical">Medical (NEET)</SelectItem>
                                        <SelectItem value="government_prelims">Government Prelims (UPSC/MPSC/SSC)</SelectItem>
                                        <SelectItem value="government_mains">Government Mains (UPSC/State)</SelectItem>
                                        <SelectItem value="banking">Banking & Finance (IBPS/SBI)</SelectItem>
                                        <SelectItem value="university">University/College</SelectItem>
                                        <SelectItem value="general">General Purpose</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    This determines the content style, question patterns, and exam tips.
                                </p>
                            </div>

                            {/* Syllabus Mode Toggle - Available for all exam categories */}
                            <div className="col-span-2 space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <Label className="text-amber-800 dark:text-amber-200 font-medium">
                                    Syllabus Mode
                                </Label>
                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="syllabusMode"
                                            value="single"
                                            checked={syllabusMode === 'single'}
                                            onChange={() => setSyllabusMode('single')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-medium">Single Subject</span>
                                            <p className="text-xs text-muted-foreground">Standard mode - creates one syllabus from your input</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="syllabusMode"
                                            value="multi_split"
                                            checked={syllabusMode === 'multi_split'}
                                            onChange={() => setSyllabusMode('multi_split')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-medium">Multi-Subject (Split & Expand)</span>
                                            <p className="text-xs text-muted-foreground">
                                                Each major topic becomes its own syllabus with AI-generated chapters and subtopics.
                                                Ideal for UPSC/MPSC/SSC syllabi like &quot;General Knowledge&quot;.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                                {syllabusMode === 'multi_split' && (
                                    <div className="mt-3 space-y-2">
                                        <Label htmlFor="stateContext">State Context (Optional)</Label>
                                        <Input
                                            id="stateContext"
                                            placeholder="e.g., Mizoram - for state-specific content"
                                            value={stateContext}
                                            onChange={(e) => setStateContext(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            If specified, AI will include state-specific content (history, geography, current affairs).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={inputType} onValueChange={(v) => setInputType(v as 'raw' | 'manual')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="raw" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Raw Text Paste
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="gap-2">
                            <ListTree className="w-4 h-4" />
                            Manual Builder
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="raw">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paste Syllabus Content</CardTitle>
                                <CardDescription>Input the text from PDF or Markdown</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    name="raw_text"
                                    placeholder="Paste the full syllabus content here..."
                                    className="min-h-[300px] font-mono text-sm"
                                    value={formData.raw_text}
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-muted-foreground">
                                    AI will attempt to parse this text into Units and Chapters.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="manual">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Structured Content Builder</CardTitle>
                                    <CardDescription>Add units and chapters manually</CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addUnit}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Unit
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {units.map((unit, uIdx) => (
                                    <div key={uIdx} className="p-4 border rounded-lg bg-slate-50 relative">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="font-bold text-slate-400">UNIT {uIdx + 1}</div>
                                            <Input
                                                placeholder="Unit Title (e.g. Kinematics)"
                                                value={unit.title}
                                                className="bg-white"
                                                onChange={(e) => updateUnitTitle(uIdx, e.target.value)}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeUnit(uIdx)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>

                                        <div className="pl-8 space-y-4 border-l-2 border-slate-200">
                                            {unit.chapters.map((chapter, cIdx) => (
                                                <div key={cIdx} className="p-4 border bg-white rounded shadow-sm relative group">
                                                    <div className="grid grid-cols-12 gap-2 items-center mb-2">
                                                        <div className="col-span-2">
                                                            <Label className="text-[10px] uppercase font-bold text-slate-400">No.</Label>
                                                            <Input
                                                                value={chapter.number}
                                                                onChange={(e) => updateChapter(uIdx, cIdx, 'number', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-9">
                                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Chapter Title</Label>
                                                            <Input
                                                                placeholder="Chapter Name"
                                                                value={chapter.title}
                                                                onChange={(e) => updateChapter(uIdx, cIdx, 'title', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-1 pt-6 text-right">
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeChapter(uIdx, cIdx)}>
                                                                <Trash2 className="w-4 h-4 text-red-400" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Subtopics / Covered Points</Label>
                                                        {chapter.subtopics.map((st, sIdx) => (
                                                            <div key={sIdx} className="flex gap-2">
                                                                <Input
                                                                    placeholder="e.g. Newton's First Law"
                                                                    className="text-sm h-8"
                                                                    value={st}
                                                                    onChange={(e) => updateSubtopic(uIdx, cIdx, sIdx, e.target.value)}
                                                                />
                                                                {chapter.subtopics.length > 1 && (
                                                                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => {
                                                                        const newUnits = [...units];
                                                                        newUnits[uIdx].chapters[cIdx].subtopics.splice(sIdx, 1);
                                                                        setUnits(newUnits);
                                                                    }}>
                                                                        <Trash2 className="w-3 h-3 text-red-300" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <Button type="button" variant="link" size="sm" className="h-6 p-0 text-indigo-600" onClick={() => addSubtopic(uIdx, cIdx)}>
                                                            <Plus className="w-3 h-3 mr-1" /> Add Point
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => addChapter(uIdx)}>
                                                <Plus className="w-4 h-4 mr-1" /> Add Chapter to Unit {uIdx + 1}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Syllabus...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            Create Syllabus
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
