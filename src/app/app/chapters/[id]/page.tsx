import { getChapterById } from "../actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, BookOpen } from "lucide-react";

export default async function ChapterDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const data = await getChapterById(id);

    if (!data) {
        redirect("/app/subjects");
    }

    const { chapter, subjectInfo } = data;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/app/chapters?subjectId=${chapter.subject_id}`}>
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to {subjectInfo.subject.name}
                    </Button>
                </Link>

                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {chapter.chapter_number && (
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">
                                        {chapter.chapter_number}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {chapter.title}
                                </h1>
                                <p className="text-gray-600">
                                    {subjectInfo.subject.name} • {subjectInfo.program.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {chapter.is_global && (
                                <Badge variant="secondary">Global Content</Badge>
                            )}
                            {chapter.accessible_boards.length > 0 && (
                                <Badge variant="outline">
                                    Available to {chapter.accessible_boards.length} board(s)
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div>
                        <Link href={`/app/chat?chapterId=${id}&subjectId=${chapter.subject_id}`}>
                            <Button size="lg" className="w-full sm:w-auto">
                                <MessageSquare className="h-5 w-5 mr-2" />
                                Ask AI About This Chapter
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Chapter Pages */}
            {chapter.pages.length > 0 && (
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Chapter Pages
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {chapter.pages.map((page) => (
                                    <div
                                        key={page.id.toString()}
                                        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <img
                                            src={page.image_url}
                                            alt={`Page ${page.page_number}`}
                                            className="w-full h-auto"
                                            style={{
                                                aspectRatio: page.width && page.height
                                                    ? `${page.width}/${page.height}`
                                                    : "auto"
                                            }}
                                        />
                                        <div className="p-3 bg-gray-50 text-center">
                                            <p className="text-sm font-medium text-gray-700">
                                                Page {page.page_number}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Chapter Content */}
            <Card>
                <CardHeader>
                    <CardTitle>Chapter Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="prose max-w-none">
                        {typeof chapter.content_json === 'object' && chapter.content_json !== null ? (
                            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                                {JSON.stringify(chapter.content_json, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-gray-600">
                                No content available for this chapter.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
