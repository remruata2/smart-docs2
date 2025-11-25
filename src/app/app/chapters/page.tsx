import { getChaptersForSubject } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageSquare, Eye, ArrowLeft, FileText, Brain } from "lucide-react";

export default async function ChaptersPage({
    searchParams,
}: {
    searchParams: Promise<{ subjectId?: string }>;
}) {
    const params = await searchParams;
    const subjectId = params.subjectId;

    if (!subjectId || isNaN(parseInt(subjectId))) {
        redirect("/app/subjects");
    }

    const data = await getChaptersForSubject(parseInt(subjectId));

    if (!data) {
        redirect("/app/subjects");
    }

    const { chapters, subjectInfo } = data;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/app/subjects">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Subjects
                    </Button>
                </Link>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {subjectInfo.subject.name}
                        </h1>
                        <p className="text-gray-600">
                            {subjectInfo.program.name} • {subjectInfo.board.name}
                        </p>
                        {subjectInfo.subject.code && (
                            <Badge variant="outline" className="mt-2">
                                {subjectInfo.subject.code}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Chapter List */}
            {chapters.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Chapters Available
                        </h3>
                        <p className="text-gray-600">
                            No chapters have been added to this subject yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {chapters.map((chapter) => (
                        <Card
                            key={chapter.id.toString()}
                            className="hover:shadow-lg transition-all duration-200"
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    {/* Chapter Number Badge */}
                                    {chapter.chapter_number && (
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <span className="text-lg font-bold text-primary">
                                                    {chapter.chapter_number}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chapter Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {chapter.title}
                                        </h3>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                <span>{chapter._count.chunks} sections</span>
                                            </div>
                                            {chapter._count.pages > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <BookOpen className="h-4 w-4" />
                                                    <span>{chapter._count.pages} pages</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Global/Board badges */}
                                        <div className="flex items-center gap-2 mb-4">
                                            {chapter.is_global ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    Global Content
                                                </Badge>
                                            ) : chapter.accessible_boards.length > 0 ? (
                                                <Badge variant="outline" className="text-xs">
                                                    {chapter.accessible_boards.length} board(s)
                                                </Badge>
                                            ) : null}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Link
                                                href={`/app/chat?chapterId=${chapter.id}&subjectId=${subjectId}`}
                                            >
                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                    variant="default"
                                                >
                                                    <MessageSquare className="h-4 w-4 mr-1" />
                                                    Ask AI
                                                </Button>
                                            </Link>
                                            <Link
                                                href={`/app/study/${chapter.id}`}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
                                                >
                                                    <Brain className="h-4 w-4 mr-1" />
                                                    Study
                                                </Button>
                                            </Link>
                                            <Link
                                                href={`/app/chapters/${chapter.id}`}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
