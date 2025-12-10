"use client";

import dynamic from "next/dynamic";

const PerformanceRadarChart = dynamic(
    () => import("./PerformanceRadarChart").then((mod) => mod.PerformanceRadarChart),
    { ssr: false }
);

interface RadarChartWrapperProps {
    data: any[];
}

export function RadarChartWrapper({ data }: RadarChartWrapperProps) {
    return <PerformanceRadarChart data={data} />;
}
