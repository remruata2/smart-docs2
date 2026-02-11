import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { CustomChaptersClient } from "@/components/student/CustomChaptersClient";

export default async function CustomChaptersPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect(`/login?callbackUrl=/app/custom/${id}`);
    }

    const courseId = parseInt(id);
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            enrollments: {
                where: { user_id: parseInt((session.user as any).id) }
            }
        }
    });

    if (!course) {
        notFound();
    }

    if (course.enrollments.length === 0) {
        redirect(`/app/subjects`);
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <CustomChaptersClient courseId={courseId} courseTitle={course.title} />
            </div>
        </div>
    );
}
