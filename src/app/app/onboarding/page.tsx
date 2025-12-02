"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Board {
    id: string;
    name: string;
    type: string;
}

interface Institution {
    id: string;
    name: string;
    type: string;
}

interface Program {
    id: number;
    name: string;
    code: string | null;
    level: string | null;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data states
    const [boards, setBoards] = useState<Board[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);

    // Selection states
    const [selectedBoard, setSelectedBoard] = useState<string>("");
    const [selectedInstitution, setSelectedInstitution] = useState<string>("");
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [isSelfPaced, setIsSelfPaced] = useState(false);

    // Load boards on mount
    useEffect(() => {
        async function loadBoards() {
            try {
                const res = await fetch("/api/dashboard/boards");
                if (res.ok) {
                    const data = await res.json();
                    setBoards(data.boards || []);
                }
            } catch (error) {
                console.error("Failed to load boards:", error);
                toast.error("Failed to load boards");
            }
        }
        loadBoards();
    }, []);

    // Load institutions when board is selected
    useEffect(() => {
        if (!selectedBoard) return;

        async function loadInstitutions() {
            try {
                const res = await fetch(`/api/dashboard/institutions?board_id=${selectedBoard}`);
                if (res.ok) {
                    const data = await res.json();
                    setInstitutions(data.institutions || []);
                }
            } catch (error) {
                console.error("Failed to load institutions:", error);
                toast.error("Failed to load institutions");
            }
        }
        loadInstitutions();
    }, [selectedBoard]);

    // Load programs when institution is selected or self-paced is chosen
    useEffect(() => {
        if (!selectedBoard) return;
        if (!isSelfPaced && !selectedInstitution) return;

        async function loadPrograms() {
            try {
                const params = new URLSearchParams({ board_id: selectedBoard });
                if (!isSelfPaced && selectedInstitution) {
                    params.append("institution_id", selectedInstitution);
                }

                const res = await fetch(`/api/dashboard/programs?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setPrograms(data.programs || []);
                }
            } catch (error) {
                console.error("Failed to load programs:", error);
                toast.error("Failed to load programs");
            }
        }
        loadPrograms();
    }, [selectedBoard, selectedInstitution, isSelfPaced]);

    const handleNext = () => {
        if (step === 1 && !selectedBoard) {
            toast.error("Please select a board");
            return;
        }
        if (step === 2 && !isSelfPaced && !selectedInstitution) {
            toast.error("Please select an institution or choose self-paced learning");
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!selectedProgram) {
            toast.error("Please select a program");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/dashboard/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    program_id: selectedProgram,
                    institution_id: isSelfPaced ? null : selectedInstitution,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update profile");
            }

            toast.success("Profile updated successfully!");
            router.push("/app/dashboard");
            router.refresh();
        } catch (error) {
            console.error("Failed to save profile:", error);
            toast.error("Failed to save your selection. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Welcome to Zirna</CardTitle>
                            <CardDescription>Let's set up your learning profile</CardDescription>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded-full ${s <= step ? "bg-primary" : "bg-gray-200"
                                    }`}
                            />
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Step 1: Select Board */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Select Your Board</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Choose the education board or examination body you're studying under
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="board">Board</Label>
                                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                                    <SelectTrigger id="board">
                                        <SelectValue placeholder="Select a board" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {boards.map((board) => (
                                            <SelectItem key={board.id} value={board.id}>
                                                {board.name} ({board.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Institution */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Select Your Institution</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Are you enrolled in a school, college, or studying independently?
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="selfPaced"
                                    checked={isSelfPaced}
                                    onChange={(e) => {
                                        setIsSelfPaced(e.target.checked);
                                        if (e.target.checked) {
                                            setSelectedInstitution("");
                                        }
                                    }}
                                    className="rounded"
                                />
                                <Label htmlFor="selfPaced" className="cursor-pointer">
                                    I'm a self-paced learner (not enrolled in an institution)
                                </Label>
                            </div>

                            {!isSelfPaced && (
                                <div className="space-y-2">
                                    <Label htmlFor="institution">Institution</Label>
                                    <Select
                                        value={selectedInstitution}
                                        onValueChange={setSelectedInstitution}
                                        disabled={isSelfPaced}
                                    >
                                        <SelectTrigger id="institution">
                                            <SelectValue placeholder="Select your institution" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {institutions.map((inst) => (
                                                <SelectItem key={inst.id} value={inst.id}>
                                                    {inst.name} ({inst.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Select Program */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Select Your Program</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Choose your class, course, or examination program
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="program">Program</Label>
                                <Select
                                    value={selectedProgram?.toString() || ""}
                                    onValueChange={(val) => setSelectedProgram(parseInt(val))}
                                >
                                    <SelectTrigger id="program">
                                        <SelectValue placeholder="Select your program" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {programs.map((program) => (
                                            <SelectItem key={program.id} value={program.id.toString()}>
                                                {program.name}
                                                {program.level && ` (${program.level})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {programs.length === 0 && (
                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                    No programs available for this selection. Please contact your administrator.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-4">
                        {step > 1 && (
                            <Button variant="outline" onClick={handleBack} disabled={loading}>
                                Back
                            </Button>
                        )}
                        {step < 3 ? (
                            <Button onClick={handleNext} className="ml-auto">
                                Next
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !selectedProgram}
                                className="ml-auto"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Complete Setup
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
