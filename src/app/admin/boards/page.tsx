import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import BoardForm from "./board-form";
import BoardStatusToggle from "./board-status-toggle";
import DeleteEntityButton from "@/components/admin/DeleteEntityButton";
import { deleteBoard } from "@/app/actions/admin-extended";
import EditBoardDialog from "./edit-board-dialog";
import EntityActions from "@/components/admin/EntityActions";

export default async function BoardsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const boards = await prisma.board.findMany({
        include: {
            country: true,
            _count: {
                select: { institutions: true, programs: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    const countries = await prisma.country.findMany({
        where: { is_active: true }
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Education Boards</h1>
            </div>

            {/* Add Board Form */}
            <BoardForm countries={countries} />

            {/* Boards List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {boards.map((board) => (
                        <li key={board.id} className="relative group">
                            <Link
                                href={`/admin/institutions?boardId=${board.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {board.name}
                                                <span className="ml-1.5 text-xs font-normal text-gray-400">({board.id})</span>
                                            </span>
                                            {board.type && (
                                                <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                                                    {board.type}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${board.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {board.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {/* Spacer for absolute actions */}
                                        <div className="w-32"></div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Country:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{board.country.name}</span>
                                            </div>
                                            {board.state && (
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">State:</span>
                                                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{board.state}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Institutions:</span>
                                                <span className="tabular-nums font-medium">{board._count.institutions}</span>
                                            </div>
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Programs:</span>
                                                <span className="tabular-nums font-medium">{board._count.programs}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-5 right-4 sm:right-6">
                                <EntityActions>
                                    <EditBoardDialog board={board} countries={countries} />
                                    <BoardStatusToggle boardId={board.id} isActive={board.is_active} />
                                    <DeleteEntityButton
                                        entityId={board.id}
                                        entityName={board.name}
                                        entityType="Board"
                                        deleteAction={deleteBoard}
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
