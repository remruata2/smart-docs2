import { getCourses, deleteCourse } from "./actions";
import DeleteEntityButton from "@/components/admin/DeleteEntityButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Users, Settings } from "lucide-react";

export default async function CoursesAdminPage() {
    const courses = await getCourses();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Courses</h1>
                    <p className="text-gray-500">Manage learning bundles and subject enrollments</p>
                </div>
                <Link href="/admin/courses/new">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        New Course
                    </Button>
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {courses.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No courses created yet. Click "New Course" to get started.
                        </li>
                    ) : (
                        courses.map((course) => (
                            <li key={course.id}>
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {course.title}
                                            </span>
                                            <span className={`ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${course.is_published ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                                {course.is_published ? "Published" : "Draft"}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex items-center gap-3">
                                            <Link href={`/admin/courses/${course.id}`}>
                                                <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <DeleteEntityButton
                                                entityId={course.id}
                                                entityName={course.title}
                                                entityType="Program"
                                                deleteAction={deleteCourse}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Board:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{course.board.name}</span>
                                            </div>
                                            {course.description && (
                                                <div className="flex items-center max-w-sm">
                                                    <span className="truncate italic">"{course.description}"</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <BookOpen className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                <span className="font-bold mr-1.5">Subjects:</span>
                                                <span className="tabular-nums font-medium">{course._count.subjects}</span>
                                            </div>
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <Users className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                <span className="font-bold mr-1.5">Students:</span>
                                                <span className="tabular-nums font-medium">{course._count.enrollments}</span>
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
