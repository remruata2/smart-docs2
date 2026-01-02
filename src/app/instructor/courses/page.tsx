import { getInstructorCourses } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Clock, Globe } from "lucide-react";

export default async function InstructorCoursesPage() {
    const courses = await getInstructorCourses();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                <p className="text-gray-500">View and manage the courses you are instructing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length === 0 ? (
                    <Card className="col-span-full border-dashed bg-white">
                        <CardContent className="py-12 text-center text-gray-500">
                            No courses have been assigned to you yet.
                        </CardContent>
                    </Card>
                ) : (
                    courses.map((course) => (
                        <Card key={course.id} className="bg-white border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div className="h-32 bg-indigo-600 relative overflow-hidden">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <BookOpen className="h-12 w-12 text-indigo-200 opacity-50" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <Badge className={`${course.is_published ? 'bg-green-600' : 'bg-gray-600'}`}>
                                        {course.is_published ? 'Published' : 'Draft'}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white/90 text-indigo-900 border-none">
                                        {course.board.id}
                                    </Badge>
                                </div>
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Created {new Date(course.created_at).toLocaleDateString()}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-indigo-600" />
                                        <span>{course._count.enrollments} Students</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Globe className="h-4 w-4 text-indigo-600" />
                                        <span>{course.is_free ? 'Free' : `${course.currency} ${course.price}`}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
