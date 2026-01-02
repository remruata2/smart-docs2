import { getCourseById, getBoards, getInstructorsForCourse } from "../actions";
import { CourseForm } from "../CourseForm";
import { notFound } from "next/navigation";

export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [course, boards, instructors] = await Promise.all([
        getCourseById(parseInt(id)),
        getBoards(),
        getInstructorsForCourse(),
    ]);

    if (!course) {
        notFound();
    }

    return (
        <div className="p-6">
            <CourseForm course={course} boards={boards} instructors={instructors} />
        </div>
    );
}
