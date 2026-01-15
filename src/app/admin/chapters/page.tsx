import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import FilterSelect from "@/components/admin/FilterSelect";
import ChapterListClient from "./chapter-list-client";
import { deleteChapters } from "./actions";

export default async function ChaptersPage({
    searchParams,
}: {
    searchParams: Promise<{
        boardId?: string;
        subjectId?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const params = await searchParams;
    const { boardId, subjectId } = params;

    // Pagination parameters
    const page = parseInt(params.page || '1');
    const pageSize = parseInt(params.pageSize || '50');
    const skip = (page - 1) * pageSize;

    // Build filter
    const where: any = {};
    if (boardId) {
        // Filter by accessible boards (array contains boardId OR is global)
        where.OR = [
            { accessible_boards: { has: boardId } },
            { is_global: true }
        ];
    }
    if (subjectId) {
        where.subject_id = parseInt(subjectId);
    }

    // Optimized query with selective fields and pagination
    const [chapters, totalCount] = await Promise.all([
        prisma.chapter.findMany({
            where,
            select: {
                id: true,
                title: true,
                subject_id: true,
                chapter_number: true,
                is_active: true,
                is_global: true,
                accessible_boards: true,
                processing_status: true,
                error_message: true,
                pdf_url: true,
                created_at: true,
                // Flatten nested relations - only get what we display
                subject: {
                    select: {
                        name: true,
                        program: {
                            select: {
                                name: true,
                                board: {
                                    select: {
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                },
                // Only count if we're actually using it in the UI
                // Removed: _count: { select: { chunks: true } }
            },
            orderBy: { created_at: "desc" },
            skip,
            take: pageSize,
        }),
        prisma.chapter.count({ where })
    ]);

    const boards = await prisma.board.findMany({
        where: { is_active: true },
        select: { id: true, name: true }
    });

    // Only load subjects that have chapters - more efficient
    const subjects = await prisma.subject.findMany({
        where: {
            is_active: true,
            chapters: { some: {} }  // Only subjects with chapters
        },
        select: {
            id: true,
            name: true,
            program: {
                select: {
                    name: true,
                    board: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        },
    });

    // Serialize BigInt for client component
    const serializedChapters = chapters.map(ch => ({
        ...ch,
        id: ch.id.toString(),
        subject_id: ch.subject_id,
    }));

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Chapters Management</h1>
                <Link href="/admin/chapters/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Ingest New Chapter
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-8 flex gap-4">
                <FilterSelect
                    name="boardId"
                    placeholder="All Boards"
                    options={boards.map(b => ({ value: b.id, label: b.name }))}
                />
                <FilterSelect
                    name="subjectId"
                    placeholder="All Subjects"
                    options={subjects.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.program.name} - ${s.program.board.name})` }))}
                />
            </div>

            {/* Chapters List with Selection */}
            <ChapterListClient
                chapters={serializedChapters}
                onDelete={deleteChapters}
                pagination={{
                    currentPage: page,
                    pageSize: pageSize,
                    totalCount: totalCount,
                    totalPages: Math.ceil(totalCount / pageSize)
                }}
            />
        </div>
    );
}
