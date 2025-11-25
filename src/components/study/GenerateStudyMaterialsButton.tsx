"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { generateStudyMaterialsAction } from "@/app/app/study/actions";

export function GenerateStudyMaterialsButton({ chapterId }: { chapterId: string }) {
    return (
        <form action={async () => {
            await generateStudyMaterialsAction(chapterId);
        }}>
            <SubmitButton />
        </form>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button size="lg" disabled={pending} className="min-w-[200px]">
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Study Materials
                </>
            )}
        </Button>
    );
}
