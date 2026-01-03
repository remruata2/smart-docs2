import { getInstructors } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, BookOpen, Mail, ExternalLink } from "lucide-react";

export default async function InstructorsAdminPage() {
    const instructors = await getInstructors();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Instructors</h1>
                    <p className="text-gray-500">Manage course instructors and their profiles</p>
                </div>
                <Link href="/admin/instructors/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Instructor
                    </Button>
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {instructors.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No instructors added yet. Click "Add Instructor" to get started.
                        </li>
                    ) : (
                        instructors.map((instructor) => (
                            <li key={instructor.id}>
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3">
                                                {instructor.user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {instructor.user.username}
                                            </span>
                                            <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider">
                                                {instructor.title || "Instructor"}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex items-center gap-3">
                                            <Link href={`/admin/instructors/${instructor.id}`}>
                                                <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                    Edit Profile
                                                </Button>
                                            </Link>
                                            <Link href={`/instructor/dashboard`}>
                                                <Button variant="outline" size="sm" className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Dashboard
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Email:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{instructor.user.email}</span>
                                            </div>
                                            {instructor.bio && (
                                                <div className="flex items-center max-w-sm">
                                                    <span className="truncate italic">"{instructor.bio}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <BookOpen className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                <span className="font-bold mr-1.5">Courses:</span>
                                                <span className="tabular-nums font-medium">{instructor._count.courses}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
