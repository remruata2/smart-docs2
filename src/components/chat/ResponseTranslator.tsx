"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Languages } from "lucide-react";
import { translateContent } from "@/app/app/chat/actions";
import { toast } from "sonner";

interface ResponseTranslatorProps {
    originalText: string;
    translatedText?: string;
    onTranslationComplete: (translatedText: string) => void;
    onRevert: () => void;
}

export function ResponseTranslator({
    originalText,
    translatedText,
    onTranslationComplete,
    onRevert,
}: ResponseTranslatorProps) {
    const [language, setLanguage] = useState<string>("");
    const [isTranslating, setIsTranslating] = useState(false);

    const handleTranslate = async () => {
        if (!language) return;

        setIsTranslating(true);
        try {
            const result = await translateContent(originalText, language);

            if (typeof result === 'object' && result.success && result.translatedText) {
                onTranslationComplete(result.translatedText);
                toast.success(`Translated to ${language}`);
            } else {
                toast.error("Translation failed. Please try again.");
            }
        } catch (error) {
            console.error("Translation error:", error);
            toast.error("An error occurred during translation.");
        } finally {
            setIsTranslating(false);
        }
    };

    const isTranslated = !!translatedText;

    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Languages className="w-3 h-3" />
                <span>{isTranslated ? "Translated" : "Translate to:"}</span>
            </div>

            {!isTranslated ? (
                <>
                    <Select
                        value={language}
                        onValueChange={(val) => {
                            setLanguage(val);
                            // Optional: Auto-translate on select? For now, let's keep it manual with a button
                        }}
                    >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Mizo">Mizo</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleTranslate}
                        disabled={!language || isTranslating}
                    >
                        {isTranslating ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                            "Translate"
                        )}
                    </Button>
                </>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onRevert}
                >
                    Show Original
                </Button>
            )}
        </div>
    );
}
