"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MindMapViewerProps {
    mermaidSyntax: string;
}

export function MindMapViewer({ mermaidSyntax }: MindMapViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !mermaidSyntax) return;

        mermaid.initialize({
            startOnLoad: false,
            theme: "default",
            securityLevel: "loose",
            logLevel: "error",
            fontFamily: "inherit"
        });

        const renderDiagram = async () => {
            try {
                // Use a unique ID for the diagram to prevent conflicts
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, mermaidSyntax);
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            } catch (error) {
                console.error("Error rendering diagram:", error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <p class="mb-2 font-semibold text-red-500">Failed to render diagram</p>
                            <p class="text-sm">The AI-generated diagram syntax was invalid.</p>
                            <p class="text-xs text-muted-foreground mt-1">Try regenerating study materials to fix this.</p>
                            <details class="mt-4 text-xs text-left w-full bg-muted p-2 rounded">
                                <summary class="cursor-pointer mb-2">View Syntax</summary>
                                <pre class="whitespace-pre-wrap">${mermaidSyntax}</pre>
                            </details>
                        </div>
                    `;
                }
            }
        };

        renderDiagram();
    }, [mermaidSyntax]);

    if (!mermaidSyntax) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No diagram available
            </div>
        );
    }

    return (
        <div className="flex justify-center w-full h-full">
            <div ref={containerRef} className="w-full h-full flex justify-center items-center" />
        </div>
    );
}
