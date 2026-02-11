import { redirect } from "next/navigation";
import { getStudyMaterialsAction } from "../actions";
import { StudyMaterialsClient } from "@/components/study/StudyMaterialsClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getTrialAccess } from "@/lib/trial-access";
import { TrialBadge } from "@/components/trial";

// Force dynamic rendering since getStudyMaterialsAction requires session/headers
export const dynamic = 'force-dynamic';

export default async function StudyMaterialsPage({
    params
}: {
    params: Promise<{ chapterId: string }>
}) {
    const { chapterId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/auth/register");
    }

    // Get chapter info with board details
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        include: {
            subject: {
                select: {
                    id: true,
                    name: true,
                    program: {
                        select: {
                            board_id: true
                        }
                    }
                }
            }
        },
    });

    // ... (rest of the file) ...

    // Explicitly select pdf_url (it's on the Chapter model)
    const chapterWithPdf = chapter ? { ...chapter, pdf_url: chapter.pdf_url } : null;

    if (!chapter) {
        redirect("/app/subjects");
    }

    // Check chapter access for trial restrictions
    const { checkChapterAccess } = await import("@/lib/trial-access");
    const accessCheck = await checkChapterAccess(parseInt(session.user.id), chapter.id, prisma);

    if (!accessCheck.allowed) {
        // Redirect to upgrade page or show locked message
        return (
            <div className="container mx-auto py-8 px-4 max-w-6xl">
                <div className="mb-8">
                    <Link href={`/app/chapters?subjectId=${chapter.subject.id}`}>
                        <Button variant="ghost" size="sm" className="pl-0 hover:text-primary hover:bg-transparent group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Chapters
                        </Button>
                    </Link>
                </div>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
                        <Lock className="w-10 h-10 text-amber-600" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Chapter Locked</h1>
                    <p className="text-muted-foreground text-lg mb-2 max-w-md">
                        {accessCheck.reason}
                    </p>
                    {accessCheck.trialDaysRemaining && (
                        <p className="text-sm text-amber-600 mb-6">
                            You have {accessCheck.trialDaysRemaining} {accessCheck.trialDaysRemaining === 1 ? 'day' : 'days'} left in your trial
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Link href="/pricing">
                            <Button className="bg-indigo-600 hover:bg-indigo-700">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Upgrade Now
                            </Button>
                        </Link>
                        <Link href={`/app/chapters?subjectId=${chapter.subject.id}`}>
                            <Button variant="outline">
                                View All Chapters
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Check if materials exist
    const materials = await getStudyMaterialsAction(chapterId);

    // Fetch enrollment for trial status
    const enrollment = await prisma.userEnrollment.findFirst({
        where: {
            user_id: parseInt(session.user.id),
            course: {
                subjects: { some: { id: chapter.subject.id } }
            }
        },
        include: { course: true }
    });
    const trialAccess = getTrialAccess(enrollment, enrollment?.course || null);

    const isMbse = chapter?.subject.program.board_id === "MBSE";

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <Link href={`/app/chapters?subjectId=${chapter.subject.id}`}>
                        <Button variant="ghost" size="sm" className="pl-0 hover:text-primary hover:bg-transparent group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Chapters
                        </Button>
                    </Link>

                    <TrialBadge daysRemaining={trialAccess.trialDaysRemaining} />
                </div>
                <h1 className="text-4xl font-bold mb-2">{chapter.title}</h1>
                <p className="text-muted-foreground text-lg">{chapter.subject.name}</p>
            </div>

            <StudyMaterialsClient
                materials={materials}
                chapterId={chapterId}
                pdfUrl={chapter.pdf_url || undefined}
                hasApiKey={!!process.env.YOUTUBE_API_KEY}
                hideTextbook={isMbse}
            />
        </div>
    );
}
}

