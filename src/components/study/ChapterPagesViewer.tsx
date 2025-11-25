"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    ArrowLeft,
    Search,
    X,
    ChevronUp,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize,
    Minimize,
} from "lucide-react";

interface ChapterPage {
    id: bigint | number | string;
    image_url: string;
    page_number: number;
    width?: number | null;
    height?: number | null;
    text_items?: Array<{
        text: string;
        bbox: number[]; // [x, y, w, h] in percentages (0-1)
    }>;
}

interface ChapterPagesViewerProps {
    pages: ChapterPage[];
}

interface SearchResult {
    pageIndex: number;
    pageNumber: number;
    snippet: string;
    matchCount: number;
}

export function ChapterPagesViewer({ pages }: ChapterPagesViewerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Sort pages by page number
    const sortedPages = [...pages].sort((a, b) => a.page_number - b.page_number);

    // Search logic
    const searchResults: SearchResult[] = (() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        sortedPages.forEach((page, index) => {
            if (!page.text_items) return;

            let matchCount = 0;
            let firstMatch = "";

            page.text_items.forEach((item) => {
                const text = item.text.toLowerCase();
                const occurrences = (text.match(new RegExp(query, "g")) || []).length;

                if (occurrences > 0) {
                    matchCount += occurrences;

                    if (!firstMatch) {
                        const idx = text.indexOf(query);
                        const start = Math.max(0, idx - 40);
                        const end = Math.min(item.text.length, idx + query.length + 40);
                        firstMatch = item.text.substring(start, end);
                    }
                }
            });

            if (matchCount > 0) {
                results.push({
                    pageIndex: index,
                    pageNumber: page.page_number,
                    snippet: firstMatch,
                    matchCount
                });
            }
        });

        return results;
    })();

    const handleResultClick = (result: SearchResult) => {
        const pageElement = pageRefs.current.get(result.pageIndex);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setIsSearchOpen(false);
    };

    const clearSearch = () => {
        setSearchQuery("");
    };

    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleResetZoom = () => {
        setZoomLevel(1);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Show/hide back-to-top button based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                const scrolled = containerRef.current.scrollTop > 300;
                setShowBackToTop(scrolled);
            }
        };

        const container = containerRef.current;
        container?.addEventListener("scroll", handleScroll);
        return () => container?.removeEventListener("scroll", handleScroll);
    }, []);

    if (!pages || pages.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No pages available for this chapter.</div>;
    }

    return (
        <div
            ref={containerRef}
            className={`relative bg-gray-100 dark:bg-black overflow-y-auto ${isFullscreen ? "h-screen w-screen" : "h-[85vh]"
                }`}
        >
            {/* Floating Back Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="fixed top-4 left-4 z-50 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
            >
                <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Scrollable Content */}
            <div className="flex items-start justify-center p-4">
                <div
                    className="transition-transform duration-200 ease-out origin-top"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
                >
                    <div className="max-w-4xl mx-auto space-y-2">
                        {sortedPages.map((page, index) => (
                            <div
                                key={page.id}
                                ref={(el) => {
                                    if (el) pageRefs.current.set(index, el);
                                }}
                            >
                                {/* Page Image with Text Overlay */}
                                <div className="relative bg-white shadow-lg">
                                    {page.image_url ? (
                                        <>
                                            <img
                                                src={page.image_url}
                                                alt={`Page ${page.page_number}`}
                                                className="w-full h-auto select-none"
                                                draggable={false}
                                            />
                                            {/* Invisible Text Layer for Selection */}
                                            {page.text_items && (
                                                <div className="absolute inset-0 w-full h-full select-text pointer-events-none">
                                                    {page.text_items.map((item, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                position: "absolute",
                                                                left: `${item.bbox[0] * 100}%`,
                                                                top: `${item.bbox[1] * 100}%`,
                                                                width: `${item.bbox[2] * 100}%`,
                                                                height: `${item.bbox[3] * 100}%`,
                                                                fontSize: "1.8cqw",
                                                                lineHeight: 1,
                                                                color: "transparent",
                                                                cursor: "text",
                                                                whiteSpace: "pre-wrap",
                                                                overflow: "hidden",
                                                                pointerEvents: "auto"
                                                            }}
                                                            className="selection:bg-blue-400/40 selection:text-transparent"
                                                        >
                                                            {item.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-96 bg-muted border-2 border-dashed">
                                            <div className="text-center p-6">
                                                <p className="text-muted-foreground font-medium">Image not available</p>
                                                <p className="text-xs text-muted-foreground/70 mt-1">Page {page.page_number}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Bottom Toolbar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 rounded-full shadow-xl z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={handleZoomOut}
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="text-white text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={handleZoomIn}
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={handleResetZoom}
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-white/20 mx-1"></div>

                {/* Search popover */}
                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20 rounded-full relative"
                        >
                            <Search className="h-4 w-4" />
                            {searchResults.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                    {searchResults.length}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search in this chapter..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-8"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-6 w-6"
                                        onClick={clearSearch}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {searchResults.length === 0 && searchQuery && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No results found
                                </div>
                            )}
                            {searchResults.length === 0 && !searchQuery && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Search across all pages
                                </div>
                            )}
                            {searchResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">
                                            Page {result.pageNumber}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        ...{result.snippet}...
                                    </p>
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="w-px h-4 bg-white/20 mx-1"></div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
            </div>

            {/* Floating Back-to-Top Button */}
            {showBackToTop && (
                <Button
                    onClick={scrollToTop}
                    className="fixed bottom-20 right-6 z-50 h-12 w-12 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white"
                    size="icon"
                >
                    <ChevronUp className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}
