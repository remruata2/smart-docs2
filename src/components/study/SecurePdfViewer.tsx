"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Square,
    Volume2,
    Loader2,
    FileText,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SecurePdfViewerProps {
    pdfUrl: string;
    title?: string;
    userName?: string;
}

export function SecurePdfViewer({ pdfUrl, title, userName = "Student" }: SecurePdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // TTS State
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [speechRate, setSpeechRate] = useState<number>(1);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>("");
    const [pageText, setPageText] = useState<string>("");
    const [isAutoReading, setIsAutoReading] = useState<boolean>(false);
    const [isFocused, setIsFocused] = useState<boolean>(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isAutoReadingRef = useRef<boolean>(false);
    const [isMouseOver, setIsMouseOver] = useState<boolean>(true);
    const [supportsHover, setSupportsHover] = useState<boolean>(false);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            if (typeof window === "undefined") return;

            // Check for hover support
            setSupportsHover(window.matchMedia("(hover: hover)").matches);

            const availableVoices = window.speechSynthesis.getVoices();
            // Blacklist of macOS novelty/funny voices
            const funnyVoices = [
                "Bubbles", "Boing", "Bells", "Cellos", "Bad News", "Bahh",
                "Albert", "Good News", "Jester", "Organ", "Superstar",
                "Trinoids", "Whisper", "Zarvox", "Pipe Organ", "Hysterical"
            ];

            // Filter for English/Hindi voices and remove funny ones
            const professionalVoices = availableVoices.filter((v) => {
                const isEnglishOrHindi = v.lang.startsWith("en") || v.lang.startsWith("hi");
                const isFunny = funnyVoices.some(funny => v.name.includes(funny));
                return isEnglishOrHindi && !isFunny;
            });

            setVoices(professionalVoices.length > 0 ? professionalVoices : availableVoices);
            if (professionalVoices.length > 0 && !selectedVoice) {
                setSelectedVoice(professionalVoices[0].name);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Security: Prevent right-click and detect focus
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Cmd+C, Ctrl+C, Cmd+P, Ctrl+P
            if (
                (e.metaKey || e.ctrlKey) &&
                (e.key === "c" || e.key === "C" || e.key === "p" || e.key === "P" || e.key === "s" || e.key === "S")
            ) {
                e.preventDefault();
                setIsFocused(false); // Trigger blur protection on shortcut attempt
                return false;
            }
            // Block PrintScreen and other common capture shortcuts
            if (e.key === "PrintScreen" || (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === "4" || e.key === "3" || e.key === "5"))) {
                setIsFocused(false);
                return false;
            }
        };

        const handleBlur = () => setIsFocused(false);
        const handleFocus = () => setIsFocused(true);

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const onDocumentLoadError = (err: Error) => {
        console.error("PDF load error:", err);
        setError("Failed to load PDF. Please try again later.");
        setLoading(false);
    };

    // Extract text from current page for TTS
    const extractPageText = useCallback(async () => {
        if (!pdfUrl) return;

        try {
            const loadingTask = pdfjs.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const text = textContent.items
                .map((item: any) => item.str)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
            setPageText(text);
        } catch (err) {
            console.error("Text extraction error:", err);
            setPageText("");
        }
    }, [pdfUrl, pageNumber]);

    useEffect(() => {
        extractPageText();
    }, [extractPageText]);

    // TTS Controls
    const speakText = useCallback((text: string) => {
        if (!text) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;

        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            // Check if we should auto-advance to next page
            if (isAutoReadingRef.current) {
                setPageNumber((currentPage) => {
                    if (currentPage < numPages) {
                        return currentPage + 1;
                    } else {
                        // Reached last page, stop auto-reading
                        setIsAutoReading(false);
                        isAutoReadingRef.current = false;
                        setIsSpeaking(false);
                        setIsPaused(false);
                        return currentPage;
                    }
                });
            } else {
                setIsSpeaking(false);
                setIsPaused(false);
            }
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            setIsAutoReading(false);
            isAutoReadingRef.current = false;
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
        setIsPaused(false);
    }, [speechRate, selectedVoice, voices, numPages]);

    const startSpeaking = () => {
        if (!pageText) return;
        setIsAutoReading(true);
        isAutoReadingRef.current = true;
        speakText(pageText);
    };

    const pauseSpeaking = () => {
        window.speechSynthesis.pause();
        setIsPaused(true);
    };

    const resumeSpeaking = () => {
        window.speechSynthesis.resume();
        setIsPaused(false);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setIsAutoReading(false);
        isAutoReadingRef.current = false;
    };

    // Auto-speak when page changes during auto-read mode
    useEffect(() => {
        if (isAutoReading && pageText && isSpeaking) {
            // Small delay to ensure text is extracted
            const timer = setTimeout(() => {
                if (isAutoReadingRef.current) {
                    speakText(pageText);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pageNumber, pageText, isAutoReading, isSpeaking, speakText]);

    // Navigation
    const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
    const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

    // Zoom
    const zoomIn = () => setScale((s) => Math.min(2.5, s + 0.25));
    const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
    const resetZoom = () => setScale(1.0);

    if (error) {
        return (
            <Card className="border-none shadow-xl">
                <CardContent className="py-20 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Unable to Load PDF</h3>
                    <p className="text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-card overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {title || "Chapter Textbook"}
                    </CardTitle>

                    {/* TTS Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            {!isSpeaking ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={startSpeaking}
                                    disabled={!pageText}
                                    className="gap-1"
                                >
                                    <Play className="w-4 h-4" />
                                    Read Aloud
                                </Button>
                            ) : (
                                <>
                                    {isPaused ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={resumeSpeaking}
                                        >
                                            <Play className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={pauseSpeaking}
                                        >
                                            <Pause className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={stopSpeaking}>
                                        <Square className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Speed Control */}
                        <Select
                            value={speechRate.toString()}
                            onValueChange={(v) => setSpeechRate(parseFloat(v))}
                        >
                            <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.5">0.5x</SelectItem>
                                <SelectItem value="0.75">0.75x</SelectItem>
                                <SelectItem value="1">1x</SelectItem>
                                <SelectItem value="1.25">1.25x</SelectItem>
                                <SelectItem value="1.5">1.5x</SelectItem>
                                <SelectItem value="2">2x</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Voice Selection */}
                        {voices.length > 0 && (
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                                <SelectTrigger className="w-32 h-8">
                                    <Volume2 className="w-3 h-3 mr-1" />
                                    <SelectValue placeholder="Voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {voices.map((voice) => (
                                        <SelectItem key={voice.name} value={voice.name}>
                                            {voice.name.split(" ")[0]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b">
                    {/* Pagination */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPrevPage}
                            disabled={pageNumber <= 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[80px] text-center">
                            {pageNumber} / {numPages || "..."}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPage}
                            disabled={pageNumber >= numPages}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={zoomOut}>
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-sm min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <Button variant="outline" size="sm" onClick={zoomIn}>
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={resetZoom}>
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    onMouseEnter={() => setIsMouseOver(true)}
                    onMouseLeave={() => setIsMouseOver(false)}
                    className="relative overflow-auto bg-gray-100 dark:bg-gray-900 transition-all duration-300"
                    style={{
                        height: "calc(100vh - 300px)",
                        minHeight: "500px",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        filter: (isFocused && (!supportsHover || isMouseOver)) ? "none" : "blur(20px)",
                    }}
                >
                    {/* Security Styles - Prevents Printing & Selection */}
                    <style jsx global>{`
                        @media print {
                            .no-print {
                                display: none !important;
                            }
                            canvas, .react-pdf__Page, .react-pdf__Document, .watermark {
                                display: none !important;
                            }
                        }
                        .react-pdf__Page__textContent, .react-pdf__Page__annotations {
                            user-select: none !important;
                            pointer-events: none !important;
                        }
                    `}</style>

                    {/* Dynamic Watermark Layer */}
                    <div className="watermark absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-[0.01] select-none flex flex-wrap justify-center items-center gap-20 py-20">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="text-4xl font-bold -rotate-45 whitespace-nowrap uppercase tracking-widest">
                                {userName} - PRIVATE - {userName}
                            </div>
                        ))}
                    </div>
                    {/* Security Overlay - prevents easy selection */}
                    <div
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{ mixBlendMode: "normal" }}
                    />

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    <div className="flex justify-center p-4">
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={null}
                            className="shadow-xl"
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="bg-white"
                            />
                        </Document>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
