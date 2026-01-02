'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SubtopicEditorProps {
    chapterId: number;
    syllabusId: number;
    initialSubtopics: string[];
    onUpdate?: () => void;
}

export function SubtopicEditor({ chapterId, syllabusId, initialSubtopics, onUpdate }: SubtopicEditorProps) {
    const [subtopics, setSubtopics] = useState<string[]>(initialSubtopics);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newSubtopic, setNewSubtopic] = useState('');
    const [saving, setSaving] = useState(false);

    const saveSubtopics = async (updatedSubtopics: string[]) => {
        try {
            setSaving(true);
            const res = await fetch(`/api/admin/syllabi/${syllabusId}/chapters/${chapterId}/subtopics`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtopics: updatedSubtopics }),
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success('Subtopics updated');
            setSubtopics(updatedSubtopics);
            onUpdate?.();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = async () => {
        if (!newSubtopic.trim()) return;
        const updated = [...subtopics, newSubtopic.trim()];
        await saveSubtopics(updated);
        setNewSubtopic('');
    };

    const handleDelete = async (index: number) => {
        const updated = subtopics.filter((_, i) => i !== index);
        await saveSubtopics(updated);
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditValue(subtopics[index]);
    };

    const handleSaveEdit = async () => {
        if (editingIndex === null || !editValue.trim()) return;
        const updated = [...subtopics];
        updated[editingIndex] = editValue.trim();
        await saveSubtopics(updated);
        setEditingIndex(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    return (
        <div className="space-y-2 mt-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
                📋 Subtopics ({subtopics.length}):
            </div>

            {/* List of subtopics */}
            <div className="space-y-1">
                {subtopics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm group">
                        {editingIndex === index ? (
                            <>
                                <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                >
                                    <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={handleCancelEdit}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="text-xs text-muted-foreground flex-1">• {topic}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={() => handleEdit(index)}
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(index)}
                                    disabled={saving}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new subtopic */}
            <div className="flex items-center gap-2 pt-1">
                <Input
                    placeholder="Add new subtopic..."
                    value={newSubtopic}
                    onChange={(e) => setNewSubtopic(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={handleAdd}
                    disabled={saving || !newSubtopic.trim()}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                </Button>
            </div>
        </div>
    );
}
