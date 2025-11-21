"use client";

import React, { useState } from "react";
import { EvidenceViewer } from "@/components/split-screen/EvidenceViewer";
import { Badge } from "@/components/ui/badge"; // Assuming you have a Badge component, if not I'll use a simple span
import { ComparisonResult } from "@/lib/comparison-service";
import { cn } from "@/lib/utils"; // Assuming you have cn utility

import { getPageLayout } from "@/app/actions/compare";

interface ComparisonViewProps {
    docA: { id: number; title: string };
    docB: { id: number; title: string };
    diffData: ComparisonResult;
    onBack: () => void;
}

export function ComparisonView({ docA, docB, diffData, onBack }: ComparisonViewProps) {
    const [activeDiff, setActiveDiff] = useState<ComparisonResult["differences"][0] | null>(null);
    const [layoutA, setLayoutA] = useState<any[]>([]);
    const [layoutB, setLayoutB] = useState<any[]>([]);

    // Fetch layout items when activeDiff changes
    React.useEffect(() => {
        if (!activeDiff) return;

        const fetchLayouts = async () => {
            if (activeDiff.page_A) {
                const resA = await getPageLayout(docA.id, activeDiff.page_A);
                if (resA.success) setLayoutA(resA.data || []);
            }
            if (activeDiff.page_B) {
                const resB = await getPageLayout(docB.id, activeDiff.page_B);
                if (resB.success) setLayoutB(resB.data || []);
            }
        };

        fetchLayouts();
    }, [activeDiff, docA.id, docB.id]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col bg-white">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-white">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Comparison Results</h1>
                    <p className="text-sm text-gray-500">{diffData.summary}</p>
                </div>
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Back to Selection
                </button>
            </div>

            {/* Top: The List of Differences (The "Navigator") */}
            <div className="h-1/3 overflow-y-auto border-b bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Severity</th>
                                <th className="px-6 py-3">Clause</th>
                                <th className="px-6 py-3">Analysis</th>
                                <th className="px-6 py-3">Pages</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {diffData.differences.map((diff, i) => (
                                <tr
                                    key={i}
                                    onClick={() => setActiveDiff(diff)}
                                    className={cn(
                                        "cursor-pointer hover:bg-blue-50 transition-colors",
                                        activeDiff === diff ? "bg-blue-50 ring-1 ring-inset ring-blue-500" : ""
                                    )}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                            diff.category === "Critical" ? "bg-red-100 text-red-800" :
                                                diff.category === "Major" ? "bg-orange-100 text-orange-800" :
                                                    diff.category === "Minor" ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-gray-100 text-gray-800"
                                        )}>
                                            {diff.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{diff.clause}</td>
                                    <td className="px-6 py-4 text-gray-500">{diff.implication}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {diff.page_A && diff.page_B ? `P${diff.page_A} vs P${diff.page_B}` : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom: Side-by-Side Evidence */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Doc A */}
                <div className="w-1/2 border-r border-gray-200 flex flex-col relative bg-gray-100/50">
                    <div className="absolute top-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                        Original: {docA.title}
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <EvidenceViewer
                            imageUrl={`/api/files/${docA.id}/pages/${activeDiff?.page_A || 1}`}
                            chunkContent={activeDiff?.docA_content}
                            pageNumber={activeDiff?.page_A || 1}
                            title={docA.title}
                            layoutItems={layoutA}
                        />
                    </div>
                </div>

                {/* Right: Doc B */}
                <div className="w-1/2 flex flex-col relative bg-gray-100/50">
                    <div className="absolute top-4 left-4 z-10 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                        Modified: {docB.title}
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <EvidenceViewer
                            imageUrl={`/api/files/${docB.id}/pages/${activeDiff?.page_B || 1}`}
                            chunkContent={activeDiff?.docB_content}
                            pageNumber={activeDiff?.page_B || 1}
                            title={docB.title}
                            layoutItems={layoutB}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
