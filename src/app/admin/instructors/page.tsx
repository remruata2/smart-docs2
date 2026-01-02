import { getInstructors } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, BookOpen, Mail, ExternalLink } from "lucide-react";

export default async function InstructorsAdminPage() {
    const instructors = await getInstructors();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Instructors</h1>
                    <p className="text-gray-500">Manage course instructors and their profiles</p>
                </div>
                <Link href="/admin/instructors/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Instructor
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructors.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="py-12 text-center text-gray-500">
                            No instructors added yet. Click "Add Instructor" to get started.
                        </CardContent>
                    </Card>
                ) : (
                    instructors.map((instructor) => (
                        <Card key={instructor.id} className="hover:shadow-md transition-shadow overflow-hidden">
                            <CardHeader className="pb-2 border-b">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline">{instructor.title || "Instructor"}</Badge>
                                    <Badge variant="secondary">{instructor._count.courses} Courses</Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                        {instructor.user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{instructor.user.username}</CardTitle>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {instructor.user.email}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-gray-600 text-sm line-clamp-3 mb-4 h-12">
                                    {instructor.bio || "No bio provided."}
                                </p>

                                <div className="flex gap-2">
                                    <Link href={`/admin/instructors/${instructor.id}`} className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            Edit Profile
                                        </Button>
                                    </Link>
                                    <Link href={`/instructor/dashboard`} className="px-3">
                                        <Button variant="ghost" size="icon" title="View Dashboard">
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
