import { getSubjectsForUserProgram } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, FileText, Clock, Layers } from "lucide-react";
import { EnrollmentButton } from "@/components/catalog/EnrollmentButton";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { CourseFilter } from "@/components/subjects/CourseFilter";
import { prisma } from "@/lib/prisma";

export default async function SubjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>;
}) {
    const { courseId: courseIdParam } = await searchParams;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id as string);
    const courseId = courseIdParam ? parseInt(courseIdParam) : undefined;

    // 1. Fetch data for subjects display (with heavy mastery calculation)
    const data = await getSubjectsForUserProgram(courseId);

    // 2. Fetch ALL enrolled courses lightly for the filter
    const allEnrollments = await prisma.userEnrollment.findMany({
        where: { user_id: userId, status: "active" },
        select: { course: { select: { id: true, title: true } } }
    });
    const courses = allEnrollments.map(e => e.course);

    // If user has no enrollments, redirect to catalog
    if (!data || courses.length === 0) {
        redirect("/");
    }

    const { enrollments, programInfo } = data;
    const isAdmin = session?.user?.role === "admin";

    // Flatten subjects and de-duplicate by ID (subject might belong to multiple enrolled courses)
    const subjectMap = new Map();
    enrollments.forEach(enrollment => {
        enrollment.course.subjects.forEach(subject => {
            if (!subjectMap.has(subject.id)) {
                subjectMap.set(subject.id, {
                    ...subject,
                    courseTitle: enrollment.course.title,
                    courseId: enrollment.course.id,
                    mastery: subject.mastery,
                });
            }
        });
    });
    const enrolledSubjects = Array.from(subjectMap.values());

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

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <CourseFilter
                            courses={courses}
                            selectedCourseId={courseIdParam}
                        />
                        {!courseId && (
                            <Link href="/courses">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-6 h-auto text-base shadow-lg shadow-blue-500/20">
                                    Explore New Courses
                                </Button>
                            </Link>
                        )}
                    </div>
                    {courseId && isAdmin && enrollments.length > 0 && (
                        <div className="w-full md:w-auto">
                            <EnrollmentButton
                                courseId={enrollments[0].course.id}
                                courseTitle={enrollments[0].course.title}
                                isFree={true} // Dummy
                                isEnrolled={true}
                                isAdmin={isAdmin}
                                className="md:w-auto" // Override width on desktop
                            />
                        </div>
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
                        <Link href="/courses">
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">
                                Browse Course Catalog
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {enrolledSubjects.map((subject: any) => (
                        <Card
                            key={`${subject.courseId}-${subject.id}`}
                            className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-gray-100 hover:border-blue-200 h-full flex flex-col"
                        >
                            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-bold">
                                        {subject.courseTitle}
                                    </Badge>
                                    <Link href={`/app/chapters?subjectId=${subject.id}`} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 group-hover:text-blue-600 transition-colors">
                                        <ChevronRight className="h-5 w-5" />
                                    </Link>
                                </div>
                                <Link href={`/app/chapters?subjectId=${subject.id}`}>
                                    <CardTitle className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                                        {subject.name}
                                    </CardTitle>
                                </Link>
                                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                    <Layers className="h-3 w-3" />
                                    {subject.program?.name}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-gray-400 uppercase tracking-wider">Mastery Level</span>
                                            <span className={subject.mastery >= 80 ? "text-emerald-600" : "text-blue-600"}>
                                                {subject.mastery}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${subject.mastery >= 80 ? 'bg-emerald-500' : 'bg-blue-600'
                                                    }`}
                                                style={{ width: `${subject.mastery}%` }}
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
                                <div className="flex gap-2">
                                    <Link href={`/app/chapters?subjectId=${subject.id}`} className="flex-1">
                                        <Button className="w-full bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-100 hover:border-blue-100 transition-all font-bold group-hover:bg-blue-600 group-hover:text-white" variant="outline">
                                            Open Subject
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
