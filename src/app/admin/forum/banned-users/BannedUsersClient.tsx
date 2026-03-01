"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"
import { unbanUser } from "./actions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function BannedUsersClient({ initialUsers }: { initialUsers: any[] }) {
    const [users, setUsers] = useState(initialUsers)

    const handleUnban = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to unban ${name}? They will be able to post in the forum again.`)) return

        try {
            const res = await unbanUser(id)
            if (res.success) {
                toast.success(`${name} has been unbanned.`)
                setUsers(users.filter(u => u.id !== id))
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Failed to unban user.")
        }
    }

    return (
        <div className="bg-white rounded-lg shadow min-h-[500px]">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                                    There are currently no banned users.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <Avatar>
                                                    <AvatarImage src={user.image || ''} />
                                                    <AvatarFallback>{(user.name || user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name || user.username}</div>
                                                <div className="text-sm text-gray-500">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.email || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200 capitalize">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUnban(user.id, user.name || user.username)}
                                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Unban User
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
