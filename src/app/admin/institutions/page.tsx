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
                select: { programs: true, profiles: true },
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
                        <li key={institution.id.toString()}>
                            <Link
                                href={`/admin/programs?institutionId=${institution.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-indigo-600 truncate">
                                                {institution.name}
                                            </span>
                                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {institution.type}
                                            </span>
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${institution.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {institution.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                                            <InstitutionStatusToggle institutionId={institution.id} isActive={institution.is_active} />
                                            <DeleteEntityButton
                                                entityId={institution.id}
                                                entityName={institution.name}
                                                entityType="Institution"
                                                deleteAction={deleteInstitution}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Board: {institution.board.name}
                                            </p>
                                            {institution.district && (
                                                <p className="flex items-center text-sm text-gray-500 mr-6">
                                                    District: {institution.district}
                                                </p>
                                            )}
                                            {institution.state && (
                                                <p className="flex items-center text-sm text-gray-500 mr-6">
                                                    State: {institution.state}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p className="mr-4">Programs: {institution._count.programs}</p>
                                            <p>Students: {institution._count.profiles}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
