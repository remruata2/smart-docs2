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
    className?: string;
}

export function QuestionCard({
    questionType,
    questionNumber,
    totalQuestions,
    points,
    children,
    className = ""
}: QuestionCardProps) {

    // Get gradient background based on question type
    const getGradient = () => {
        switch (questionType) {
            case "MCQ":
                return "bg-gradient-to-br from-blue-50 via-blue-100/50 to-white dark:from-blue-950/20 dark:via-blue-900/10 dark:to-background";
            case "TRUE_FALSE":
                return "bg-gradient-to-br from-green-50 via-emerald-100/50 to-white dark:from-green-950/20 dark:via-emerald-900/10 dark:to-background";
            case "FILL_IN_BLANK":
                return "bg-gradient-to-br from-purple-50 via-purple-100/50 to-white dark:from-purple-950/20 dark:via-purple-900/10 dark:to-background";
            case "SHORT_ANSWER":
                return "bg-gradient-to-br from-orange-50 via-orange-100/50 to-white dark:from-orange-950/20 dark:via-orange-900/10 dark:to-background";
            case "LONG_ANSWER":
                return "bg-gradient-to-br from-teal-50 via-teal-100/50 to-white dark:from-teal-950/20 dark:via-teal-900/10 dark:to-background";
            default:
                return "bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-background";
        }
    };

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
        <Card className={`${getGradient()} border-2 shadow-lg transition-all duration-300 hover:shadow-xl ${className}`}>
            <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                        <Badge variant="secondary" className="font-medium">
                            {typeInfo.label}
                        </Badge>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                            Question {questionNumber} of {totalQuestions}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {points} {points === 1 ? 'point' : 'points'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {children}
            </CardContent>
        </Card>
    );
}
