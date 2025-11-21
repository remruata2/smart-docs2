import React from "react";
import { FileText, CheckCircle } from "lucide-react";

interface FileCardProps {
    file: {
        id: number;
        title: string;
        entry_date?: string | null;
        category: string;
    };
    selected: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export function FileCard({ file, selected, onToggle, disabled }: FileCardProps) {
    return (
        <div
            onClick={() => !disabled && onToggle()}
            className={`
        relative p-4 border rounded-xl cursor-pointer transition-all duration-200
        ${selected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }
        ${disabled && !selected ? "opacity-50 cursor-not-allowed hover:border-gray-200 hover:shadow-none" : ""}
      `}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${selected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900 line-clamp-1" title={file.title}>
                            {file.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {file.category} • {file.entry_date || "No date"}
                        </p>
                    </div>
                </div>

                <div className={`
          w-6 h-6 rounded-full border flex items-center justify-center transition-colors
          ${selected
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-gray-300 text-transparent"
                    }
        `}>
                    <CheckCircle className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
