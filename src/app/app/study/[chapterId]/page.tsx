import { redirect } from "next/navigation";
import { getStudyMaterialsAction } from "../actions";
import { StudyMaterialsClient } from "@/components/study/StudyMaterialsClient";
import { GenerateStudyMaterialsButton } from "@/components/study/GenerateStudyMaterialsButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering since getStudyMaterialsAction requires session/headers
export const dynamic = 'force-dynamic';

export default async function StudyMaterialsPage({
    params
}: {
    params: Promise<{ chapterId: string }>
}) {
    const { chapterId } = await params;

    // Get chapter info
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        include: {
            subject: { select: { id: true, name: true } }
        },
    });

    if (!chapter) {
        redirect("/app/subjects");
    }

    // Check if materials exist
    const materials = await getStudyMaterialsAction(chapterId);

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/app/chapters?subjectId=${chapter.subject.id}`}>
                    <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:text-primary hover:bg-transparent group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Chapters
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold mb-2">{chapter.title}</h1>
                <p className="text-muted-foreground text-lg">{chapter.subject.name}</p>
            </div>

            <StudyMaterialsClient
                materials={materials}
                chapterId={chapterId}
            />
        </div>
    );
}
