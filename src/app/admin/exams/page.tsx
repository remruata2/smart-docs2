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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => (
                    <Card key={exam.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {exam.title}
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Date(exam.date).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {exam.program ? exam.program.name : "All Programs"}
                            </p>
                            {exam.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                    {exam.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-4">
                                <Link href={`/admin/exams/${exam.id}`} className="w-full">
                                    <Button variant="outline" size="sm" className="w-full">
                                        <Edit className="w-3 h-3 mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                                <form action={deleteExam.bind(null, exam.id)}>
                                    <Button variant="destructive" size="sm" type="submit">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {exams.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed">
                        <p className="text-gray-500">No exams found. Create one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
