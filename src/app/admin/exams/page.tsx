import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Tag, GraduationCap, Briefcase, Trophy, Building, BookOpen } from "lucide-react";
import { deleteExam } from "./actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

const examTypeIcons: Record<string, any> = {
    board: GraduationCap,
    entrance: BookOpen,
    competitive: Trophy,
    professional: Briefcase,
    university: Building,
};

const examTypeLabels: Record<string, string> = {
    board: "Board Exam",
    entrance: "Entrance Exam",
    competitive: "Competitive Exam",
    professional: "Professional",
    university: "University",
};

const examTypeColors: Record<string, string> = {
    board: "bg-blue-50 text-blue-700 border-blue-200",
    entrance: "bg-purple-50 text-purple-700 border-purple-200",
    competitive: "bg-amber-50 text-amber-700 border-amber-200",
    professional: "bg-emerald-50 text-emerald-700 border-emerald-200",
    university: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function AdminExamsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const exams = await prisma.exam.findMany({
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        include: {
            parent: {
                select: { code: true, name: true }
            },
            _count: {
                select: {
                    children: true,
                    subjects: true,
                    syllabi: true,
                    textbooks: true,
                }
            }
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exam Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage exam categories for organizing syllabi, subjects, and textbooks
                    </p>
                </div>
                <Link href="/admin/exams/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Exam
                    </Button>
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {exams.map((exam) => {
                        const TypeIcon = examTypeIcons[exam.exam_type] || Tag;
                        const totalUsage = exam._count.subjects + exam._count.syllabi + exam._count.textbooks;

                        return (
                            <li key={exam.id} className="hover:bg-gray-50 transition">
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${examTypeColors[exam.exam_type] || 'bg-gray-50'}`}>
                                                <TypeIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-gray-900">
                                                        {exam.short_name || exam.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                        {exam.code}
                                                    </span>
                                                    {!exam.is_active && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-50 text-red-600 border border-red-200">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                {exam.short_name && exam.name !== exam.short_name && (
                                                    <p className="text-sm text-gray-500 mt-0.5">{exam.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/admin/exams/${exam.id}`}>
                                                <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            {totalUsage === 0 && (
                                                <form action={deleteExam.bind(null, exam.id)}>
                                                    <Button variant="outline" size="sm" type="submit" className="h-8 border-red-200 text-red-700 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </form>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${examTypeColors[exam.exam_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                            {examTypeLabels[exam.exam_type] || exam.exam_type}
                                        </span>

                                        {exam.parent && (
                                            <div className="flex items-center text-gray-500">
                                                <span className="font-medium mr-1">Parent:</span>
                                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                    {exam.parent.code}
                                                </span>
                                            </div>
                                        )}

                                        {exam._count.children > 0 && (
                                            <div className="text-gray-500">
                                                <span className="font-medium">{exam._count.children}</span> sub-exams
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 ml-auto text-gray-500">
                                            {exam._count.subjects > 0 && (
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                                                    {exam._count.subjects} subjects
                                                </span>
                                            )}
                                            {exam._count.syllabi > 0 && (
                                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                                    {exam._count.syllabi} syllabi
                                                </span>
                                            )}
                                            {exam._count.textbooks > 0 && (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                                                    {exam._count.textbooks} textbooks
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {exam.description && (
                                        <p className="mt-2 text-sm text-gray-500 italic line-clamp-1">
                                            {exam.description}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                    {exams.length === 0 && (
                        <li className="px-4 py-12 text-center">
                            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No exam categories</h3>
                            <p className="text-gray-500 mb-4">Create exam categories to organize your content</p>
                            <Link href="/admin/exams/new">
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Exam
                                </Button>
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
