import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import SubjectForm from "./subject-form";
import SubjectStatusToggle from "./subject-status-toggle";
import FilterSelect from "@/components/admin/FilterSelect";

export default async function SubjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ programId?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { programId } = await searchParams;

    const where: any = {};
    if (programId) {
        where.program_id = parseInt(programId);
    }

    const subjects = await prisma.subject.findMany({
        where,
        include: {
            program: {
                include: {
                    board: true,
                },
            },
            _count: {
                select: { chapters: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    const programs = await prisma.program.findMany({
        where: { is_active: true },
        include: {
            board: true,
        },
        orderBy: { name: "asc" },
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Subjects Management</h1>
            </div>

            {/* Add Subject Form */}
            <SubjectForm programs={programs} />

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-8">
                <FilterSelect
                    name="programId"
                    placeholder="All Programs"
                    options={programs.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.board.name})` }))}
                />
            </div>

            {/* Subjects List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {subjects.map((subject) => (
                        <li key={subject.id}>
                            <Link
                                href={`/admin/chapters?subjectId=${subject.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-indigo-600 truncate">
                                                {subject.name}
                                            </span>
                                            {subject.code && (
                                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    {subject.code}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${subject.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {subject.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <SubjectStatusToggle subjectId={subject.id} isActive={subject.is_active} />
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Program: {subject.program.name}
                                            </p>
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Board: {subject.program.board.name}
                                            </p>
                                            {subject.term && (
                                                <p className="flex items-center text-sm text-gray-500 mr-6">
                                                    Term: {subject.term}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p>Chapters: {subject._count.chapters}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                    {subjects.length === 0 && (
                        <li className="px-4 py-4 text-center text-gray-500">No subjects found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
