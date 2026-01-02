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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="py-12 text-center text-gray-500">
                            No courses created yet. Click "New Course" to get started.
                        </CardContent>
                    </Card>
                ) : (
                    courses.map((course) => (
                        <Card key={course.id} className="hover:shadow-md transition-shadow overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={course.is_published ? "default" : "secondary"}>
                                        {course.is_published ? "Published" : "Draft"}
                                    </Badge>
                                    <Badge variant="outline">{course.board.id}</Badge>
                                </div>
                                <CardTitle className="text-xl">{course.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                    {course.description || "No description provided."}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{course._count.subjects} Subjects</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        <span>{course._count.enrollments} Students</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/admin/courses/${course.id}`} className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Edit Details
                                        </Button>
                                    </Link>
                                    <DeleteEntityButton
                                        entityId={course.id}
                                        entityName={course.title}
                                        entityType="Program" // Closest match or just use a generic 'Course' if I update the component
                                        deleteAction={deleteCourse}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
