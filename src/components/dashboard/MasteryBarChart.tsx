"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CourseMastery {
    courseId: string;
    courseTitle: string;
    mastery: number;
    subjects: {
        id: number;
        name: string;
        score: number;
    }[];
}

interface MasteryBarChartProps {
    data: CourseMastery[];
}

export function MasteryBarChart({ data }: MasteryBarChartProps) {
    const [selectedCourse, setSelectedCourse] = useState<CourseMastery | null>(null);

    // Initial view: Course mastery
    const chartData = selectedCourse
        ? selectedCourse.subjects.map(s => ({ name: s.name, score: s.score }))
        : data.map(c => ({ name: c.courseTitle, score: c.mastery, raw: c }));

    const handleBarClick = (entry: any) => {
        if (!selectedCourse && entry.raw) {
            setSelectedCourse(entry.raw);
        }
    };

    return (
        <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-base font-semibold text-gray-800">
                        {selectedCourse ? `Subject Mastery: ${selectedCourse.courseTitle}` : "Exam Readiness by Course"}
                    </CardTitle>
                </div>
                {selectedCourse && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCourse(null)}
                        className="h-8 text-xs gap-1 hover:text-indigo-600"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Courses
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-6">
                <div className={`${selectedCourse ? 'h-[400px]' : 'h-[300px]'} w-full`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            onClick={(data) => {
                                if (data && data.activeLabel) {
                                    const entry = chartData.find(d => d.name === data.activeLabel);
                                    if (entry) handleBarClick(entry);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                domain={[0, 100]}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
                                width={95}
                            />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="score"
                                radius={[0, 6, 6, 0]}
                                barSize={24}
                                className="cursor-pointer"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={selectedCourse ? '#8b5cf6' : '#6366f1'}
                                        className="hover:opacity-80 transition-opacity"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {!selectedCourse && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Click on a course bar to see subject-level mastery
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
