'use client';

import { useState, useTransition, useEffect } from "react";
import { QuestionType } from "@/generated/prisma";
import { createQuestion, updateQuestion } from "./actions";
import { toast } from "sonner";

interface QuestionFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    chapterId: string;
    question?: any | null;
    onSuccess: (question: any) => void;
}

export default function QuestionFormDialog({
    isOpen,
    onClose,
    chapterId,
    question,
    onSuccess
}: QuestionFormDialogProps) {
    const [isPending, startTransition] = useTransition();
    const isEdit = !!question;

    const [formData, setFormData] = useState({
        question_text: question?.question_text || '',
        question_type: question?.question_type || 'MCQ' as QuestionType,
        difficulty: question?.difficulty || 'medium',
        options: question?.options || ['', '', '', ''],
        correct_answer: question?.correct_answer || '',
        explanation: question?.explanation || '',
        points: question?.points || 1,
    });

    // Update form data when question prop changes or dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                question_text: question?.question_text || '',
                question_type: question?.question_type || 'MCQ' as QuestionType,
                difficulty: question?.difficulty || 'medium',
                options: question?.options || ['', '', '', ''],
                correct_answer: question?.correct_answer || '',
                explanation: question?.explanation || '',
                points: question?.points || 1,
            });
        }
    }, [question, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.question_text.trim() || formData.question_text.length < 10) {
            toast.error("Question text must be at least 10 characters");
            return;
        }

        // Prepare options based on question type
        let options = null;
        let correctAnswer: any = formData.correct_answer;

        if (formData.question_type === 'MCQ' || formData.question_type === 'TRUE_FALSE') {
            if (formData.question_type === 'TRUE_FALSE') {
                options = ['True', 'False'];
                correctAnswer = formData.correct_answer; // Should be "True" or "False"
            } else {
                // MCQ: filter out empty options
                const filteredOptions = formData.options.filter((opt: string) => opt.trim());
                if (filteredOptions.length < 2) {
                    toast.error("MCQ must have at least 2 options");
                    return;
                }
                options = filteredOptions;
                correctAnswer = formData.correct_answer;
            }
        }

        if (!correctAnswer || (typeof correctAnswer === 'string' && !correctAnswer.trim())) {
            toast.error("Correct answer is required");
            return;
        }

        startTransition(async () => {
            try {
                const data = {
                    question_text: formData.question_text,
                    question_type: formData.question_type,
                    difficulty: formData.difficulty,
                    options,
                    correct_answer: correctAnswer,
                    explanation: formData.explanation || undefined,
                    points: formData.points,
                };

                let result;
                if (isEdit) {
                    result = await updateQuestion(question.id, data);
                } else {
                    result = await createQuestion(chapterId, data);
                }

                toast.success(isEdit ? "Question updated" : "Question created");
                onSuccess(result);
            } catch (error: any) {
                toast.error(error.message || "Failed to save question");
            }
        });
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const addOption = () => {
        setFormData({ ...formData, options: [...formData.options, ''] });
    };

    const removeOption = (index: number) => {
        if (formData.options.length <= 2) {
            toast.error("Must have at least 2 options");
            return;
        }
        const newOptions = formData.options.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, options: newOptions });
    };

    if (!isOpen) return null;

    const showOptions = formData.question_type === 'MCQ' || formData.question_type === 'TRUE_FALSE';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4">
                    <h2 className="text-2xl font-bold">
                        {isEdit ? 'Edit Question' : 'Add New Question'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Question Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question Text *
                        </label>
                        <textarea
                            value={formData.question_text}
                            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* Question Type & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Question Type *
                            </label>
                            <select
                                value={formData.question_type}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    question_type: e.target.value as QuestionType,
                                    options: e.target.value === 'TRUE_FALSE' ? ['True', 'False'] : ['', '', '', ''],
                                    correct_answer: ''
                                })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="MCQ">Multiple Choice</option>
                                <option value="TRUE_FALSE">True/False</option>
                                <option value="FILL_IN_BLANK">Fill in the Blank</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                                <option value="LONG_ANSWER">Long Answer</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Difficulty *
                            </label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Options (for MCQ/True-False) */}
                    {showOptions && formData.question_type === 'MCQ' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Options *
                            </label>
                            {formData.options.map((opt: string, idx: number) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${idx + 1}`}
                                        className="flex-1 px-3 py-2 border rounded-md"
                                    />
                                    {formData.options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            {formData.options.length < 6 && (
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="text-sm text-indigo-600 hover:text-indigo-700"
                                >
                                    + Add Option
                                </button>
                            )}
                        </div>
                    )}

                    {/* Correct Answer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correct Answer *
                        </label>
                        {formData.question_type === 'MCQ' ? (
                            <select
                                value={formData.correct_answer}
                                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="">Select correct option</option>
                                {formData.options.filter((opt: string) => opt.trim()).map((opt: string, idx: number) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : formData.question_type === 'TRUE_FALSE' ? (
                            <select
                                value={formData.correct_answer}
                                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="">Select answer</option>
                                <option value="True">True</option>
                                <option value="False">False</option>
                            </select>
                        ) : (
                            <textarea
                                value={formData.correct_answer}
                                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                rows={formData.question_type === 'LONG_ANSWER' ? 4 : 2}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Enter the correct answer"
                                required
                            />
                        )}
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Explanation (Optional)
                        </label>
                        <textarea
                            value={formData.explanation}
                            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Provide an explanation for the answer"
                        />
                    </div>

                    {/* Points */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Points *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.points}
                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            disabled={isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            disabled={isPending}
                        >
                            {isPending ? 'Saving...' : isEdit ? 'Update Question' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
