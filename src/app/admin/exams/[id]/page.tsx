import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateExam } from "../actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { id } = await params;
    const exam = await prisma.exam.findUnique({
        where: { id }
    });

    if (!exam) {
        notFound();
    }

    // Get parent exams for hierarchy (exclude self and children)
    const parentExams = await prisma.exam.findMany({
        where: {
            is_active: true,
            parent_id: null,
            NOT: { id: exam.id }
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
            code: true,
            name: true,
        }
    });

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="mb-6">
                <Link href="/admin/exams" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Exam Categories
                </Link>
                <h1 className="text-2xl font-bold">Edit Exam Category</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Update exam category details
                </p>
            </div>

            <form action={updateExam.bind(null, exam.id)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Code *</Label>
                        <Input
                            id="code"
                            name="code"
                            defaultValue={exam.code}
                            className="font-mono uppercase"
                            required
                        />
                        <p className="text-xs text-muted-foreground">Unique identifier (uppercase, no spaces)</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="short_name">Short Name</Label>
                        <Input
                            id="short_name"
                            name="short_name"
                            defaultValue={exam.short_name || ""}
                        />
                        <p className="text-xs text-muted-foreground">Display name in dropdowns</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={exam.name}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="exam_type">Exam Type *</Label>
                        <select
                            id="exam_type"
                            name="exam_type"
                            defaultValue={exam.exam_type}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="board">Board Exam (CBSE, MBSE, State Boards)</option>
                            <option value="entrance">Entrance Exam (JEE, NEET, CUET)</option>
                            <option value="competitive">Competitive Exam (UPSC, SSC, Banking)</option>
                            <option value="professional">Professional (CA, CS, Medical)</option>
                            <option value="university">University (College/University exams)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parent_id">Parent Exam (Optional)</Label>
                        <select
                            id="parent_id"
                            name="parent_id"
                            defaultValue={exam.parent_id || ""}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="">None (Top-level exam)</option>
                            {parentExams.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.code} - {e.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        name="description"
                        defaultValue={exam.description || ""}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                            id="display_order"
                            name="display_order"
                            type="number"
                            defaultValue={exam.display_order}
                            min="0"
                        />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                        <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            defaultChecked={exam.is_active}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <Link href="/admin/exams" className="flex-1">
                        <Button type="button" variant="outline" className="w-full">Cancel</Button>
                    </Link>
                    <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                        Update Exam Category
                    </Button>
                </div>
            </form>
        </div>
    );
}
