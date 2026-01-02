import { getChaptersForSubject, getTextbookContent } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageSquare, Eye, ArrowLeft, FileText, Brain, ChevronRight, GraduationCap } from "lucide-react";

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

    const title = textbookData?.textbook.title || subjectData?.subjectInfo.subject.name;
    const subtitle = textbookData
        ? `${textbookData.textbook.stream || "General"} • ${textbookData.textbook.class_level}`
        : `${subjectData?.subjectInfo.program.name} • ${subjectData?.subjectInfo.board.name}`;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-10">
                <Link href="/app/subjects">
                    <Button variant="ghost" size="sm" className="mb-6 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to My Learning
                    </Button>
                </Link>

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
                                        chapter={chapter}
                                        isNewTextbook={true}
                                        textbookId={textbookId}
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChapterRow({ chapter, isNewTextbook, textbookId, subjectId }: any) {
    const viewUrl = isNewTextbook
        ? `/app/chapters/${chapter.id}`
        : `/app/chapters/${chapter.id}`; // Currently same, but logic allows divergence

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden bg-white">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center">
                    {/* Chapter Number/Indicator */}
                    <div className="w-full md:w-20 bg-gray-50 flex items-center justify-center p-4 md:py-8 border-b md:border-b-0 md:border-r border-gray-100 group-hover:bg-indigo-50 transition-colors">
                        <span className="text-2xl font-black text-gray-300 group-hover:text-indigo-200 transition-colors">
                            {chapter.order || chapter.chapter_number}
                        </span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                    {chapter.title}
                                </h3>
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
                            </div>

                            <div className="flex items-center gap-3">
                                <Link href={viewUrl} className="flex-1 md:flex-initial">
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md shadow-indigo-100">
                                        Read Now
                                    </Button>
                                </Link>
                                <Link href={`/app/chat?chapterId=${chapter.id}${textbookId ? `&textbookId=${textbookId}` : `&subjectId=${subjectId}`}`}>
                                    <Button variant="outline" size="icon" className="border-gray-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50">
                                        <MessageSquare className="h-5 w-5" />
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
