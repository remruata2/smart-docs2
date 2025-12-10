"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Swords, Users, Zap, Loader2 } from "lucide-react";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForSubject } from "@/app/app/chapters/actions";
import { generateQuizAction } from "@/app/app/practice/actions";

export function BattleLobby() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState("");
    const [loading, setLoading] = useState(false);

    // Selection state
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("");

    useEffect(() => {
        // Fetch subjects on mount
        getSubjectsForUserProgram().then(data => {
            if (data && data.subjects) {
                setSubjects(data.subjects);
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            // Fetch chapters when subject changes
            getChaptersForSubject(parseInt(selectedSubject)).then(data => {
                if (data && data.chapters) {
                    setChapters(data.chapters);
                    setSelectedChapter(""); // Reset chapter
                }
            }).catch(console.error);
        } else {
            setChapters([]);
            setSelectedChapter("");
        }
    }, [selectedSubject]);

    const handleCreate = async () => {
        if (!selectedSubject || !selectedChapter) {
            toast.error("Please select a subject and chapter");
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch quiz from question bank (no AI generation for battles)
            toast.info("Preparing battle...");
            const quiz = await generateQuizAction(
                parseInt(selectedSubject),
                parseInt(selectedChapter),
                "medium", // Default difficulty
                5,        // Default 5 questions for quick battle
                ["MCQ"],  // Default MCQ for battle
                false     // Disable AI fallback - use only stored questions
            );

            // 2. Create the battle with the generated quiz
            const res = await fetch("/api/battle/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId: quiz.id }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Battle created! Waiting for opponent...");
            router.push(`/app/practice/battle/${data.battle.id}`);
        } catch (error: any) {
            console.error(error);
            // Provide user-friendly error messages
            if (error.message?.includes("Not enough questions")) {
                toast.error("Not enough questions available for this chapter. Please select a different chapter or contact admin.");
            } else {
                toast.error(error.message || "Failed to create battle");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (joinCode.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/battle/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Joined battle!");
            router.push(`/app/practice/battle/${data.battle.id}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to join battle");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            <div className="container max-w-5xl mx-auto py-4 md:py-12 px-4 relative z-10">
                <div className="text-center mb-4 md:mb-16 space-y-2 md:space-y-6 animate-in slide-in-from-top-4 fade-in duration-700">
                    <div className="inline-flex items-center justify-center p-2 md:p-4 bg-indigo-500/10 rounded-3xl mb-2 md:mb-4 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                        <Swords className="h-6 w-6 md:h-12 md:w-12 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
                        BATTLE ARENA
                    </h1>
                    <p className="text-sm md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
                        Challenge your friends to a realtime quiz battle. Prove your mastery and climb the leaderboard!
                    </p>
                </div>

                {/* Mobile View: Tabs */}
                <div className="md:hidden">
                    <Tabs defaultValue="create" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 p-1 mb-6 h-14 rounded-2xl border border-slate-800">
                            <TabsTrigger
                                value="create"
                                className="rounded-xl text-base font-bold text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white h-full transition-all"
                            >
                                Create
                            </TabsTrigger>
                            <TabsTrigger
                                value="join"
                                className="rounded-xl text-base font-bold text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white h-full transition-all"
                            >
                                Join
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="create" className="mt-0 focus-visible:ring-0">
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-50 transition duration-500" />
                                <Card className="relative h-full bg-slate-900/80 border-slate-800 hover:border-yellow-500/50 transition-all duration-300 backdrop-blur-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-xl text-white">
                                            <div className="p-2 bg-yellow-500/10 rounded-xl">
                                                <Zap className="h-5 w-5 text-yellow-500" />
                                            </div>
                                            Create Battle
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Start a new match and invite friends
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                                <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-100 h-12">
                                                    <SelectValue placeholder="Select Subject" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                    {subjects.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-slate-800 focus:text-white">
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Chapter</label>
                                            <Select
                                                value={selectedChapter}
                                                onValueChange={setSelectedChapter}
                                                disabled={!selectedSubject || chapters.length === 0}
                                            >
                                                <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-100 h-12 disabled:opacity-50">
                                                    <SelectValue placeholder="Select Chapter" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                    {chapters.map((c) => (
                                                        <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-slate-800 focus:text-white">
                                                            {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}{c.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            onClick={handleCreate}
                                            disabled={loading || !selectedSubject || !selectedChapter}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Battle"
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="join" className="mt-0 focus-visible:ring-0">
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-50 transition duration-500" />
                                <Card className="relative h-full bg-slate-900/80 border-slate-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-xl text-white">
                                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                                <Users className="h-5 w-5 text-blue-500" />
                                            </div>
                                            Join Battle
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Enter a code to join an existing match
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Battle Code</label>
                                            <Input
                                                placeholder="123456"
                                                className="text-center text-3xl tracking-[0.5em] uppercase h-16 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-700 font-mono"
                                                maxLength={6}
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                                            />
                                        </div>
                                        <div className="pt-4">
                                            <Button
                                                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                onClick={handleJoin}
                                                disabled={loading || joinCode.length !== 6}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Joining...
                                                    </>
                                                ) : (
                                                    "Join Battle"
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Desktop View: Grid */}
                <div className="hidden md:grid md:grid-cols-2 gap-8">
                    {/* Create Battle Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-50 transition duration-500" />
                        <Card className="relative h-full bg-slate-900/80 border-slate-800 hover:border-yellow-500/50 transition-all duration-300 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                                    <div className="p-2 bg-yellow-500/10 rounded-xl">
                                        <Zap className="h-6 w-6 text-yellow-500" />
                                    </div>
                                    Create Battle
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-base">
                                    Start a new match and invite friends
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Subject</label>
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                        <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-100 h-12">
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {subjects.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-slate-800 focus:text-white">
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Chapter</label>
                                    <Select
                                        value={selectedChapter}
                                        onValueChange={setSelectedChapter}
                                        disabled={!selectedSubject || chapters.length === 0}
                                    >
                                        <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-100 h-12 disabled:opacity-50">
                                            <SelectValue placeholder="Select Chapter" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {chapters.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-slate-800 focus:text-white">
                                                    {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}{c.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    onClick={handleCreate}
                                    disabled={loading || !selectedSubject || !selectedChapter}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Battle"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Join Battle Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-50 transition duration-500" />
                        <Card className="relative h-full bg-slate-900/80 border-slate-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <Users className="h-6 w-6 text-blue-500" />
                                    </div>
                                    Join Battle
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-base">
                                    Enter a code to join an existing match
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Battle Code</label>
                                    <Input
                                        placeholder="123456"
                                        className="text-center text-3xl tracking-[0.5em] uppercase h-16 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-700 font-mono"
                                        maxLength={6}
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <div className="pt-8">
                                    <Button
                                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={handleJoin}
                                        disabled={loading || joinCode.length !== 6}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Joining...
                                            </>
                                        ) : (
                                            "Join Battle"
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
