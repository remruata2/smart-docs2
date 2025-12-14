import { getChapterById } from "../actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ChapterPagesViewer } from "@/components/study/ChapterPagesViewer";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering since getChapterById requires session/headers
export const dynamic = 'force-dynamic';

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

    // Fetch text chunks for the invisible layer
    const chunks = await prisma.chapterChunk.findMany({
        where: { chapter_id: BigInt(id) },
        select: { page_number: true, bbox: true }
    });

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
                </div>
            </div>

            {/* Chapter Pages */}
            {chapter.pages.length > 0 && (
                <div className="mb-8">
                    <ChapterPagesViewer
                        pages={chapter.pages.map(p => {
                            // Find matching chunk for this page
                            const chunk = chunks.find(c => c.page_number === p.page_number);
                            const textItems = (chunk?.bbox as any) || [];

                            return {
                                ...p,
                                id: p.id.toString(),
                                chapter_id: p.chapter_id.toString(),
                                width: p.width ?? 0,
                                height: p.height ?? 0,
                                text_items: textItems
                            };
                        })}
                    />
                </div>
            )}

            {/* Chapter Content */}

        </div>
    );
}
