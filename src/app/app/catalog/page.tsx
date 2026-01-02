import { getCatalogData, enrollInCourse } from "./actions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, GraduationCap, Clock, CheckCircle2, Star, Users } from "lucide-react";
import { CourseEnrollmentDialog } from "@/components/catalog/CourseEnrollmentDialog";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CatalogPage() {
    const data = await getCatalogData();

    if (!data) {
        redirect("/login");
    }

    const { courses } = data;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-[#00255c] text-white py-16 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium">
                            <Star className="w-4 h-4 fill-current" />
                            <span>Unlock Your Potential</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                            Master Your Syllabus with <span className="text-blue-400">Zirna-AI</span>
                        </h1>
                        <p className="text-xl text-blue-100/80 max-w-2xl leading-relaxed">
                            Explore state-of-the-art courses tailored for competitive exams.
                            Enroll in comprehensive bundles and get the depth you need to excel.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-sm font-medium">10,000+ Students</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-white/20 pl-4">
                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                <span className="text-sm font-medium">Verified Content</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Catalog */}
            <main className="max-w-7xl mx-auto p-4 md:p-8 -mt-8">
                {/* Search and Filters placeholder */}
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 mb-12 flex flex-col md:flex-row gap-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="What do you want to learn?"
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Section Header */}
                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-gray-900">Featured Courses</h2>
                    <p className="text-gray-500">Pick a course and start learning today.</p>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>

                {courses.length === 0 && (
                    <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No courses available</h3>
                        <p className="text-gray-500 mt-1">Check back soon for new content!</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function CourseCard({ course }: { course: any }) {
    return (
        <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-gray-100">
                {course.thumbnail_url ? (
                    <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                        <GraduationCap className="w-12 h-12 text-white/50" />
                    </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-white/90 text-gray-900 backdrop-blur shadow-sm hover:bg-white border-none">
                        {course.board_id}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                        {course.title}
                    </h3>
                </div>

                <div className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {course.description}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {course.subjects.map((subject: any) => (
                        <Badge key={subject.id} variant="secondary" className="text-[10px] px-2 py-0">
                            {subject.name}
                        </Badge>
                    ))}
                </div>

                <div className="flex items-center gap-4 mt-auto pt-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.subjects.length} Subjects</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <CardFooter className="p-5 pt-0 border-t-0">
                {course.isEnrolled ? (
                    <Link href={`/app/subjects`} className="w-full">
                        <Button className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" variant="outline">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Continued Learning
                        </Button>
                    </Link>
                ) : (
                    <CourseEnrollmentDialog
                        courseId={course.id}
                        courseTitle={course.title}
                    />
                )}
            </CardFooter>
        </div>
    );
}
