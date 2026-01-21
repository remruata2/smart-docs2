'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Pencil, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Type for the new hierarchical format
export interface TopicWithSubtopics {
    title: string;
    subtopics: string[];
}

interface TopicEditorProps {
    chapterId: number;
    syllabusId: number;
    initialTopics: any; // Can be string[], TopicWithSubtopics[], or stringified JSON - migrateToNewFormat handles all cases
    onUpdate?: () => void;
}

// Helper to migrate old format (string[]) to new format (TopicWithSubtopics[])
// Also handles stringified JSON and various edge cases
function migrateToNewFormat(data: any): TopicWithSubtopics[] {
    // Handle null/undefined
    if (data == null) {
        return [];
    }

    // Handle stringified JSON (common when data comes from DB)
    if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            return migrateToNewFormat(parsed); // Recursively handle the parsed result
        } catch (e) {
            // Not valid JSON, treat as single topic title
            return [{ title: data, subtopics: [] }];
        }
    }

    // Handle non-array types
    if (!Array.isArray(data)) {
        return [];
    }

    // Handle empty array
    if (data.length === 0) {
        return [];
    }

    // Check if already in new format (array of objects with title property)
    const firstItem = data[0];
    if (typeof firstItem === 'object' && firstItem !== null && 'title' in firstItem) {
        return data as TopicWithSubtopics[];
    }

    // Migrate from old format (array of strings or stringified values)
    return data.map(item => {
        // Handle nested stringified JSON in individual items
        if (typeof item === 'string') {
            const trimmed = item.trim();
            // Check if it's a stringified array
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        // Flatten and return first item as a topic, or handle specially
                        return parsed.map((p: any) => ({ title: String(p), subtopics: [] }));
                    }
                } catch (e) {
                    // Not valid JSON
                }
            }
            return { title: item, subtopics: [] };
        }
        return { title: String(item), subtopics: [] };
    }).flat();
}

export function TopicEditor({ chapterId, syllabusId, initialTopics, onUpdate }: TopicEditorProps) {
    const [topics, setTopics] = useState<TopicWithSubtopics[]>(() => migrateToNewFormat(initialTopics));
    const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());

    // Editing state
    const [editingTopicIndex, setEditingTopicIndex] = useState<number | null>(null);
    const [editTopicValue, setEditTopicValue] = useState('');
    const [editingSubtopic, setEditingSubtopic] = useState<{ topicIndex: number; subtopicIndex: number } | null>(null);
    const [editSubtopicValue, setEditSubtopicValue] = useState('');

    // New item state
    const [newTopic, setNewTopic] = useState('');
    const [newSubtopic, setNewSubtopic] = useState<{ topicIndex: number; value: string } | null>(null);

    const [saving, setSaving] = useState(false);

    const toggleExpand = (index: number) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const saveTopics = async (updatedTopics: TopicWithSubtopics[]) => {
        try {
            setSaving(true);
            const res = await fetch(`/api/admin/syllabi/${syllabusId}/chapters/${chapterId}/subtopics`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics: updatedTopics }),
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success('Topics updated');
            setTopics(updatedTopics);
            // Note: We don't call onUpdate() here to avoid full page rerender
            // The local state is already updated, which is sufficient for the UI
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    // ===== Topic Actions =====
    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        const updated = [...topics, { title: newTopic.trim(), subtopics: [] }];
        await saveTopics(updated);
        setNewTopic('');
        // Auto-expand the new topic
        setExpandedTopics(prev => new Set(prev).add(updated.length - 1));
    };

    const handleDeleteTopic = async (index: number) => {
        const updated = topics.filter((_, i) => i !== index);
        await saveTopics(updated);
    };

    const handleEditTopic = (index: number) => {
        setEditingTopicIndex(index);
        setEditTopicValue(topics[index].title);
    };

    const handleSaveTopicEdit = async () => {
        if (editingTopicIndex === null || !editTopicValue.trim()) return;
        const updated = [...topics];
        updated[editingTopicIndex] = { ...updated[editingTopicIndex], title: editTopicValue.trim() };
        await saveTopics(updated);
        setEditingTopicIndex(null);
        setEditTopicValue('');
    };

    const handleCancelTopicEdit = () => {
        setEditingTopicIndex(null);
        setEditTopicValue('');
    };

    // ===== Subtopic Actions =====
    const handleAddSubtopic = async (topicIndex: number) => {
        if (!newSubtopic || newSubtopic.topicIndex !== topicIndex || !newSubtopic.value.trim()) return;
        const updated = [...topics];
        updated[topicIndex] = {
            ...updated[topicIndex],
            subtopics: [...updated[topicIndex].subtopics, newSubtopic.value.trim()]
        };
        await saveTopics(updated);
        setNewSubtopic(null);
    };

    const handleDeleteSubtopic = async (topicIndex: number, subtopicIndex: number) => {
        const updated = [...topics];
        updated[topicIndex] = {
            ...updated[topicIndex],
            subtopics: updated[topicIndex].subtopics.filter((_, i) => i !== subtopicIndex)
        };
        await saveTopics(updated);
    };

    const handleEditSubtopic = (topicIndex: number, subtopicIndex: number) => {
        setEditingSubtopic({ topicIndex, subtopicIndex });
        setEditSubtopicValue(topics[topicIndex].subtopics[subtopicIndex]);
    };

    const handleSaveSubtopicEdit = async () => {
        if (!editingSubtopic || !editSubtopicValue.trim()) return;
        const { topicIndex, subtopicIndex } = editingSubtopic;
        const updated = [...topics];
        const newSubtopics = [...updated[topicIndex].subtopics];
        newSubtopics[subtopicIndex] = editSubtopicValue.trim();
        updated[topicIndex] = { ...updated[topicIndex], subtopics: newSubtopics };
        await saveTopics(updated);
        setEditingSubtopic(null);
        setEditSubtopicValue('');
    };

    const handleCancelSubtopicEdit = () => {
        setEditingSubtopic(null);
        setEditSubtopicValue('');
    };

    return (
        <div className="space-y-2 mt-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
                📋 Topics ({topics.length}):
            </div>

            {/* List of topics */}
            <div className="space-y-1">
                {topics.map((topic, topicIndex) => (
                    <div key={topicIndex} className="border rounded-md bg-muted/20">
                        {/* Topic Row - entire row is clickable */}
                        <div
                            className="flex items-center gap-2 text-sm group p-2 cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => {
                                if (editingTopicIndex !== topicIndex) {
                                    toggleExpand(topicIndex);
                                }
                            }}
                        >
                            <span className="text-muted-foreground">
                                {expandedTopics.has(topicIndex) ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </span>

                            {editingTopicIndex === topicIndex ? (
                                <>
                                    <Input
                                        value={editTopicValue}
                                        onChange={(e) => setEditTopicValue(e.target.value)}
                                        className="h-7 text-xs flex-1"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTopicEdit();
                                            if (e.key === 'Escape') handleCancelTopicEdit();
                                        }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveTopicEdit} disabled={saving}>
                                        <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancelTopicEdit}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs font-medium flex-1">{topic.title}</span>
                                    {topic.subtopics.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleEditTopic(topicIndex); }}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topicIndex); }}
                                        disabled={saving}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Subtopics (expanded) */}
                        {expandedTopics.has(topicIndex) && (
                            <div className="pl-8 pr-2 pb-2 space-y-1">
                                {topic.subtopics.map((subtopic, subtopicIndex) => (
                                    <div key={subtopicIndex} className="flex items-center gap-2 text-xs group/sub">
                                        {editingSubtopic?.topicIndex === topicIndex && editingSubtopic?.subtopicIndex === subtopicIndex ? (
                                            <>
                                                <Input
                                                    value={editSubtopicValue}
                                                    onChange={(e) => setEditSubtopicValue(e.target.value)}
                                                    className="h-6 text-xs flex-1"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveSubtopicEdit();
                                                        if (e.key === 'Escape') handleCancelSubtopicEdit();
                                                    }}
                                                />
                                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={handleSaveSubtopicEdit} disabled={saving}>
                                                    <Check className="h-2.5 w-2.5" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={handleCancelSubtopicEdit}>
                                                    <X className="h-2.5 w-2.5" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-muted-foreground flex-1">• {subtopic}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 w-5 p-0 opacity-0 group-hover/sub:opacity-100"
                                                    onClick={() => handleEditSubtopic(topicIndex, subtopicIndex)}
                                                >
                                                    <Pencil className="h-2.5 w-2.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 w-5 p-0 opacity-0 group-hover/sub:opacity-100 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteSubtopic(topicIndex, subtopicIndex)}
                                                    disabled={saving}
                                                >
                                                    <X className="h-2.5 w-2.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {/* Add new subtopic */}
                                {newSubtopic?.topicIndex === topicIndex ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Input
                                            placeholder="New subtopic..."
                                            value={newSubtopic.value}
                                            onChange={(e) => setNewSubtopic({ topicIndex, value: e.target.value })}
                                            className="h-6 text-xs flex-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddSubtopic(topicIndex);
                                                if (e.key === 'Escape') setNewSubtopic(null);
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => handleAddSubtopic(topicIndex)}
                                            disabled={saving || !newSubtopic.value.trim()}
                                        >
                                            Add
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => setNewSubtopic(null)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => setNewSubtopic({ topicIndex, value: '' })}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Subtopic
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new topic */}
            <div className="flex items-center gap-2 pt-1">
                <Input
                    placeholder="Add new topic..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={handleAddTopic}
                    disabled={saving || !newTopic.trim()}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Topic
                </Button>
            </div>
        </div>
    );
}
