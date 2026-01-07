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

    return <BattleLobby initialSubjects={initialSubjects} />;
}
