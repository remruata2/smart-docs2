'use client';

import { ArrowLeft, CheckCircle2, XCircle, Info, User, Calendar, Award } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pageContainer, pageTitle } from '@/styles/ui-classes';

export type QuestionData = {
    id: string;
    question_text: string;
    options: any;
    correct_answer: any;
    user_answer: any;
    is_correct: boolean | null;
    explanation: string | null;
    points: number;
};

export type MockTestDetailData = {
    id: string;
    title: string;
    status: string;
    score: number;
    total_points: number;
    created_at: string;
    user: {
        username: string;
        name: string | null;
    };
    subject: {
        name: string;
    };
    questions: QuestionData[];
};

interface MockTestDetailClientProps {
    test: MockTestDetailData;
}

export default function MockTestDetailClient({ test }: MockTestDetailClientProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const scorePercentage = test.total_points > 0
        ? Math.round((test.score / test.total_points) * 100)
        : 0;

    return (
        <div className={pageContainer}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Award className="h-5 w-5 text-indigo-500" />
                            {test.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Subject</p>
                                <p className="text-sm font-semibold">{test.subject.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                                <Badge
                                    className={
                                        test.status === 'COMPLETED'
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    }
                                >
                                    {test.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Score</p>
                                <p className="text-sm font-bold text-indigo-600">
                                    {test.score} / {test.total_points} ({scorePercentage}%)
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
                                <p className="text-sm">{formatDate(test.created_at)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            Student Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">{test.user.name || test.user.username}</p>
                            <p className="text-xs text-gray-500">@{test.user.username}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Link
                                href={`/admin/users/${test.user.username}`}
                                className="text-xs text-indigo-600 hover:underline font-medium"
                            >
                                View Full Profile
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-indigo-500 pl-3">
                    Question Review
                </h2>

                {test.questions.length === 0 && (
                    <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 border border-dashed">
                        No question data available for this test.
                    </div>
                )}

                {test.questions.map((q, index) => {
                    const isCorrect = q.is_correct === true;
                    const isPartial = q.is_correct === null && q.user_answer !== null; // Handle null edge cases

                    return (
                        <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div className="flex gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                                            {index + 1}
                                        </span>
                                        <p className="text-lg font-medium text-gray-900 pt-0.5">{q.question_text}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {isCorrect ? (
                                            <Badge className="bg-green-100 text-green-800 border-green-200 flex gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Correct
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-800 border-red-200 flex gap-1">
                                                <XCircle className="h-3 w-3" /> Incorrect
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">Student Answer</p>
                                        <p className={`text-sm ${isCorrect ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}`}>
                                            {q.user_answer ? JSON.stringify(q.user_answer).replace(/"/g, '') : <span className="italic text-gray-400">No Answer</span>}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded-md border border-indigo-100">
                                        <p className="text-xs text-indigo-500 font-bold uppercase mb-2">Correct Answer</p>
                                        <p className="text-sm text-indigo-900 font-semibold">
                                            {q.correct_answer ? JSON.stringify(q.correct_answer).replace(/"/g, '') : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {q.explanation && (
                                    <div className="mt-4 ml-11 p-3 bg-blue-50/50 rounded-md border border-blue-100 flex gap-3">
                                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-blue-500 font-bold uppercase mb-1">Explanation</p>
                                            <p className="text-sm text-gray-700">{q.explanation}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
