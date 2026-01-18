import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import FilterSelect from "@/components/admin/FilterSelect";
import ChapterListClient from "./chapter-list-client";
import { deleteChapters, updateChapter } from "./actions";

export default async function ChaptersPage({
    searchParams,
}: {
    searchParams: Promise<{
        boardId?: string;
        subjectId?: string;
        examId?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const params = await searchParams;
    const { boardId, subjectId, examId } = params;

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

    // Handle subject and exam filtering
    if (subjectId) {
        where.subject_id = parseInt(subjectId);
    }

    if (examId) {
        // Filter subjects by exam_id. If subject_id is also present, this adds an additional constraint
        // (though usually subject_id implies a specific exam)
        where.subject = {
            ...where.subject,
            exam_id: examId
        };
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
                quiz_regen_status: true,  // For tracking quiz regeneration
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
                        },
                        exam: true // Include exam info if needed for display
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

    const exams = await prisma.exam.findMany({
        where: { is_active: true },
        orderBy: { display_order: "asc" },
    });

    // Load subjects for filter dropdown - only those with chapters
    const subjectsWithChapters = await prisma.subject.findMany({
        where: {
            is_active: true,
            chapters: { some: {} },
            // If exam is selected, only show subjects for that exam in the dropdown?
            // Usually valid to filter subjects independently or conditionally.
            // For now, let's show all relevant subjects or filter if we want stricter UX.
            // Let's keep it simple: show all subjects that have chapters.
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

    // Load ALL subjects for edit dialog subject selection
    const allSubjects = await prisma.subject.findMany({
        where: { is_active: true },
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
        orderBy: [
            { program: { board: { name: 'asc' } } },
            { program: { name: 'asc' } },
            { name: 'asc' }
        ]
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
            <div className="bg-white p-4 rounded-lg shadow mb-8 flex gap-4 flex-wrap">
                <FilterSelect
                    name="boardId"
                    placeholder="All Boards"
                    options={boards.map(b => ({ value: b.id, label: b.name }))}
                />
                <FilterSelect
                    name="examId"
                    placeholder="All Exams"
                    options={exams.map(e => ({ value: e.id, label: e.short_name || e.name }))}
                />
                <FilterSelect
                    name="subjectId"
                    placeholder="All Subjects"
                    options={subjectsWithChapters.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.program.name} - ${s.program.board.name})` }))}
                />
            </div>

            {/* Chapters List with Selection */}
            <ChapterListClient
                chapters={serializedChapters}
                onDelete={deleteChapters}
                onUpdate={updateChapter}
                subjects={allSubjects}
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
