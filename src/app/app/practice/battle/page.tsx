import { BattleLobby } from "@/components/battle/BattleLobby";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubjectsForUserProgram } from "@/app/app/subjects/actions";

export default async function BattlePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Prefetch subjects without mastery for faster loading
    const subjectsData = await getSubjectsForUserProgram(undefined, false);
    const initialSubjects = subjectsData?.enrollments.flatMap(e => e.course.subjects) || [];
    // Use the first enrolled course ID for the battle lobby presence room
    // Use the first enrolled course ID for the battle lobby presence room, or generic 'general' room
    const courseId = subjectsData?.enrollments?.[0]?.course_id?.toString() || "general";

    return <BattleLobby initialSubjects={initialSubjects} courseId={courseId} />;
}
