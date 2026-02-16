"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Swords, Users, Zap, Loader2, LogIn, Search } from "lucide-react";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";
import { getChaptersForBattle } from "@/app/app/chapters/actions";
import { generateQuizAction } from "@/app/app/practice/actions";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useSession } from "next-auth/react";

interface BattleLobbyProps {
    initialSubjects?: any[];
    courseId?: string;
}

export function BattleLobby({ initialSubjects = [], courseId }: BattleLobbyProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { joinCourseRoom, leaveCourseRoom, sendChallenge, supabase } = useSupabase();

    const [loading, setLoading] = useState(false);

    // Selection state for Create Battle card
    const [courses, setCourses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("");
    const [isPublic, setIsPublic] = useState(true);

    // Pending battle state (host stays on home until someone accepts)
    const [pendingBattle, setPendingBattle] = useState<{ id: string; code: string; acceptedCount: number } | null>(null);

    // Join course room
    useEffect(() => {
        if (courseId) {
            joinCourseRoom(courseId);
        }
        return () => leaveCourseRoom();
    }, [courseId, joinCourseRoom, leaveCourseRoom]);

    // Listen for accept/decline events on pending battle
    useEffect(() => {
        if (!pendingBattle || !supabase) return;

        const channel = supabase.channel(`battle:${pendingBattle.id}`)
            .on('broadcast', { event: 'CHALLENGE_ACCEPTED' }, (payload: any) => {
                const acceptedBy = payload.payload?.acceptedBy || 'Someone';
                toast.success(`${acceptedBy} accepted your challenge!`);
                setPendingBattle(prev => prev ? { ...prev, acceptedCount: prev.acceptedCount + 1 } : null);
            })
            .on('broadcast', { event: 'CHALLENGE_DECLINED' }, (payload: any) => {
                const declinedBy = payload.payload?.declinedBy || 'Someone';
                toast.error(`${declinedBy} declined your challenge`);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pendingBattle, supabase]);

    // Cache for chapters to avoid redundant fetches
    const chaptersCache = useRef<Record<string, any[]>>({});

    // Fetch subjects (optimized: no mastery calculation)
    useEffect(() => {
        getSubjectsForUserProgram(undefined, false).then(data => {
            if (data && data.enrollments) {
                // Extract courses from enrollments
                const fetchedCourses = data.enrollments.map(e => e.course);
                setCourses(fetchedCourses);

                // Initialize with first course if available
                if (fetchedCourses.length > 0) {
                    setSelectedCourse(fetchedCourses[0].id.toString());
                }
            }
        }).catch(console.error);
    }, []);

    // Filter Subjects when Course changes
    useEffect(() => {
        if (selectedCourse) {
            const course = courses.find(c => c.id.toString() === selectedCourse);
            // Assuming course.subjects is already populated with nested subjects
            const courseSubjects = course ? course.subjects : [];
            setSubjects(courseSubjects);

            // Auto Select First Subject
            if (courseSubjects.length > 0) {
                setSelectedSubject(courseSubjects[0].id.toString());
            } else {
                setSelectedSubject("");
            }
        } else {
            setSubjects([]);
            setSelectedSubject("");
        }
    }, [selectedCourse, courses]);

    // Fetch chapters when subject changes
    useEffect(() => {
        if (selectedSubject) {
            // Check cache first
            if (chaptersCache.current[selectedSubject]) {
                const cachedChapters = chaptersCache.current[selectedSubject];
                setChapters(cachedChapters);
                setSelectedChapter(cachedChapters[0]?.id.toString() || "");
                return;
            }

            // Fetch if not in cache
            getChaptersForBattle(parseInt(selectedSubject)).then(chapters => {
                if (chapters && chapters.length > 0) {
                    chaptersCache.current[selectedSubject] = chapters;
                    setChapters(chapters);
                    setSelectedChapter(chapters[0].id.toString());
                } else {
                    chaptersCache.current[selectedSubject] = [];
                    setChapters([]);
                    setSelectedChapter("");
                }
            }).catch(console.error);
        } else {
            setChapters([]);
            setSelectedChapter("");
        }
    }, [selectedSubject]);

    // Handle creating battle without a specific target user
    const handleCreateBattle = async () => {
        if (!selectedSubject || !selectedChapter) {
            toast.error("Please select a subject and chapter first!");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Creating battle...");

        try {
            const subjectName = subjects.find(s => s.id.toString() === selectedSubject)?.name || "";
            const chapterName = chapters.find(c => c.id.toString() === selectedChapter)?.title || "";

            const quiz = await generateQuizAction(
                parseInt(selectedSubject),
                parseInt(selectedChapter),
                "medium",
                5,
                ["MCQ"],
                false
            );

            const res = await fetch("/api/battle/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quizId: quiz.id,
                    subjectId: parseInt(selectedSubject),
                    chapterId: parseInt(selectedChapter),
                    subjectName,
                    chapterName,
                    isPublic
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Battle created! Share the code with a friend.", { id: toastId });
            router.push(`/app/practice/battle/${data.battle.id}`);
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes("Not enough questions")) {
                toast.error("Not enough questions available for this chapter.", { id: toastId });
            } else {
                toast.error(error.message || "Failed to create battle", { id: toastId });
            }
        } finally {
            setLoading(false);
        }
    };


    // Handle joining battle with code
    const handleJoin = async (code: string) => {
        if (!code || code.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/battle/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
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
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            <div className="container max-w-4xl mx-auto py-1 md:py-6 px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-2 space-y-2 animate-in slide-in-from-top-4 fade-in duration-700">
                    <div className="inline-flex items-center justify-center p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        <Swords className="h-6 w-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        BATTLE ARENA
                    </h1>
                    <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Challenge your classmates to a realtime quiz battle!
                    </p>
                </div>

                {/* Pending Battle Banner */}
                {pendingBattle && (
                    <div className="mb-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 rounded-2xl p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-center sm:text-left">
                                <p className="font-semibold text-white flex items-center gap-2 justify-center sm:justify-start text-sm">
                                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                                    Battle Pending
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Code: <span className="font-mono text-indigo-400">{pendingBattle.code}</span>
                                    {pendingBattle.acceptedCount > 0 && (
                                        <span className="ml-2 text-emerald-400">
                                            • {pendingBattle.acceptedCount} player{pendingBattle.acceptedCount > 1 ? 's' : ''} joined
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {pendingBattle.acceptedCount > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => router.push(`/app/practice/battle/${pendingBattle.id}`)}
                                        className="h-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs"
                                    >
                                        <LogIn className="h-3 w-3 mr-2" />
                                        Enter Lobby
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPendingBattle(null)}
                                    className="h-8 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center mb-4">
                    <Tabs defaultValue="create" className="w-full max-w-4xl">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-900/50 p-1 rounded-xl border border-slate-800 mb-6">
                            <TabsTrigger
                                value="create"
                                className="rounded-lg text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Create Battle
                            </TabsTrigger>
                            <TabsTrigger
                                value="join"
                                className="rounded-lg text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all"
                            >
                                <Swords className="w-4 h-4 mr-2" />
                                Find Battle
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="create" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CreateBattleCard
                                courses={courses}
                                selectedCourse={selectedCourse}
                                setSelectedCourse={setSelectedCourse}
                                subjects={subjects}
                                chapters={chapters}
                                selectedSubject={selectedSubject}
                                setSelectedSubject={setSelectedSubject}
                                selectedChapter={selectedChapter}
                                setSelectedChapter={setSelectedChapter}
                                isPublic={isPublic}
                                setIsPublic={setIsPublic}
                                loading={loading}
                                handleCreate={handleCreateBattle}
                            />
                        </TabsContent>

                        <TabsContent value="join" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <JoinBattleHub
                                loading={loading}
                                handleJoin={handleJoin}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// Sub-components
function CreateBattleCard({
    courses,
    selectedCourse,
    setSelectedCourse,
    subjects,
    chapters,
    selectedSubject,
    setSelectedSubject,
    selectedChapter,
    setSelectedChapter,
    isPublic,
    setIsPublic,
    loading,
    handleCreate
}: any) {
    return (
        <div className="group relative w-full max-w-2xl mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <Card className="relative h-full bg-slate-900/90 border-slate-800 hover:border-yellow-500/30 transition-all duration-300 backdrop-blur-xl rounded-2xl shadow-2xl">
                <CardHeader className="pb-2 border-b border-slate-800/50 py-2">
                    <CardTitle className="flex items-center gap-3 text-xl text-white">
                        <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-orange-500/20">
                            <Zap className="h-5 w-5 text-orange-400" />
                        </div>
                        Create New Battle
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm">
                        Configure your match settings and challenge others
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Course</label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100 h-10 text-base rounded-lg focus:ring-orange-500/50">
                                <SelectValue placeholder="Select Course" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                {courses?.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-orange-500 focus:text-white py-2">
                                        {c.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Subject</label>
                        <Select
                            value={selectedSubject}
                            onValueChange={setSelectedSubject}
                            disabled={!selectedCourse || subjects.length === 0}
                        >
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100 h-10 text-base rounded-lg disabled:opacity-50 focus:ring-orange-500/50">
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                {subjects.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-orange-500 focus:text-white py-2">
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Chapter</label>
                        <Select
                            value={selectedChapter}
                            onValueChange={setSelectedChapter}
                            disabled={!selectedSubject || chapters.length === 0}
                        >
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100 h-10 text-base rounded-lg disabled:opacity-50 focus:ring-orange-500/50">
                                <SelectValue placeholder="Select Chapter" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 max-h-[250px]">
                                {chapters.map((c: any) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id.toString()}
                                        disabled={c.isLocked}
                                        className="focus:bg-orange-500 focus:text-white py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {c.isLocked ? <span className="text-slate-500">🔒</span> : null}
                                            <span className={c.isLocked ? "text-slate-500" : ""}>
                                                {c.chapter_number ? `Ch ${c.chapter_number}: ` : ""}{c.title}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between py-3 px-3 bg-slate-800/30 rounded-lg border border-slate-800/50">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium text-slate-200">Public Battle</label>
                            <p className="text-xs text-slate-500">Anyone can see and join this battle</p>
                        </div>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-orange-500 scale-90" />
                    </div>

                    <Button
                        className="w-full h-12 text-base font-bold bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-xl mt-2"
                        onClick={handleCreate}
                        disabled={loading || !selectedSubject || !selectedChapter}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Arena...
                            </>
                        ) : (
                            "Create Battle Arena"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function JoinBattleHub({ loading, handleJoin }: any) {
    const { supabase } = useSupabase();

    const [searchCode, setSearchCode] = useState("");
    const [battles, setBattles] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!supabase) return;

        setFetching(true);
        const channel = supabase.channel('battle_lobby_presence');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const rawBattles: any[] = [];

                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => {
                        if (p.battle_id) {
                            rawBattles.push({
                                id: p.battle_id,
                                code: p.code,
                                created_at: p.created_at,
                                _count: { participants: p.participants_count || 1 },
                                creator: { username: p.host_username },
                                quiz: {
                                    chapter: {
                                        title: p.chapter_title,
                                        subject: { name: p.subject_name }
                                    }
                                }
                            });
                        }
                    });
                });

                // Sort by newest
                rawBattles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setBattles(rawBattles);
                setFetching(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    // Filter battles based on search
    const filteredBattles = battles.filter(b =>
        b.quiz?.chapter?.subject?.name.toLowerCase().includes(searchCode.toLowerCase()) ||
        b.quiz?.chapter?.title.toLowerCase().includes(searchCode.toLowerCase()) ||
        b.code.includes(searchCode)
    );

    const isPrivateCode = searchCode.length === 6 && !filteredBattles.find(b => b.code === searchCode);

    return (
        <div className="group relative w-full h-[480px]">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500" />
            <Card className="relative h-full bg-slate-900/90 border-slate-800 hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-800/50 bg-slate-900/50 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-3 text-xl text-white">
                                <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-purple-500/20">
                                    <Swords className="h-5 w-5 text-purple-400" />
                                </div>
                                Find Battle
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-0.5 text-sm">
                                Join public arenas or enter a private code
                            </CardDescription>
                        </div>

                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <Input
                                placeholder="Search subject or enter code..."
                                className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 h-9 rounded-lg focus:ring-purple-500/50 text-sm"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="p-4 space-y-2">
                        {/* Private Join Option */}
                        {isPrivateCode && (
                            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex justify-between items-center mb-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Users className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">Private Battle Found?</p>
                                        <p className="text-xs text-blue-200">Code <span className="font-mono font-bold">{searchCode}</span> is not in public list.</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleJoin(searchCode)}
                                    disabled={loading}
                                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 text-xs"
                                >
                                    Attempt Join
                                </Button>
                            </div>
                        )}

                        {fetching && battles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                                <p className="text-sm">Searching for battles...</p>
                            </div>
                        ) : filteredBattles.length === 0 && !isPrivateCode ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <Swords className="h-12 w-12 text-slate-800 mb-3" />
                                <p className="text-base font-medium">No battles found</p>
                                <p className="text-xs">Try creating one or enter a code!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {filteredBattles.map((battle) => (
                                    <div key={battle.id} className="group/item relative bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/80 rounded-xl p-3 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {battle.quiz?.chapter?.subject?.name?.[0] || "Q"}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-sm line-clamp-1">{battle.quiz?.chapter?.subject?.name}</h3>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                        <span>{battle.creator?.username}</span>
                                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                                                        <span>{new Date(battle.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-1.5 py-0.5 bg-slate-900/50 rounded-md text-[10px] font-mono text-slate-400 border border-slate-700/50">
                                                {battle.code}
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <p className="text-xs text-slate-300 line-clamp-1" title={battle.quiz?.chapter?.title}>
                                                {battle.quiz?.chapter?.title}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-900/30 px-1.5 py-0.5 rounded-md">
                                                <Users className="w-3 h-3 text-indigo-400" />
                                                {battle._count.participants} Waiting
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleJoin(battle.code)}
                                                disabled={loading}
                                                className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 group-hover/item:scale-105 transition-transform"
                                            >
                                                Join
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
