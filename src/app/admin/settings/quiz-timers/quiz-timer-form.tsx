"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateQuizTimerSettings, resetQuizTimers, type QuizTimerSettings } from "./actions";
import { Clock, RotateCcw, Save } from "lucide-react";

interface QuizTimerFormProps {
    initialSettings: QuizTimerSettings;
}

export function QuizTimerForm({ initialSettings }: QuizTimerFormProps) {
    const router = useRouter();
    const [settings, setSettings] = useState<QuizTimerSettings>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleChange = (key: keyof QuizTimerSettings, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setSettings(prev => ({ ...prev, [key]: numValue }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateQuizTimerSettings(settings);
            toast.success("Quiz timer settings saved successfully!");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset all timers to default values?")) {
            return;
        }

        setResetting(true);
        try {
            await resetQuizTimers();
            toast.success("Quiz timers reset to defaults!");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to reset settings");
        } finally {
            setResetting(false);
        }
    };

    const timerFields = [
        { key: 'MCQ' as keyof QuizTimerSettings, label: 'Multiple Choice (MCQ)', description: 'Time limit for MCQ questions' },
        { key: 'TRUE_FALSE' as keyof QuizTimerSettings, label: 'True/False', description: 'Time limit for true/false questions' },
        { key: 'FILL_IN_BLANK' as keyof QuizTimerSettings, label: 'Fill in the Blank', description: 'Time limit for fill-in-the-blank questions' },
        { key: 'SHORT_ANSWER' as keyof QuizTimerSettings, label: 'Short Answer', description: 'Time limit for short answer questions' },
        { key: 'LONG_ANSWER' as keyof QuizTimerSettings, label: 'Long Answer (Essay)', description: 'Time limit for essay questions' },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Timer Configuration
                    </CardTitle>
                    <CardDescription>
                        Set time limits (in seconds) for each question type.
                        Valid range: 5-300 seconds.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {timerFields.map(field => (
                        <div key={field.key} className="grid gap-3">
                            <Label htmlFor={field.key} className="text-base font-semibold">
                                {field.label}
                            </Label>
                            <p className="text-sm text-muted-foreground -mt-2">
                                {field.description}
                            </p>
                            <div className="flex items-center gap-4">
                                <Input
                                    id={field.key}
                                    type="number"
                                    min={5}
                                    max={300}
                                    value={settings[field.key]}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="max-w-xs"
                                />
                                <span className="text-sm text-muted-foreground">seconds</span>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving || resetting}
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Defaults
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || resetting}
                >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Preview Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Timer Values</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {timerFields.map(field => (
                            <div key={field.key} className="p-3 border rounded-lg">
                                <div className="text-sm font-medium text-muted-foreground mb-1">
                                    {field.label}
                                </div>
                                <div className="text-2xl font-bold">
                                    {settings[field.key]}s
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
