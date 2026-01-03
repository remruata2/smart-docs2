import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import ProgramForm from "./program-form";
import ProgramStatusToggle from "./program-status-toggle";
import FilterSelect from "@/components/admin/FilterSelect";
import DeleteEntityButton from "@/components/admin/DeleteEntityButton";
import { deleteProgram } from "@/app/actions/admin-extended";
import EditProgramDialog from "./edit-program-dialog";
import EntityActions from "@/components/admin/EntityActions";

export default async function ProgramsPage({
    searchParams,
}: {
    searchParams: Promise<{ boardId?: string; institutionId?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { boardId, institutionId } = await searchParams;

    const where: any = {};
    if (boardId) {
        where.board_id = boardId;
    }
    if (institutionId) {
        where.institution_id = BigInt(institutionId);
    }

    const programs = await prisma.program.findMany({
        where,
        include: {
            board: true,
            institution: true,
            _count: {
                select: { subjects: true, enrollments: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    const boards = await prisma.board.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
    });

    const institutions = await prisma.institution.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Programs Management</h1>
            </div>

            {/* Add Program Form */}
            <ProgramForm boards={boards} institutions={institutions} />

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-8 flex gap-4">
                <FilterSelect
                    name="boardId"
                    placeholder="All Boards"
                    options={boards.map(b => ({ value: b.id, label: b.name }))}
                />
                <FilterSelect
                    name="institutionId"
                    placeholder="All Institutions"
                    options={institutions.map(i => ({ value: i.id.toString(), label: i.name }))}
                />
            </div>

            {/* Programs List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {programs.map((program) => (
                        <li key={program.id} className="relative group">
                            <Link
                                href={`/admin/subjects?programId=${program.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {program.name}
                                            </span>
                                            {program.level && (
                                                <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                                                    {program.level}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${program.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {program.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {/* Spacer for absolute actions */}
                                        <div className="w-40"></div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Board:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{program.board.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Institution:</span>
                                                <span className={`px-2 py-0.5 rounded border ${program.institution ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100 italic'}`}>
                                                    {program.institution?.name || "Board-level"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Subjects:</span>
                                                <span className="tabular-nums font-medium">{program._count.subjects}</span>
                                            </div>
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Students:</span>
                                                <span className="tabular-nums font-medium">{program._count.enrollments}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-5 right-4 sm:right-6">
                                <EntityActions>
                                    <EditProgramDialog program={program} boards={boards} institutions={institutions} />
                                    <ProgramStatusToggle programId={program.id} isActive={program.is_active} />
                                    <DeleteEntityButton
                                        entityId={program.id}
                                        entityName={program.name}
                                        entityType="Program"
                                        deleteAction={deleteProgram}
                                    />
                                </EntityActions>
                            </div>
                        </li>
                    ))}
                    {programs.length === 0 && (
                        <li className="px-4 py-4 text-center text-gray-500">No programs found.</li>
                    )}
                </ul>
            </div>
        </div >
    );
}
