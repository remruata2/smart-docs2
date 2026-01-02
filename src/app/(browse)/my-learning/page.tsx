import { getMyLearningData } from "../actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, ArrowRight, Clock, Play } from "lucide-react";
import Image from "next/image";

export default async function MyLearningPage() {
    const data = await getMyLearningData();

    if (!data) {
        redirect("/login?callbackUrl=/my-learning");
    }

    const { enrollments } = data;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Learning</h1>
                            <p className="text-gray-500 mt-1">Continue where you left off</p>
                        </div>
                        <Link href="/">
                            <Button variant="outline">
                                Browse More Courses
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Course Grid */}
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {enrollments.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <BookOpen className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            You haven't enrolled in any courses. Browse our catalog and start learning today!
                        </p>
                        <Link href="/">
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                                Browse Courses
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrollments.map((enrollment) => (
                            <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function EnrolledCourseCard({ enrollment }: { enrollment: any }) {
    const course = enrollment.course;
    const progress = enrollment.progress || 0;

    return (
        <Link href={`/app/subjects?courseId=${course.id}`}>
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-full">
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
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl">
                                <Play className="w-6 h-6 text-indigo-600 ml-1" />
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {course.title}
                        </h3>
                        <Badge variant="secondary" className="shrink-0 bg-indigo-50 text-indigo-700">
                            {progress}%
                        </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {course.subjects.slice(0, 2).map((subject: any) => (
                            <Badge key={subject.id} variant="outline" className="text-xs">
                                {subject.name}
                            </Badge>
                        ))}
                        {course.subjects.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{course.subjects.length - 2}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.subjects.length} Subjects</span>
                        </div>
                        {enrollment.last_accessed_at && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>Recently accessed</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
