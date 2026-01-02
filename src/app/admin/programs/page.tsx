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
                select: { subjects: true, profiles: true },
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
                        <li key={program.id}>
                            <Link
                                href={`/admin/subjects?programId=${program.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-indigo-600 truncate">
                                                {program.name}
                                            </span>
                                            {program.level && (
                                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {program.level}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${program.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {program.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                                            <ProgramStatusToggle programId={program.id} isActive={program.is_active} />
                                            <DeleteEntityButton
                                                entityId={program.id}
                                                entityName={program.name}
                                                entityType="Program"
                                                deleteAction={deleteProgram}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500 mr-6">
                                            Board: {program.board.name}
                                        </p>
                                        {program.institution && (
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Institution: {program.institution.name}
                                            </p>
                                        )}
                                        {!program.institution && (
                                            <p className="flex items-center text-sm text-gray-500 mr-6 italic">
                                                Board-level program
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                        <p className="mr-4">Subjects: {program._count.subjects}</p>
                                        <p>Students: {program._count.profiles}</p>
                                    </div>
                                </div>
                            </Link>
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
