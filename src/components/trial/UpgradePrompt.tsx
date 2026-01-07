"use client";

import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
    courseId: number;
    featureName?: string;
    variant?: "inline" | "overlay" | "banner";
    className?: string;
}

/**
 * Prompts user to upgrade from trial to paid access
 */
export function UpgradePrompt({
    courseId,
    featureName = "this feature",
    variant = "inline",
    className
}: UpgradePromptProps) {
    if (variant === "overlay") {
        return (
            <div className={cn(
                "absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10",
                className
            )}>
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                    Upgrade to Access
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4 max-w-xs">
                    Upgrade to unlock {featureName} for all chapters.
                </p>
                <Link href={`/courses/${courseId}/upgrade`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade Now
                    </Button>
                </Link>
            </div>
        );
    }

    if (variant === "banner") {
        return (
            <div className={cn(
                "bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl flex items-center justify-between gap-4",
                className
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium">Unlock Full Access</p>
                        <p className="text-sm text-indigo-100">Get {featureName} for all chapters</p>
                    </div>
                </div>
                <Link href={`/courses/${courseId}/upgrade`}>
                    <Button variant="secondary" size="sm" className="bg-white text-indigo-600 hover:bg-indigo-50">
                        Upgrade
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </div>
        );
    }

    // Inline variant (default)
    return (
        <div className={cn(
            "flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl",
            className
        )}>
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-800">
                    {featureName} is available for the first chapter during trial.
                    <Link
                        href={`/courses/${courseId}/upgrade`}
                        className="ml-1 font-medium text-amber-900 underline hover:no-underline"
                    >
                        Upgrade to unlock all chapters
                    </Link>
                </p>
            </div>
        </div>
    );
}

/**
 * Locked chapter indicator for trial users
 */
export function LockedChapterBadge({ className }: { className?: string }) {
    return (
        <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500",
            className
        )}>
            <Lock className="w-3 h-3" />
            <span>Upgrade to unlock</span>
        </div>
    );
}
