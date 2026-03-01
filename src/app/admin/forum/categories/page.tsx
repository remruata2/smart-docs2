import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { CategoriesClient } from "./CategoriesClient"

export const metadata = {
    title: "Manage Forum Categories | Admin",
}

export default async function AdminForumCategoriesPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.role !== "admin") {
        redirect("/login")
    }

    const categories = await prisma.forumCategory.findMany({
        orderBy: { order: "asc" },
        include: {
            _count: {
                select: { topics: true }
            }
        }
    })

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Forum Categories</h1>
                <p className="text-gray-500 mt-1">Manage categories for the community forum.</p>
            </div>

            <CategoriesClient initialCategories={categories} />
        </div>
    )
}
