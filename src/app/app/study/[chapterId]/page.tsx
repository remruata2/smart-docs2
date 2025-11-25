import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getStudyMaterialsAction, generateStudyMaterialsAction } from "../actions";
import { StudyMaterialsClient } from "@/components/study/StudyMaterialsClient";
import { GenerateStudyMaterialsButton } from "@/components/study/GenerateStudyMaterialsButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function StudyMaterialsPage({ params }: { params: Promise<{ chapterId: string }> }) {
    const { chapterId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Get chapter info
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        select: { title: true, subject: { select: { id: true, name: true } } },
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

            {/* Materials or Generate */}
            {materials ? (
                <StudyMaterialsClient materials={materials} />
            ) : (
                <div className="text-center py-20">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold mb-2">Study Materials Not Generated Yet</h2>
                    <p className="text-muted-foreground mb-6">
                        Generate comprehensive study materials including summaries, flashcards, videos, and mind maps.
                    </p>
                    <GenerateStudyMaterialsButton chapterId={chapterId} />
                </div>
            )}
        </div>
    );
}
