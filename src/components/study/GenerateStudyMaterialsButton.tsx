"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { generateStudyMaterialsAction } from "@/app/app/study/actions";

export function GenerateStudyMaterialsButton({
    chapterId,
    variant = "default",
    size = "lg",
    label,
    className
}: {
    chapterId: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    label?: string;
    className?: string;
}) {
    return (
        <form action={async () => {
            await generateStudyMaterialsAction(chapterId);
        }}>
            <SubmitButton variant={variant} size={size} label={label} className={className} />
        </form>
    );
}

function SubmitButton({
    variant,
    size,
    label,
    className
}: {
    variant: any;
    size: any;
    label?: string;
    className?: string;
}) {
    const { pending } = useFormStatus();

    return (
        <Button size={size} variant={variant} disabled={pending} className={`${size === "lg" ? "min-w-[200px]" : ""} ${className || ""}`}>
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {label || "Generate Study Materials"}
                </>
            )}
        </Button>
    );
}
