"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
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

interface ChartDataEntry {
    name: string;
    score: number;
    id: string;
    type: 'course' | 'subject' | 'chapter';
    subjects?: any[];
    chapters?: any[];
}

interface MasteryBarChartProps {
    data: CourseMastery[];
}

export function MasteryBarChart({ data }: MasteryBarChartProps) {
    const [selectedCourse, setSelectedCourse] = useState<ChartDataEntry | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<ChartDataEntry | null>(null);

    const handleBarClick = (entry: ChartDataEntry) => {
        if (entry.type === 'course') {
            setSelectedCourse(entry);
        } else if (entry.type === 'subject') {
            setSelectedSubject(entry);
        }
    };

    const handleBack = () => {
        if (selectedSubject) {
            setSelectedSubject(null);
        } else {
            setSelectedCourse(null);
        }
    };

    const getChartData = () => {
        if (selectedSubject) {
            return (selectedSubject.chapters || []).map(c => ({
                id: c.id,
                name: c.name,
                score: c.score,
                type: 'chapter'
            }));
        }
        if (selectedCourse) {
            return (selectedCourse.subjects || []).map(s => ({
                id: s.id,
                name: s.name,
                score: s.score,
                type: 'subject',
                chapters: s.chapters
            }));
        }
        return data.map(c => ({
            id: c.courseId,
            name: c.courseTitle,
            score: c.mastery,
            type: 'course',
            subjects: c.subjects
        }));
    };

    const chartData = getChartData();
    const title = selectedSubject
        ? `Readiness: ${selectedSubject.name}`
        : selectedCourse
            ? `Readiness: ${selectedCourse.name}`
            : "Exam Readiness by Course";

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    <div>
                        <CardTitle className="text-lg font-bold text-gray-800 tracking-tight">
                            {title}
                        </CardTitle>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            {selectedSubject ? "Chapter Readiness" : selectedCourse ? "Subject Readiness" : "Course Readiness"}
                        </p>
                    </div>
                </div>
                {(selectedCourse || selectedSubject) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className={`${(selectedCourse || selectedSubject) ? 'h-[400px]' : 'h-[300px]'} w-full`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                            onClick={(data) => {
                                if (data && data.activeLabel) {
                                    const entry = chartData.find(d => d.name === data.activeLabel);
                                    if (entry) handleBarClick(entry as ChartDataEntry);
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
                                tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
                                width={120}
                                tickFormatter={(value) => {
                                    if (value.length > 20) return value.substring(0, 18) + "...";
                                    return value;
                                }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="score"
                                radius={[0, 6, 6, 0]}
                                barSize={28}
                                className="cursor-pointer"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={selectedSubject ? '#ec4899' : selectedCourse ? '#8b5cf6' : '#6366f1'}
                                        className="hover:opacity-80 transition-opacity"
                                    />
                                ))}
                                <LabelList
                                    dataKey="score"
                                    position="right"
                                    formatter={(v: any) => `${v}%`}
                                    style={{ fill: '#4b5563', fontSize: 11, fontWeight: 700 }}
                                    offset={10}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {!selectedCourse && !selectedSubject && (
                    <p className="text-center text-[10px] text-gray-400 mt-4 font-medium italic">
                        Click on a course bar to see subject-level mastery
                    </p>
                )}
                {selectedCourse && !selectedSubject && (
                    <p className="text-center text-[10px] text-gray-400 mt-4 font-medium italic">
                        Click on a subject bar to see chapter-level preparedness
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
