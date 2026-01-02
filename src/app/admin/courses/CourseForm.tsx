"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Save, Trash2 } from "lucide-react";
import { upsertCourse, deleteCourse, getSubjectsByBoard } from "./actions";

interface CourseFormProps {
    course?: any;
    boards: any[];
    instructors: any[];
}

export function CourseForm({ course, boards, instructors }: CourseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingSubjects, setFetchingSubjects] = useState(false);
    const [title, setTitle] = useState(course?.title || "");
    const [description, setDescription] = useState(course?.description || "");
    const [boardId, setBoardId] = useState(course?.board_id || boards[0]?.id || "");
    const [isPublished, setIsPublished] = useState(course?.is_published || false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>(
        course?.subjects?.map((s: any) => s.id) || []
    );
    const [isFree, setIsFree] = useState(course?.is_free ?? true);
    const [price, setPrice] = useState(course?.price?.toString() || "");
    const [currency, setCurrency] = useState(course?.currency || "INR");
    const [instructorId, setInstructorId] = useState(course?.instructor_id?.toString() || "");

    useEffect(() => {
        if (boardId) {
            loadSubjects();
        }
    }, [boardId]);

    async function loadSubjects() {
        setFetchingSubjects(true);
        try {
            const data = await getSubjectsByBoard(boardId);
            setSubjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingSubjects(false);
        }
    }

    const toggleSubject = (id: number) => {
        setSelectedSubjectIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await upsertCourse({
                id: course?.id,
                title,
                description,
                board_id: boardId,
                is_published: isPublished,
                is_free: isFree,
                price: isFree ? undefined : parseFloat(price),
                currency: isFree ? undefined : currency,
                instructor_id: instructorId ? parseInt(instructorId) : undefined,
                subjectIds: selectedSubjectIds,
            });
            router.push("/admin/courses");
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this course?")) return;
        setLoading(true);
        try {
            await deleteCourse(course.id);
            router.push("/admin/courses");
            router.refresh();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    {course ? `Edit: ${course.title}` : "Create New Course"}
                </h1>
                <div className="flex gap-2">
                    {course && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Course
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Course Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Course Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. MBSE Class 12 Science Bundle"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What's included in this course?"
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="board">Target Board</Label>
                            <select
                                id="board"
                                className="w-full p-2 border rounded-md"
                                value={boardId}
                                onChange={e => setBoardId(e.target.value)}
                            >
                                {boards.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.id} - {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-4 pb-4 border-b">
                            <div className="space-y-0.5">
                                <Label>Published Status</Label>
                                <p className="text-sm text-gray-500">Make this course visible in the student catalog</p>
                            </div>
                            <Checkbox
                                checked={isPublished}
                                onCheckedChange={(checked) => setIsPublished(checked === true)}
                            />
                        </div>

                        <div className="space-y-4 pt-4">
                            <CardTitle className="text-lg">Pricing & Instructor</CardTitle>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Free Course</Label>
                                    <p className="text-sm text-gray-500">Students can enroll without payment</p>
                                </div>
                                <Checkbox
                                    checked={isFree}
                                    onCheckedChange={(checked) => setIsFree(checked === true)}
                                />
                            </div>

                            {!isFree && (
                                <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-300">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="price">Price</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                            placeholder="0.00"
                                            required={!isFree}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <select
                                            id="currency"
                                            className="w-full h-10 px-3 py-2 border rounded-md text-sm"
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                        >
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="instructor">Assigned Instructor</Label>
                                <select
                                    id="instructor"
                                    className="w-full p-2 border rounded-md text-sm"
                                    value={instructorId}
                                    onChange={e => setInstructorId(e.target.value)}
                                >
                                    <option value="">No Instructor Assigned</option>
                                    {instructors.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.user.username} {inst.title ? `(${inst.title})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Included Subjects</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Select the subjects that belong to this course. Students will get access to all selected subjects.
                        </p>

                        {fetchingSubjects ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : subjects.length === 0 ? (
                            <p className="text-center py-8 text-gray-400 italic">
                                No subjects found for the selected board.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {subjects.map(subject => {
                                    const isSelected = selectedSubjectIds.includes(subject.id);
                                    return (
                                        <div
                                            key={subject.id}
                                            onClick={() => toggleSubject(subject.id)}
                                            className={`
                                                flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all
                                                ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-100'}
                                            `}
                                        >
                                            <div>
                                                <p className="font-semibold text-sm">{subject.name}</p>
                                                <p className="text-xs text-gray-500">{subject.program.name}</p>
                                            </div>
                                            {isSelected ? (
                                                <Badge className="bg-blue-600">
                                                    <Check className="h-3 w-3 mr-1" /> Selected
                                                </Badge>
                                            ) : (
                                                <div className="h-6 w-6 rounded-full border border-gray-200" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}
