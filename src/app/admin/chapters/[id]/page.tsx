import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function ChapterViewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { id } = await params;
    const chapterId = BigInt(id);

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
            subject: {
                include: {
                    program: {
                        include: {
                            board: true,
                        },
                    },
                },
            },
            pages: {
                orderBy: { page_number: "asc" },
            },
            chunks: {
                orderBy: { chunk_index: "asc" },
                take: 10, // Preview first 10 chunks
            },
            _count: {
                select: { chunks: true, pages: true },
            },
        },
    });

    if (!chapter) {
        notFound();
    }

    // Parse content_json to get markdown preview
    const contentPages = chapter.content_json as any[];
    const markdownPreview = contentPages?.slice(0, 3)
        .map((p: any) => p.md || p.text)
        .join("\n\n")
        .substring(0, 2000);

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Link href="/admin/chapters" className="text-indigo-600 hover:text-indigo-800">
                    ← Back to Chapters
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{chapter.title}</h1>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${chapter.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {chapter.is_active ? 'Active' : 'Inactive'}
                                </span>
                                {chapter.is_global && (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        Global
                                    </span>
                                )}
                            </div>
                        </div>
                        <Link
                            href={`/admin/chapters/${id}/questions`}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
                        >
                            📝 Manage Questions
                        </Link>
                    </div>
                </div>

                <div className="px-4 py-5 sm:p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Subject</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter.subject.name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Program</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter.subject.program.name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Board</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter.subject.program.board.name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Chapter Number</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter.chapter_number || "N/A"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Total Pages</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter._count.pages}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Total Chunks</dt>
                            <dd className="mt-1 text-sm text-gray-900">{chapter._count.chunks}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Accessible Boards</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {chapter.is_global ? "All Boards (Global)" : chapter.accessible_boards.join(", ")}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Created At</dt>
                            <dd className="mt-1 text-sm text-gray-900">{new Date(chapter.created_at).toLocaleString()}</dd>
                        </div>
                    </dl>

                    {/* Content Preview */}
                    <div className="mt-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Content Preview (Markdown)</h3>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                {markdownPreview || "No content available"}
                            </pre>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Showing first 2000 characters from first 3 pages</p>
                    </div>

                    {/* Page Screenshots */}
                    {chapter.pages.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Page Screenshots</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {chapter.pages.slice(0, 8).map((page) => (
                                    <div key={page.id} className="border rounded-lg overflow-hidden">
                                        {page.image_url ? (
                                            <img
                                                src={page.image_url}
                                                alt={`Page ${page.page_number}`}
                                                className="w-full h-auto"
                                            />
                                        ) : (
                                            <div className="bg-gray-100 h-48 flex items-center justify-center text-gray-400">
                                                No Image
                                            </div>
                                        )}
                                        <div className="p-2 bg-gray-50 text-center text-xs text-gray-600">
                                            Page {page.page_number}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {chapter.pages.length > 8 && (
                                <p className="mt-2 text-xs text-gray-500">Showing first 8 of {chapter.pages.length} pages</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
