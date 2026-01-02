import { getCatalogData, enrollInCourse } from "./actions";
import { CourseEnrollmentDialog } from "@/components/catalog/CourseEnrollmentDialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, GraduationCap, Clock, CheckCircle2, Star, Users, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
    const data = await getCatalogData();
    const { courses, isAuthenticated } = data;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white py-20 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium backdrop-blur-sm">
                            <Star className="w-4 h-4 fill-current text-yellow-400" />
                            <span>AI-Powered Learning Platform</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                            Master Your Exams with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">AI-Powered</span> Learning
                        </h1>
                        <p className="text-xl text-white/70 max-w-2xl leading-relaxed">
                            Explore comprehensive courses tailored for competitive exams.
                            Enroll, learn at your pace, and excel with AI tutoring.
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <Users className="w-5 h-5 text-blue-300" />
                                </div>
                                <span className="text-sm font-medium">10,000+ Students</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <CheckCircle2 className="w-5 h-5 text-green-300" />
                                </div>
                                <span className="text-sm font-medium">Verified Content</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <BookOpen className="w-5 h-5 text-purple-300" />
                                </div>
                                <span className="text-sm font-medium">AI Tutor</span>
                            </div>
                        </div>
                        {!isAuthenticated && (
                            <div className="pt-6">
                                <Link href="/login">
                                    <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 font-bold px-8 py-6 text-lg shadow-xl">
                                        Get Started Free
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Catalog */}
            <main className="max-w-7xl mx-auto p-4 md:p-8 -mt-8">
                {/* Search Box */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search for courses, subjects, or topics..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
                        />
                    </div>
                </div>

                {/* Section Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Featured Courses</h2>
                    <p className="text-gray-500 mt-2">Pick a course and start your learning journey today.</p>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                    ))}
                </div>

                {courses.length === 0 && (
                    <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No courses available yet</h3>
                        <p className="text-gray-500 mt-1">Check back soon for new content!</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function CourseCard({ course, isAuthenticated }: { course: any; isAuthenticated: boolean }) {
    return (
        <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                        <GraduationCap className="w-12 h-12 text-white/50" />
                    </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-white/90 text-gray-900 backdrop-blur shadow-sm hover:bg-white border-none font-semibold">
                        {course.board_id}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {course.title}
                    </h3>
                </div>

                <div className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {course.description}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                    {course.subjects.slice(0, 3).map((subject: any) => (
                        <Badge key={subject.id} variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100">
                            {subject.name}
                        </Badge>
                    ))}
                    {course.subjects.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100">
                            +{course.subjects.length - 3} more
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-auto pt-4 text-sm text-gray-500 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.subjects.length} Subjects</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-5 pt-0">
                {course.isEnrolled ? (
                    <Link href={`/app/subjects?courseId=${course.id}`} className="w-full block">
                        <Button className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-5" variant="outline">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Continue Learning
                        </Button>
                    </Link>
                ) : isAuthenticated ? (
                    <CourseEnrollmentDialog
                        courseId={course.id}
                        courseTitle={course.title}
                    />
                ) : (
                    <Link href={`/login?callbackUrl=/`} className="w-full block">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 py-5 text-base font-bold">
                            Sign Up to Enroll
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
