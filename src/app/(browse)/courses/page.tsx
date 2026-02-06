import { getCatalogData, enrollInCourse } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SearchInput } from "@/components/browse/SearchInput";

export default async function CoursesPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    // Await searchParams before accessing properties
    const params = await searchParams;
    const query = params.q;

    const data: any = await getCatalogData(query);
    const { categories, upcoming, isAuthenticated, allCourses } = data;

    return (
        <div className="min-h-screen bg-white">
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Search Box using Client Component */}
                <SearchInput />

                {/* Section Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                        {query ? `Search Results for "${query}"` : "All Courses"}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {query ? "Browse matching courses." : "Browse our comprehensive collection of courses by category."}
                    </p>
                </div>

                {query ? (
                    // Flat Search Results
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {allCourses?.map((course: any) => (
                                <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                            ))}
                        </div>
                        {(!allCourses || allCourses.length === 0) && (
                            <EmptyState />
                        )}
                    </>
                ) : (
                    // Categorized View
                    <div className="space-y-16">
                        {/* Active Categories */}
                        {categories?.map((category: any) => (
                            <section key={category.id}>
                                <div className="flex items-center gap-4 mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">{category.name}</h3>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {category.courses.map((course: any) => (
                                        <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                                    ))}
                                </div>
                            </section>
                        ))}

                        {/* Upcoming Categories */}
                        {upcoming && upcoming.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">Coming Soon</h3>
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
                            </section>
                        )}

                        {categories?.length === 0 && upcoming?.length === 0 && (
                            <EmptyState />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No courses found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search terms.</p>
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
