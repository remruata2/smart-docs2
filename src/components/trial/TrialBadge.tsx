"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialBadgeProps {
    daysRemaining: number | null;
    className?: string;
}

/**
 * Badge showing trial days remaining
 */
export function TrialBadge({ daysRemaining, className }: TrialBadgeProps) {
    if (daysRemaining === null) return null;

    const isExpiring = daysRemaining <= 1;
    const isExpired = daysRemaining <= 0;

    if (isExpired) {
        return (
            <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                "bg-red-100 text-red-700 border border-red-200",
                className
            )}>
                <Clock className="w-3.5 h-3.5" />
                <span>Trial expired</span>
            </div>
        );
    }

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            isExpiring
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-indigo-100 text-indigo-700 border border-indigo-200",
            className
        )}>
            <Clock className="w-3.5 h-3.5" />
            <span>
                {daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`} in trial
            </span>
        </div>
    );
}
