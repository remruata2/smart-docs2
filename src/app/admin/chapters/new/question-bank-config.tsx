'use client';

import { useState, useEffect } from "react";
import { QuestionType, QuestionBankConfigState, DEFAULT_CONFIG } from "@/lib/question-bank-defaults";

// Re-export for backwards compatibility
export type { QuestionType, QuestionBankConfigState };

export function QuestionBankConfig({
    value,
    onChange
}: {
    value?: QuestionBankConfigState | null;
    onChange: (config: QuestionBankConfigState) => void;
}) {
    const [config, setConfig] = useState<QuestionBankConfigState>(value || DEFAULT_CONFIG);
    const [isOpen, setIsOpen] = useState(false);

    // Sync from prop if provided
    useEffect(() => {
        if (value) {
            setConfig(value);
        }
    }, [value]);

    useEffect(() => {
        onChange(config);
    }, [config, onChange]);

    const updateCount = (difficulty: keyof QuestionBankConfigState, type: QuestionType, value: number) => {
        setConfig(prev => ({
            ...prev,
            [difficulty]: {
                ...prev[difficulty],
                [type]: value
            }
        }));
    };

    const totalQuestions = Object.values(config).reduce((acc: number, diff: Record<QuestionType, number>) =>
        acc + Object.values(diff).reduce((sum: number, count: number) => sum + count, 0), 0
    );

    return (
        <div className="border rounded-lg p-4 bg-gray-50">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left"
            >
                <div>
                    <h3 className="text-sm font-medium text-gray-900">Question Bank Configuration</h3>
                    <p className="text-xs text-gray-500">
                        Auto-generate {totalQuestions} questions per chapter
                    </p>
                </div>
                <span className="text-indigo-600 text-sm font-medium">
                    {isOpen ? "Hide" : "Customize"}
                </span>
            </button>

            {isOpen && (
                <div className="mt-4 space-y-6">
                    {/* Global Question Type Toggles */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Enable Question Types</h4>
                        <div className="flex flex-wrap gap-4">
                            {(['MCQ', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER'] as const).map((type) => {
                                const isEnabled = (['easy', 'medium', 'hard'] as const).some(d => (config[d][type] || 0) > 0);
                                return (
                                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setConfig(prev => {
                                                    const next = { ...prev };
                                                    (['easy', 'medium', 'hard'] as const).forEach(diff => {
                                                        if (checked) {
                                                            // Restore from default or provided value if 0
                                                            const baseVal = value?.[diff][type] || DEFAULT_CONFIG[diff][type];
                                                            next[diff] = { ...next[diff], [type]: baseVal > 0 ? baseVal : (type === 'MCQ' ? 5 : 2) };
                                                        } else {
                                                            // Disable (set to 0)
                                                            next[diff] = { ...next[diff], [type]: 0 };
                                                        }
                                                    });
                                                    return next;
                                                });
                                            }}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                        />
                                        <span className="text-sm text-gray-700 capitalize">
                                            {type.replace(/_/g, " ").toLowerCase()}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                        <div key={difficulty}>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{difficulty} Difficulty</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {(['MCQ', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER'] as const).map((type) => (
                                    <div key={type}>
                                        <label className="block text-[10px] text-gray-500 mb-1">
                                            {type.replace(/_/g, " ")}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={config[difficulty][type] || 0}
                                            onChange={(e) => updateCount(difficulty, type, parseInt(e.target.value) || 0)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs border p-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="text-xs text-gray-500 italic border-t pt-2">
                        * Questions will be generated in the background after chapter processing is complete.
                    </div>
                </div>
            )}
        </div>
    );
}
