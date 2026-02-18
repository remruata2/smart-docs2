import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, BookOpen } from "lucide-react";
import Link from "next/link";

interface HeroResumeCardProps {
    subject: string;
    chapter: string;
    lastScore: number;
    quizId: string;
}

export function HeroResumeCard({ subject, chapter, lastScore, quizId }: HeroResumeCardProps) {
    return (
        <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl" />

            <CardContent className="p-6 md:p-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium uppercase tracking-wider">
                            <BookOpen className="w-4 h-4" />
                            Resume Learning
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                            Continue: {subject}
                        </h2>
                        <p className="text-indigo-100 text-lg">
                            {chapter}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                Last Mock Test: {lastScore}%
                            </span>
                        </div>
                    </div>

                    <div className="w-full md:w-auto">
                        <Link href={`/app/practice/${quizId}`}>
                            <Button
                                size="lg"
                                className="w-full md:w-auto bg-white text-indigo-600 hover:bg-indigo-50 font-bold shadow-xl transition-all hover:scale-105"
                            >
                                <Play className="w-5 h-5 mr-2 fill-current" />
                                Resume Session
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
