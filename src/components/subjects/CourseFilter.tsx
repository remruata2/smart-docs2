"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";

interface CourseFilterProps {
    courses: { id: number; title: string }[];
    selectedCourseId?: string;
}

export function CourseFilter({ courses, selectedCourseId }: CourseFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleCourseChange = (courseId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (courseId === "all") {
            params.delete("courseId");
        } else {
            params.set("courseId", courseId);
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <Select
                value={selectedCourseId || "all"}
                onValueChange={handleCourseChange}
            >
                <SelectTrigger className="w-full md:w-[280px] bg-white border-gray-200">
                    <div className="flex items-center gap-2 truncate">
                        <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
                        <SelectValue placeholder="All Courses" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
