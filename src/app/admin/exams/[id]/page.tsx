import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateExam } from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const exam = await prisma.exam.findUnique({
        where: { id }
    });

    if (!exam) {
        notFound();
    }

    const programs = await prisma.program.findMany({
        where: { is_active: true },
        select: {
            id: true,
            name: true,
            board: {
                select: { id: true }
            }
        }
    });

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Edit Exam</h1>
                <Link href="/admin/exams">
                    <Button variant="ghost">Cancel</Button>
                </Link>
            </div>

            <form action={updateExam.bind(null, exam.id)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                <div className="space-y-2">
                    <Label htmlFor="title">Exam Title</Label>
                    <Input id="title" name="title" defaultValue={exam.title} required />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="date">Exam Date</Label>
                    <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={exam.date.toISOString().split('T')[0]}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="program_id">Program (Optional)</Label>
                    <select
                        id="program_id"
                        name="program_id"
                        defaultValue={exam.program_id?.toString() || ""}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All Programs</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.board.id})</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" defaultValue={exam.description || ""} />
                </div>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        defaultChecked={exam.is_active}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="pt-4">
                    <Button type="submit" className="w-full">Update Exam</Button>
                </div>
            </form>
        </div>
    );
}
