import { getCatalogData, enrollInCourse } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, CheckCircle2, Star, ArrowRight, Trophy, Bot, ClipboardList, MousePointerClick } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
    const data: any = await getCatalogData();
    const { categories, upcoming, isAuthenticated } = data;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white py-10 px-3 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-4 flex-1 text-center md:text-left">
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
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <CheckCircle2 className="w-5 h-5 text-green-300" />
                                </div>
                                <span className="text-sm font-medium">Verified Content</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <MousePointerClick className="w-5 h-5 text-pink-300" />
                                </div>
                                <span className="text-sm font-medium">Highly Interactive</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <ClipboardList className="w-5 h-5 text-blue-300" />
                                </div>
                                <span className="text-sm font-medium">Mock Test</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <Trophy className="w-5 h-5 text-yellow-300" />
                                </div>
                                <span className="text-sm font-medium">Gamified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <Bot className="w-5 h-5 text-purple-300" />
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
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
                {/* Global Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
                        <p className="text-gray-500 mt-2">Pick a course and start your learning journey today.</p>
                    </div>
                    <Link href="/courses">
                        <Button variant="outline" className="hidden sm:flex items-center gap-2">
                            All Courses
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                {/* Categories */}
                <div className="space-y-16">
                    {categories?.map((category: any) => (
                        <section key={category.id}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-bold text-gray-900">{category.name}</h3>
                                    <div className="h-px w-12 bg-gray-200 hidden sm:block"></div>
                                </div>
                                <Link href="/courses">
                                    <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-sm font-semibold">
                                        View All
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {category.courses.slice(0, 4).map((course: any) => (
                                    <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Upcoming Section */}
                {upcoming && upcoming.length > 0 && (
                    <div className="mt-16">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Coming Soon</h2>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {upcoming.map((category: any) => (
                                <div key={category.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 text-center opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <GraduationCap className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">{category.name}</h4>
                                    <p className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-full mt-2">Coming Soon</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(!categories || categories.length === 0) && (!upcoming || upcoming.length === 0) && (
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
        <Link href={`/courses/${course.id}`} className="block h-full">
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
                <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {course.title}
                        </h3>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
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

                    <div className="flex items-center justify-between mt-auto pt-3 text-sm text-gray-500 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.subjects.length} Subjects</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span>{course.subjects.reduce((acc: number, s: any) => acc + (s._count?.chapters || 0), 0)} Chapters</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 pt-0">
                    {course.isEnrolled ? (
                        <Button className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-5" variant="outline">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Continue Learning
                        </Button>
                    ) : (
                        <Button className={`w-full py-5 text-base font-bold ${course.is_free ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                            {course.is_free ? 'View Course' : `${course.currency} ${course.price}`}
                        </Button>
                    )}
                </div>
            </div>
        </Link>
    );
}
