import { getSubjectsForUserProgram } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, FileText, Clock, Layers } from "lucide-react";

export default async function SubjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>;
}) {
    const { courseId } = await searchParams;
    const data = await getSubjectsForUserProgram(courseId ? parseInt(courseId) : undefined);

    // If user has no enrollments or not logged in, redirect to catalog
    if (!data) {
        redirect("/");
    }

    const { enrollments, programInfo } = data;

    // Flatten subjects from all enrollments
    const enrolledSubjects = enrollments.flatMap(enrollment =>
        enrollment.course.subjects.map(subject => ({
            ...subject,
            courseTitle: enrollment.course.title,
            courseId: enrollment.course.id,
            progress: enrollment.progress,
        }))
    );

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            {/* Header */}
            <div className="mb-12 border-b border-gray-100 pb-8">
                <div className="flex items-center gap-4 mb-2">
                    <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-wider text-[10px]">
                        My Learning
                    </Badge>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                            {courseId ? enrollments[0]?.course.title : "Enrolled Subjects"}
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            {programInfo?.program.name || "Academic"} • {programInfo?.board.name || "Global"}
                        </p>
                    </div>
                    {!courseId && (
                        <Link href="/app/catalog">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-6 h-auto text-base shadow-lg shadow-blue-500/20">
                                Explore New Courses
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Subject List */}
            {enrolledSubjects.length === 0 ? (
                <Card className="border-dashed border-2 bg-gray-50/50">
                    <CardContent className="py-24 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <BookOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Ready to start learning?
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Head over to the catalog to choose your courses and begin your exam preparation journey.
                        </p>
                        <Link href="/app/catalog">
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">
                                Browse Course Catalog
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {enrolledSubjects.map((subject: any) => (
                        <Link
                            key={`${subject.courseId}-${subject.id}`}
                            href={`/app/chapters?subjectId=${subject.id}`}
                        >
                            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100 hover:border-blue-200 h-full flex flex-col">
                                <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-bold">
                                            {subject.courseTitle}
                                        </Badge>
                                        <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 group-hover:text-blue-600 transition-colors">
                                            <ChevronRight className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                                        {subject.name}
                                    </CardTitle>
                                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <Layers className="h-3 w-3" />
                                        {subject.program?.name}
                                    </p>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-gray-400 uppercase">Course Progress</span>
                                                <span className="text-blue-600">{subject.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                                                    style={{ width: `${subject.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="h-4 w-4" />
                                                <span>{subject._count.chapters} Chapters</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4" />
                                                <span>Self-paced</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="p-5 pt-0 mt-auto">
                                    <Button className="w-full bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-100 hover:border-blue-100 transition-all font-bold group-hover:bg-blue-600 group-hover:text-white" variant="outline">
                                        Open Subject
                                    </Button>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
