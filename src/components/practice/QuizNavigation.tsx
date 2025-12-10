"use client";

import { CheckCircle2, Circle, Dot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuizNavigationProps {
    totalQuestions: number;
    currentQuestionIndex: number;
    answeredQuestions: Set<number>;
    onNavigate: (index: number) => void;
    className?: string;
}

export function QuizNavigation({
    totalQuestions,
    currentQuestionIndex,
    answeredQuestions,
    onNavigate,
    className = ""
}: QuizNavigationProps) {

    const getStatusIcon = (index: number) => {
        const isCurrent = index === currentQuestionIndex;
        const isAnswered = answeredQuestions.has(index);

        if (isCurrent) {
            return <Dot className="h-6 w-6 text-primary animate-pulse" />;
        } else if (isAnswered) {
            return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        } else {
            return <Circle className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getButtonVariant = (index: number) => {
        if (index === currentQuestionIndex) {
            return "default";
        } else if (answeredQuestions.has(index)) {
            return "outline";
        } else {
            return "ghost";
        }
    };

    // Calculate stats
    const answeredCount = answeredQuestions.size;
    const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

    return (
        <Card className={`${className}`}>
            <CardHeader>
                <CardTitle className="text-lg">Question Navigator</CardTitle>
                <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{answeredCount}/{totalQuestions}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: totalQuestions }, (_, i) => (
                            <Button
                                key={i}
                                variant={getButtonVariant(i)}
                                size="sm"
                                onClick={() => onNavigate(i)}
                                className="relative h-12 w-full"
                            >
                                <div className="flex flex-col items-center justify-center gap-1">
                                    {getStatusIcon(i)}
                                    <span className="text-xs font-medium">{i + 1}</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Not answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dot className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Current question</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
