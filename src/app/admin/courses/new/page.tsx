import { getBoards, getInstructorsForCourse } from "../actions";
import { CourseForm } from "../CourseForm";

export default async function NewCoursePage() {
    const [boards, instructors] = await Promise.all([
        getBoards(),
        getInstructorsForCourse()
    ]);

    return (
        <div className="p-6">
            <CourseForm boards={boards} instructors={instructors} />
        </div>
    );
}
