"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardViewerProps {
    flashcards: Flashcard[];
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No flashcards available
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    };

    const handlePrevious = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Card {currentIndex + 1} of {flashcards.length}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Flip
                </Button>
            </div>

            <div
                className="relative h-64 cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <Card
                    className={`absolute inset-0 transition-all duration-500 preserve-3d ${isFlipped ? "rotate-y-180" : ""
                        }`}
                    style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                >
                    {/* Front - Question (Blue/Red gradient) */}
                    <div
                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-inner"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        <CardContent className="flex items-center justify-center h-full text-center p-8">
                            <div className="w-full">
                                <div className="text-xs font-bold text-blue-100 mb-4 uppercase tracking-wider">Question</div>
                                <div className="text-xl font-medium leading-relaxed prose prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {currentCard.front}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </CardContent>
                    </div>

                    {/* Back - Answer (Green gradient) */}
                    <div
                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-inner"
                        style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                        }}
                    >
                        <CardContent className="flex items-center justify-center h-full text-center p-8">
                            <div className="w-full">
                                <div className="text-xs font-bold text-green-100 mb-4 uppercase tracking-wider">Answer</div>
                                <div className="text-lg leading-relaxed prose prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {currentCard.back}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    className="cursor-pointer disabled:cursor-not-allowed"
                    onClick={handlePrevious}
                    disabled={flashcards.length === 1}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    className="cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleNext}
                    disabled={flashcards.length === 1}
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
