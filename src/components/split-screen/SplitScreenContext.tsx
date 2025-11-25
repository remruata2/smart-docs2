import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CitationData {
    imageUrl: string;
    boundingBox?: number[];
    pageNumber: number;
    layoutItems?: Array<{ text: string; bbox: number[] }>; // For fuzzy matching
    title?: string; // File title/name
    chapterId?: number; // Optional chapter ID for context
}

interface SplitScreenContextType {
    isOpen: boolean;
    citationData: CitationData | null;
    openCitation: (data: CitationData) => void;
    closeCitation: () => void;
}

const SplitScreenContext = createContext<SplitScreenContextType | undefined>(undefined);

export function SplitScreenProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [citationData, setCitationData] = useState<CitationData | null>(null);

    const openCitation = (data: CitationData) => {
        setCitationData(data);
        setIsOpen(true);
    };

    const closeCitation = () => {
        setIsOpen(false);
        setCitationData(null);
    };

    return (
        <SplitScreenContext.Provider value={{ isOpen, citationData, openCitation, closeCitation }}>
            {children}
        </SplitScreenContext.Provider>
    );
}

export function useSplitScreen() {
    const context = useContext(SplitScreenContext);
    if (context === undefined) {
        throw new Error('useSplitScreen must be used within a SplitScreenProvider');
    }
    return context;
}
