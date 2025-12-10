"use client";

import { Clock } from "lucide-react";

export function QuestionTimer({
    timeLimit,
    timeRemaining,
    className = ""
}: {
    timeLimit: number;
    timeRemaining: number;
    className?: string;
}) {
    // Calculate percentage for circular progress
    const percentage = (timeRemaining / timeLimit) * 100;
    // Circumference of r=36 circle is 2 * PI * 36 ≈ 226.19
    const CIRCUMFERENCE = 226;
    const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * percentage) / 100;

    // Color based on time remaining
    const getColor = () => {
        if (percentage > 50) return 'text-green-500';
        if (percentage > 20) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStrokeColor = () => {
        if (percentage > 50) return '#22c55e'; // green
        if (percentage > 20) return '#eab308'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg className="w-20 h-20 transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                />
                {/* Progress circle */}
                <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke={getStrokeColor()}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-500 ${percentage <= 20 ? 'animate-pulse' : ''}`}
                    strokeLinecap="round"
                />
            </svg>
            {/* Timer text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className={`h-4 w-4 mb-1 ${getColor()}`} />
                <span className={`text-lg font-bold ${getColor()}`}>
                    {timeRemaining}s
                </span>
            </div>
        </div>
    );
}
