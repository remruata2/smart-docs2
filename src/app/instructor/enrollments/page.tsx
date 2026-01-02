import { getInstructorEnrollments } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Book } from "lucide-react";

export default async function InstructorEnrollmentsPage() {
    const enrollments = await getInstructorEnrollments();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Students</h1>
                <p className="text-gray-500">Track all students enrolled in your courses.</p>
            </div>

            <Card className="bg-white border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Student List</CardTitle>
                </CardHeader>
                <CardContent>
                    {enrollments.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 italic">
                            No students enrolled yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="font-semibold text-gray-900">Student</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                                        <TableHead className="font-semibold text-gray-900">Course</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">Enrollment Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enrollments.map((enrollment) => (
                                        <TableRow key={enrollment.id} className="hover:bg-gray-50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                        {enrollment.user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{enrollment.user.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {enrollment.user.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-gray-900">
                                                    <Book className="h-3.5 w-3.5 text-indigo-600" />
                                                    {enrollment.course.title}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-gray-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(enrollment.enrolled_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
