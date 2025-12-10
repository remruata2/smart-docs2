"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface PerformanceRadarChartProps {
    data: {
        subject: string;
        score: number;
        fullMark: number;
    }[];
}

export function PerformanceRadarChart({ data }: PerformanceRadarChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>;
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Performance"
                        dataKey="score"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#4c1d95', fontWeight: 600 }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
