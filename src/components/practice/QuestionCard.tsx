"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Circle,
    FileText,
    ListChecks,
    PenLine
} from "lucide-react";

type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "SHORT_ANSWER" | "LONG_ANSWER";

interface QuestionCardProps {
    questionType: QuestionType;
    questionNumber: number;
    totalQuestions: number;
    points: number;
    children: ReactNode;
    className?: string; // Optional class override
}

export function QuestionCard({
    questionType,
    questionNumber,
    totalQuestions,
    points,
    children,
    className = ""
}: QuestionCardProps) {

    // Get icon and label for question type
    const getTypeInfo = () => {
        switch (questionType) {
            case "MCQ":
                return { icon: ListChecks, label: "Multiple Choice", color: "text-blue-600 dark:text-blue-400" };
            case "TRUE_FALSE":
                return { icon: CheckCircle2, label: "True/False", color: "text-green-600 dark:text-green-400" };
            case "FILL_IN_BLANK":
                return { icon: Circle, label: "Fill in the Blank", color: "text-purple-600 dark:text-purple-400" };
            case "SHORT_ANSWER":
                return { icon: PenLine, label: "Short Answer", color: "text-orange-600 dark:text-orange-400" };
            case "LONG_ANSWER":
                return { icon: FileText, label: "Essay", color: "text-teal-600 dark:text-teal-400" };
            default:
                return { icon: FileText, label: "Question", color: "text-gray-600 dark:text-gray-400" };
        }
    };

    const typeInfo = getTypeInfo();
    const TypeIcon = typeInfo.icon;

    return (
        <Card className={`border-2 border-border/60 shadow-xl ${className} bg-card/50 backdrop-blur-sm`}>
            <CardHeader className="pb-4 md:pb-6 space-y-0 bg-muted/30 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50`}>
                            <TypeIcon className={`h-5 w-5 md:h-6 md:w-6 ${typeInfo.color}`} />
                        </div>
                        <div>
                            <Badge variant="secondary" className="font-semibold px-2.5 py-0.5 text-xs md:text-sm border-0">
                                {typeInfo.label}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-bold opacity-70">
                            Points
                        </span>
                        <span className="text-sm md:text-lg font-bold tabular-nums leading-none">
                            {points}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 md:pt-8 p-6 md:p-8 space-y-6 md:space-y-8">
                {children}
            </CardContent>
        </Card>
    );
}
