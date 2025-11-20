import React from 'react';
import { useSplitScreen } from './SplitScreenContext';
import { EvidenceViewer } from './EvidenceViewer';

export function SplitScreenLayout({ children }: { children: React.ReactNode }) {
    const { isOpen, citationData, closeCitation } = useSplitScreen();

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Main Chat Area - shrinks when evidence is open */}
            <div className={`flex-1 h-full transition-all duration-300 ease-in-out ${isOpen ? 'w-1/2' : 'w-full'}`}>
                {children}
            </div>

            {/* Evidence Viewer Pane - slides in */}
            <div
                className={`h-full transition-all duration-300 ease-in-out border-l border-gray-200 bg-gray-50 shadow-xl
          ${isOpen ? 'w-1/2 translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0 overflow-hidden'}
        `}
            >
                {isOpen && citationData && (
                    <EvidenceViewer
                        imageUrl={citationData.imageUrl}
                        boundingBox={citationData.boundingBox}
                        pageNumber={citationData.pageNumber}
                        onClose={closeCitation}
                        layoutItems={citationData.layoutItems}
                        chunkContent={citationData.chunkContent}
                        title={citationData.title}
                    />
                )}
            </div>
        </div>
    );
}
