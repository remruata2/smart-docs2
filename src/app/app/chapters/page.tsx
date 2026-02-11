import { getChaptersForSubject, getTextbookContent } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageSquare, ArrowLeft, FileText, Brain, GraduationCap, Sparkles, Lock } from "lucide-react";
import { getTrialAccess } from "@/lib/trial-access";
import { TrialBadge, LockedChapterBadge } from "@/components/trial";
import { cn } from "@/lib/utils";

export default async function ChaptersPage({
    searchParams,
}: {
    searchParams: Promise<{ subjectId?: string; textbookId?: string }>;
}) {
    const params = await searchParams;
    const subjectId = params.subjectId;
    const textbookId = params.textbookId;

    if (!subjectId && !textbookId) {
        redirect("/app/subjects");
    }

    let textbookData = null;
    let subjectData = null;

    if (textbookId) {
        textbookData = await getTextbookContent(parseInt(textbookId));
    } else if (subjectId) {
        subjectData = await getChaptersForSubject(parseInt(subjectId));
    }

    if (!textbookData && !subjectData) {
        redirect("/app/subjects");
    }

    const title = textbookData?.textbook.title || subjectData?.subjectInfo?.subject?.name || "Chapters";
    const subtitle = textbookData
        ? `${textbookData.textbook.stream || "General"} • ${textbookData.textbook.class_level}`
        : `${subjectData?.subjectInfo?.program?.name || ""} • ${subjectData?.subjectInfo?.board?.name || ""}`;

    const enrollment = textbookData?.enrollment || subjectData?.enrollment;
    const course = enrollment?.course;
    const trialAccess = getTrialAccess(enrollment || null, course || null);

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/app/subjects">
                        <Button variant="ghost" size="sm" className="hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to My Learning
                        </Button>
                    </Link>

                    {/* Trial Status Badge */}
                    <TrialBadge daysRemaining={trialAccess.trialDaysRemaining} />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                            {textbookId ? (
                                <GraduationCap className="h-8 w-8 text-white" />
                            ) : (
                                <FileText className="h-8 w-8 text-white" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                                {title}
                            </h1>
                            <p className="text-gray-500 font-medium mt-1">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Logic */}
            {textbookData ? (
                // --- NEW TEXTBOOK HIERARCHY (Units > Chapters) ---
                <div className="space-y-12">
                    {textbookData.textbook.units.map((unit: any) => (
                        <div key={unit.id} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-gray-100" />
                                <Badge variant="outline" className="px-4 py-1.5 bg-gray-50 border-gray-200 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                    Unit {unit.order}: {unit.title}
                                </Badge>
                                <div className="h-px flex-1 bg-gray-100" />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {unit.chapters.map((chapter: any) => (
                                    <ChapterRow
                                        key={chapter.id}
                                        chapter={{
                                            ...chapter,
                                            subject: textbookData.textbook.subject,
                                            quizzes_enabled: true // Fallback for textbooks
                                        }}
                                        isNewTextbook={true}
                                        textbookId={textbookId}
                                        trialAccess={trialAccess}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // --- LEGACY SUBJECT CHAPTERS ---
                <div className="grid grid-cols-1 gap-4">
                    {subjectData?.chapters.map((chapter: any) => (
                        <ChapterRow
                            key={chapter.id}
                            chapter={chapter}
                            isNewTextbook={false}
                            subjectId={subjectId}
                            trialAccess={trialAccess}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChapterRow({ chapter, isNewTextbook, textbookId, subjectId, trialAccess }: any) {
    const viewUrl = `/app/study/${chapter.id}`;
    const chapterNum = chapter.order || chapter.chapter_number || 1;
    const isLocked = trialAccess.isTrialActive && chapterNum > 1;

    return (
        <Card className={cn(
            "group hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden bg-white",
            isLocked && "opacity-80"
        )}>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center">
                    {/* Chapter Number/Indicator */}
                    <div className="w-full md:w-20 bg-gray-50 flex items-center justify-center p-4 md:py-8 border-b md:border-b-0 md:border-r border-gray-100 group-hover:bg-indigo-50 transition-colors">
                        <span className="text-2xl font-black text-gray-300 group-hover:text-indigo-200 transition-colors">
                            {chapterNum}
                        </span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {chapter.title}
                                    </h3>
                                    {isLocked && <LockedChapterBadge />}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>Full AI Textbook</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Brain className="h-3.5 w-3.5" />
                                        <span>Active Learning</span>
                                    </div>
                                </div>
                                {(() => {
                                    const manualPoints = chapter.key_points ? chapter.key_points.split('\n').filter((p: string) => p.trim()) : [];

                                    if (manualPoints.length > 0) {
                                        return (
                                            <div className="mt-2 text-xs text-gray-500 font-medium line-clamp-1">
                                                {manualPoints.slice(0, 4).join(" • ")}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Link href={isLocked ? "#" : viewUrl} className="flex-1 md:flex-initial">
                                    <Button
                                        disabled={isLocked}
                                        className={cn(
                                            "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-100",
                                            isLocked && "opacity-50 cursor-not-allowed bg-gray-400"
                                        )}
                                    >
                                        {isLocked && <Lock className="h-4 w-4 mr-2" />}
                                        {!isLocked && <Sparkles className="h-4 w-4 mr-2" />}
                                        Study Hub
                                    </Button>
                                </Link>
                                {chapter.subject?.quizzes_enabled === false || chapter.quizzes_enabled === false ? null : (
                                    <Link href={isLocked ? "#" : `/app/practice?subjectId=${subjectId || chapter.subject_id}&chapterId=${chapter.id}`} className="flex-1 md:flex-initial">
                                        <Button
                                            variant="outline"
                                            disabled={isLocked}
                                            className={cn(
                                                "w-full border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 font-bold px-6",
                                                isLocked && "opacity-50 cursor-not-allowed border-gray-200 text-gray-400"
                                            )}
                                        >
                                            <Brain className="h-4 w-4 mr-2" />
                                            Practice
                                        </Button>
                                    </Link>
                                )}
                                <Link href={isLocked ? "#" : `/app/chat?chapterId=${chapter.id}${textbookId ? `&textbookId=${textbookId}` : `&subjectId=${subjectId}`}`} className="flex-1 md:flex-initial">
                                    <Button
                                        variant="outline"
                                        disabled={isLocked}
                                        className={cn(
                                            "w-full border-gray-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 font-bold px-4",
                                            isLocked && "opacity-50 cursor-not-allowed text-gray-400"
                                        )}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Ask AI
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
