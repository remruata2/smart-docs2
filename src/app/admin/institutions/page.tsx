import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import InstitutionForm from "./institution-form";
import InstitutionStatusToggle from "./institution-status-toggle";
import FilterSelect from "@/components/admin/FilterSelect";
import DeleteEntityButton from "@/components/admin/DeleteEntityButton";
import { deleteInstitution } from "@/app/actions/admin-extended";
import EditInstitutionDialog from "./edit-institution-dialog";
import EntityActions from "@/components/admin/EntityActions";

export default async function InstitutionsPage({
    searchParams,
}: {
    searchParams: Promise<{ boardId?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { boardId } = await searchParams;

    // Build filter
    const where: any = {};
    if (boardId) {
        where.board_id = boardId;
    }

    const institutions = await prisma.institution.findMany({
        where,
        include: {
            board: true,
            _count: {
                select: { programs: true, enrollments: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    const boards = await prisma.board.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Institutions Management</h1>
            </div>

            {/* Add Institution Form */}
            <InstitutionForm boards={boards} />

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-8">
                <FilterSelect
                    name="boardId"
                    placeholder="All Boards"
                    options={boards.map(b => ({ value: b.id, label: b.name }))}
                />
            </div>

            {/* Institutions List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {institutions.map((institution) => (
                        <li key={institution.id.toString()} className="relative group">
                            <Link
                                href={`/admin/programs?institutionId=${institution.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {institution.name}
                                            </span>
                                            <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                                                {institution.type}
                                            </span>
                                            <span className={`ml-2 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${institution.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {institution.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {/* Spacer for absolute actions */}
                                        <div className="w-40"></div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Board:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{institution.board.name}</span>
                                            </div>
                                            {(institution.district || institution.state) && (
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">Location:</span>
                                                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                        {[institution.district, institution.state].filter(Boolean).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Programs:</span>
                                                <span className="tabular-nums font-medium">{institution._count.programs}</span>
                                            </div>
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Students:</span>
                                                <span className="tabular-nums font-medium">{institution._count.enrollments}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-5 right-4 sm:right-6">
                                <EntityActions>
                                    <EditInstitutionDialog institution={institution} boards={boards} />
                                    <InstitutionStatusToggle institutionId={institution.id} isActive={institution.is_active} />
                                    <DeleteEntityButton
                                        entityId={institution.id}
                                        entityName={institution.name}
                                        entityType="Institution"
                                        deleteAction={deleteInstitution}
                                    />
                                </EntityActions>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
