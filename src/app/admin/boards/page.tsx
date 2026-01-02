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
                        <li key={board.id}>
                            <Link
                                href={`/admin/institutions?boardId=${board.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-indigo-600 truncate">
                                                {board.name} ({board.id})
                                            </span>
                                            {board.type && (
                                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    {board.type}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${board.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {board.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                                            <BoardStatusToggle boardId={board.id} isActive={board.is_active} />
                                            <DeleteEntityButton
                                                entityId={board.id}
                                                entityName={board.name}
                                                entityType="Board"
                                                deleteAction={deleteBoard}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500 mr-6">
                                                Country: {board.country.name}
                                            </p>
                                            {board.state && (
                                                <p className="flex items-center text-sm text-gray-500 mr-6">
                                                    State: {board.state}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <p className="mr-4">Institutions: {board._count.institutions}</p>
                                            <p>Programs: {board._count.programs}</p>
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
