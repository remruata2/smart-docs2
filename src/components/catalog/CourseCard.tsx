import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, CheckCircle2 } from "lucide-react";

interface CourseCardProps {
    course: any;
    isAuthenticated: boolean;
}

export function CourseCard({ course, isAuthenticated }: CourseCardProps) {
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
