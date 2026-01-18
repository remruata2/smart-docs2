import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import ChapterIngestForm from "./chapter-ingest-form";

export default async function NewChapterPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const boards = await prisma.board.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
    });

    const programs = await prisma.program.findMany({
        where: { is_active: true },
        include: {
            board: true,
            institution: true,
        },
        orderBy: { name: "asc" },
    });

    const subjects = await prisma.subject.findMany({
        where: { is_active: true },
        select: {
            id: true,
            name: true,
            exam_id: true,
            program: {
                select: {
                    id: true,
                    name: true,
                    board: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: { name: "asc" },
    });

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8">Ingest New Chapter(s)</h1>
            <div className="max-w-4xl mx-auto">
                <ChapterIngestForm boards={boards} programs={programs} subjects={subjects} />
            </div>
        </div>
    );
}
