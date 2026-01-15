import { useState, useEffect } from "react";

export type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "SHORT_ANSWER" | "LONG_ANSWER";

export interface QuestionBankConfigState {
    easy: Record<QuestionType, number>;
    medium: Record<QuestionType, number>;
    hard: Record<QuestionType, number>;
}

const DEFAULT_CONFIG: QuestionBankConfigState = {
    easy: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
    medium: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
    hard: { MCQ: 10, TRUE_FALSE: 10, FILL_IN_BLANK: 10, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
};

export function QuestionBankConfig({
    onChange
}: {
    onChange: (config: QuestionBankConfigState) => void;
}) {
    const [config, setConfig] = useState<QuestionBankConfigState>(DEFAULT_CONFIG);
    const [isOpen, setIsOpen] = useState(false);

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
