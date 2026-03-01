import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { BannedUsersClient } from "./BannedUsersClient"

export const metadata = {
    title: "Banned Users | Admin",
}

export default async function AdminBannedUsersPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.role !== "admin") {
        redirect("/login")
    }

    const bannedUsers = await prisma.user.findMany({
        where: { is_active: false },
        orderBy: { created_at: "desc" },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            image: true,
        }
    })

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Banned Users</h1>
                <p className="text-gray-500 mt-1">Manage users who have been restricted from using the platform.</p>
            </div>

            <BannedUsersClient initialUsers={bannedUsers} />
        </div>
    )
}
