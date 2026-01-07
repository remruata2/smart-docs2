import { getCourseDetails } from "../actions";
import { EnrollmentButton } from "@/components/catalog/EnrollmentButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BookOpen,
    GraduationCap,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    Clock,
    FileText,
    User
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CourseDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const course = await getCourseDetails(parseInt(id));

    if (!course) {
        notFound();
    }

    const totalChapters = course.subjects.reduce(
        (sum, subject) => sum + subject._count.chapters,
        0
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white">
                <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left: Course Info */}
                        <div className="flex-1 space-y-4">
                            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                                {course.board.name}
                            </Badge>
                            <h1 className="text-3xl md:text-4xl font-bold">
                                {course.title}
                            </h1>
                            {course.description && (
                                <p className="text-lg text-white/80 leading-relaxed">
                                    {course.description}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-4 pt-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{course.subjects.length} Subjects</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>{totalChapters} Chapters</span>
                                </div>
                                {course.instructor && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>{course.instructor.user.name || course.instructor.user.username}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Enrollment Card */}
                        <div className="w-full lg:w-80 bg-white rounded-xl shadow-xl p-6 text-gray-900">
                            {course.thumbnail_url ? (
                                <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                                    <Image
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                                    <GraduationCap className="w-12 h-12 text-white/50" />
                                </div>
                            )}

                            {/* Pricing */}
                            <div className="mb-4">
                                {course.is_free ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-bold text-green-600">Free</span>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold">{course.currency} {course.price}</span>
                                    </div>
                                )}
                            </div>

                            {course.isEnrolled ? (
                                <Link href="/app/subjects" className="block">
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-6">
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Continue Learning
                                    </Button>
                                </Link>
                            ) : course.isAuthenticated ? (
                                <EnrollmentButton
                                    courseId={course.id}
                                    courseTitle={course.title}
                                    isFree={course.is_free}
                                    price={course.price || undefined}
                                    currency={course.currency}
                                />
                            ) : (
                                <Link href={`/login?callbackUrl=/courses/${course.id}`} className="block">
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 py-6">
                                        Sign In to Enroll
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Content */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <h2 className="text-2xl font-bold mb-6">Course Content</h2>
                <div className="space-y-4">
                    {course.subjects.map((subject) => (
                        <SubjectAccordion key={subject.id} subject={subject} />
                    ))}
                </div>

                {course.subjects.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No subjects added to this course yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SubjectAccordion({ subject }: { subject: any }) {
    return (
        <details className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                        <p className="text-sm text-gray-500">{subject._count.chapters} chapters</p>
                    </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="border-t border-gray-100 bg-gray-50">
                {subject.chapters.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                        {subject.chapters.map((chapter: any, index: number) => (
                            <li key={chapter.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                                    {index + 1}
                                </span>
                                <span className="text-sm text-gray-700">{chapter.title}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-4 py-3 text-sm text-gray-500 italic">No chapters added yet.</p>
                )}
            </div>
        </details>
    );
}
