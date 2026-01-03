import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteExam } from "./actions";

export default async function AdminExamsPage() {
    const exams = await prisma.exam.findMany({
        orderBy: { date: 'asc' },
        include: { program: true }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
                <Link href="/admin/exams/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Exam
                    </Button>
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {exams.map((exam) => (
                        <li key={exam.id}>
                            <div className="px-4 py-5 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-base font-bold text-indigo-600 truncate">
                                            {exam.title}
                                        </span>
                                        <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                            {new Date(exam.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                                        <Link href={`/admin/exams/${exam.id}`}>
                                            <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <form action={deleteExam.bind(null, exam.id)}>
                                            <Button variant="outline" size="sm" type="submit" className="h-8 border-red-200 text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-sm text-gray-500">
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                        <div className="flex items-center">
                                            <span className="font-semibold text-gray-600 mr-1.5">Program:</span>
                                            <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                {exam.program ? exam.program.name : "All Programs"}
                                            </span>
                                        </div>
                                        {exam.description && (
                                            <div className="flex items-center max-w-md">
                                                <span className="truncate italic">"{exam.description}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {exams.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No exams found. Create one to get started.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
