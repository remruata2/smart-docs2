import { getSubjectsForUserProgram } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, FileText } from "lucide-react";

export default async function SubjectsPage() {
    const data = await getSubjectsForUserProgram();

    // If user has no program selected, redirect to onboarding
    if (!data) {
        redirect("/app/onboarding");
    }

    const { subjects, programInfo } = data;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
                        <p className="text-gray-600">
                            {programInfo.program.name} • {programInfo.board.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Subject List */}
            {subjects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Subjects Available
                        </h3>
                        <p className="text-gray-600">
                            No subjects have been added to your program yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <Link
                            key={subject.id}
                            href={`/app/chapters?subjectId=${subject.id}`}
                        >
                            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full group">
                                <CardHeader>
                                    <CardTitle className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                                                {subject.name}
                                            </h3>
                                            {subject.code && (
                                                <Badge variant="outline" className="mt-2">
                                                    {subject.code}
                                                </Badge>
                                            )}
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FileText className="h-4 w-4" />
                                        <span>
                                            {subject._count.chapters}{" "}
                                            {subject._count.chapters === 1 ? "chapter" : "chapters"}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
