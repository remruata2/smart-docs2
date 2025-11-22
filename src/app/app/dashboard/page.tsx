import { getUserProfile } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen,
    MessageSquare,
    Upload,
    GraduationCap,
    Building2,
    LayoutDashboard
} from "lucide-react";

export default async function DashboardPage() {
    const profileData = await getUserProfile();

    // If user has no program selected, redirect to onboarding
    if (!profileData?.profile?.program) {
        redirect("/app/onboarding");
    }

    const { profile, stats } = profileData;
    const program = profile.program;
    const institution = profile.institution;
    const board = program.board;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-600">Welcome back to your learning hub</p>
                    </div>
                </div>

                {/* Program Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Your Program
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={board.type === "academic" ? "default" : board.type === "competitive_exam" ? "destructive" : "secondary"}
                                    className="text-sm"
                                >
                                    {board.name}
                                </Badge>
                                <span className="text-sm text-gray-500">{board.country_id}</span>
                            </div>

                            {institution && (
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Building2 className="h-4 w-4" />
                                    <span>{institution.name}</span>
                                    <Badge variant="outline" className="ml-2">{institution.type}</Badge>
                                </div>
                            )}

                            <div>
                                <p className="text-lg font-semibold text-gray-900">{program.name}</p>
                                {program.code && (
                                    <p className="text-sm text-gray-500">Code: {program.code}</p>
                                )}
                                {program.level && (
                                    <Badge variant="outline" className="mt-1 capitalize">{program.level}</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Subjects</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.subjectCount}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Available in your program</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Chapters</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.chapterCount}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <BookOpen className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Total study materials</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Conversations</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.conversationCount}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <MessageSquare className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Chat history</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/app/subjects">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Browse Subjects</p>
                                        <p className="text-sm text-gray-500">Explore your subjects</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/app/chat">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <MessageSquare className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Start Chat</p>
                                        <p className="text-sm text-gray-500">Ask AI questions</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/app/files">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-100 rounded-lg">
                                        <Upload className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">My Notes</p>
                                        <p className="text-sm text-gray-500">Upload & manage files</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}
