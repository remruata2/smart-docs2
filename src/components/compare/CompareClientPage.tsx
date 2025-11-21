"use client";

import React, { useState } from "react";
import { FileCard } from "./FileCard";
import { ComparisonView } from "./ComparisonView";
import { compareFilesAction } from "@/app/actions/compare";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompareClientPageProps {
    files: Array<{
        id: number;
        title: string;
        category: string;
        entry_date: string | null;
    }>;
}

export default function CompareClientPage({ files }: CompareClientPageProps) {
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonResult, setComparisonResult] = useState<any>(null);

    const toggleFile = (id: number) => {
        if (selectedFiles.includes(id)) {
            setSelectedFiles(prev => prev.filter(f => f !== id));
        } else {
            if (selectedFiles.length >= 2) {
                toast.error("You can only compare 2 files at a time");
                return;
            }
            setSelectedFiles(prev => [...prev, id]);
        }
    };

    const startComparison = async () => {
        if (selectedFiles.length !== 2) return;

        setIsComparing(true);
        try {
            const result = await compareFilesAction(selectedFiles[0], selectedFiles[1]);

            if (result.success) {
                setComparisonResult(result.data);
            } else {
                toast.error("Comparison failed: " + result.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
            console.error(error);
        } finally {
            setIsComparing(false);
        }
    };

    if (comparisonResult) {
        return (
            <ComparisonView
                docA={comparisonResult.docA}
                docB={comparisonResult.docB}
                diffData={comparisonResult}
                onBack={() => setComparisonResult(null)}
            />
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Compare Documents</h1>
                    <p className="text-gray-500 mt-2">Select two documents to analyze differences, risks, and changes.</p>
                </div>

                <button
                    disabled={selectedFiles.length !== 2 || isComparing}
                    onClick={startComparison}
                    className={`
            flex items-center px-6 py-3 rounded-lg font-medium transition-all
            ${selectedFiles.length === 2
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }
          `}
                >
                    {isComparing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>Compare {selectedFiles.length}/2 Files</>
                    )}
                </button>
            </div>

            {/* File Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.map(file => (
                    <FileCard
                        key={file.id}
                        file={file}
                        selected={selectedFiles.includes(file.id)}
                        onToggle={() => toggleFile(file.id)}
                        disabled={selectedFiles.length >= 2 && !selectedFiles.includes(file.id)}
                    />
                ))}
            </div>

            {files.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No documents found. Upload some files to get started.</p>
                </div>
            )}
        </div>
    );
}
