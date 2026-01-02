import { getInstructorStats, getInstructorEnrollments } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function InstructorDashboardPage() {
    const stats = await getInstructorStats();
    const recentEnrollments = await getInstructorEnrollments();

    if (!stats) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Instructor profile not found</h2>
                <p className="text-gray-500 mt-2">Please contact an administrator to set up your profile.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {stats.instructorName}</h1>
                <p className="text-gray-500">Here's what's happening with your courses today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Courses</CardTitle>
                        <BookOpen className="h-5 w-5 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{stats.totalCourses}</div>
                        <p className="text-xs text-indigo-600 mt-1">{stats.publishedCourses} Published</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</CardTitle>
                        <Users className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
                        <p className="text-xs text-green-600 mt-1">Across all courses</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Course Status</CardTitle>
                        <GraduationCap className="h-5 w-5 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">Active</div>
                        <p className="text-xs text-amber-600 mt-1">Teaching & Mentoring</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm">
                    <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Enrollments</CardTitle>
                        <Link href="/instructor/enrollments" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                            View All <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentEnrollments.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">No recent enrollments.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {recentEnrollments.slice(0, 5).map((enrollment) => (
                                    <div key={enrollment.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                {enrollment.user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{enrollment.user.username}</p>
                                                <p className="text-xs text-gray-500">Enrolled in {enrollment.course.title}</p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-normal">
                                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/instructor/courses" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                                <BookOpen className="h-8 w-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium text-gray-900">Manage Courses</span>
                            </Link>
                            <Link href="/instructor/enrollments" className="flex flex-col items-center justify-center p-6 border rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                                <Users className="h-8 w-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium text-gray-900">Student List</span>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
