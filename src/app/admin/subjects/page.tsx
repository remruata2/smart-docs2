import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import SubjectForm from "./subject-form";
import SubjectStatusToggle from "./subject-status-toggle";
import FilterSelect from "@/components/admin/FilterSelect";
import DeleteEntityButton from "@/components/admin/DeleteEntityButton";
import { deleteSubject } from "@/app/actions/admin-extended";
import EditSubjectDialog from "./edit-subject-dialog";
import EntityActions from "@/components/admin/EntityActions";

export default async function SubjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ programId?: string; examId?: string; courseId?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { programId, examId, courseId } = await searchParams;

    const where: any = {};
    if (programId) {
        where.program_id = parseInt(programId);
    }
    if (examId) {
        where.exam_id = examId;
    }
    if (courseId) {
        const id = parseInt(courseId);
        if (!isNaN(id)) {
            where.courses = {
                some: {
                    id: id
                }
            };
        }
    }

    const subjects = await prisma.subject.findMany({
        where,
        include: {
            program: {
                include: {
                    board: true,
                },
            },
            exam: true,
            _count: {
                select: { chapters: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    const programs = await prisma.program.findMany({
        where: { is_active: true },
        include: {
            board: true,
        },
        orderBy: { name: "asc" },
    });

    const exams = await prisma.exam.findMany({
        where: { is_active: true },
        orderBy: { display_order: "asc" },
    });

    const courses = await prisma.course.findMany({
        orderBy: { title: "asc" },
        select: { id: true, title: true }
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Subjects Management</h1>
            </div>

            {/* Add Subject Form */}
            <SubjectForm programs={programs} />

            <div className="bg-white p-4 rounded-lg shadow mb-8 flex gap-4 flex-wrap">
                <FilterSelect
                    name="examId"
                    placeholder="All Exams"
                    options={exams.map(e => ({ value: e.id, label: e.short_name || e.name }))}
                />
                <FilterSelect
                    name="programId"
                    placeholder="All Programs"
                    options={programs.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.board.name})` }))}
                />
                <FilterSelect
                    name="courseId"
                    placeholder="All Courses"
                    options={courses.map(c => ({ value: c.id.toString(), label: c.title }))}
                />
            </div>

            {/* Subjects List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {subjects.map((subject) => (
                        <li key={subject.id} className="relative group">
                            <Link
                                href={`/admin/chapters?subjectId=${subject.id}`}
                                className="block hover:bg-gray-50 transition"
                            >
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-base font-bold text-indigo-600 truncate">
                                                {subject.name}
                                            </span>
                                            {subject.code && (
                                                <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider">
                                                    {subject.code}
                                                </span>
                                            )}
                                            <span className={`ml-2 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${subject.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {subject.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {/* Spacer for absolute actions */}
                                        <div className="w-32"></div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Program:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{subject.program.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-600 mr-1.5">Board:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{subject.program.board.name}</span>
                                            </div>
                                            {subject.term && (
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">Term:</span>
                                                    <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-blue-700">{subject.term}</span>
                                                </div>
                                            )}
                                            {subject.exam && (
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-600 mr-1.5">Exam:</span>
                                                    <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-amber-700 font-medium">{subject.exam.short_name || subject.exam.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Chapters:</span>
                                                <span className="tabular-nums font-medium">{subject._count.chapters}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-5 right-4 sm:right-6">
                                <EntityActions>
                                    <EditSubjectDialog subject={subject} programs={programs} />
                                    <SubjectStatusToggle subjectId={subject.id} isActive={subject.is_active} />
                                    <DeleteEntityButton
                                        entityId={subject.id}
                                        entityName={subject.name}
                                        entityType="Subject"
                                        deleteAction={deleteSubject}
                                    />
                                </EntityActions>
                            </div>
                        </li>
                    ))}
                    {subjects.length === 0 && (
                        <li className="px-4 py-4 text-center text-gray-500">No subjects found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
