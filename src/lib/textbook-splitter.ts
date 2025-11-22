/**
 * Smart Textbook Splitter
 * Automatically detects chapter boundaries in textbook PDFs
 */

export interface DetectedChapter {
    id: string; // Temporary ID for UI
    title: string;
    startPage: number;
    endPage: number;
    content: string; // Markdown content for this chapter
    previewText: string; // First 200 chars for preview
    chapterNumber: number | null;
}

export interface LlamaParsePageResult {
    page: number;
    text: string;
    md: string;
    width?: number;
    height?: number;
    items?: any;
}

export class TextbookSplitter {
    /**
     * Detect chapters from LlamaParse page results
     */
    static async detectChapters(
        pages: LlamaParsePageResult[]
    ): Promise<DetectedChapter[]> {
        const detectedChapters: DetectedChapter[] = [];
        const chapterBoundaries: Array<{ page: number; title: string; chapterNum: number | null }> = [];

        let lastDetectedChapterNum: number | null = null;

        // 1. Find chapter boundaries by analyzing text patterns
        for (const page of pages) {
            const text = page.text || page.md || '';
            const chapterMatch = this.findChapterMarker(text);

            if (chapterMatch) {
                // Only accept this as a new chapter if:
                // - It's the first chapter we've seen, OR
                // - The chapter number is greater than the last one we detected
                const shouldAccept =
                    lastDetectedChapterNum === null ||
                    (chapterMatch.number !== null && chapterMatch.number > lastDetectedChapterNum);

                if (shouldAccept) {
                    chapterBoundaries.push({
                        page: page.page,
                        title: chapterMatch.title,
                        chapterNum: chapterMatch.number
                    });
                    lastDetectedChapterNum = chapterMatch.number;
                }
            }
        }

        // If no chapters detected, treat entire book as one chapter
        if (chapterBoundaries.length === 0) {
            return [{
                id: `detected-chapter-1`,
                title: 'Complete Textbook',
                startPage: pages[0]?.page || 1,
                endPage: pages[pages.length - 1]?.page || pages.length,
                content: pages.map(p => p.md || p.text).join('\n\n'),
                previewText: this.extractPreview(pages[0]?.md || pages[0]?.text || ''),
                chapterNumber: null
            }];
        }

        // 2. Create chapter objects from boundaries
        for (let i = 0; i < chapterBoundaries.length; i++) {
            const boundary = chapterBoundaries[i];
            const nextBoundary = chapterBoundaries[i + 1];

            const startPage = boundary.page;
            const endPage = nextBoundary ? nextBoundary.page - 1 : pages[pages.length - 1].page;

            // Extract pages for this chapter
            const chapterPages = pages.filter(p => p.page >= startPage && p.page <= endPage);
            const content = chapterPages.map(p => p.md || p.text).join('\n\n');

            detectedChapters.push({
                id: `detected-chapter-${i + 1}`,
                title: boundary.title,
                startPage,
                endPage,
                content,
                previewText: this.extractPreview(content),
                chapterNumber: boundary.chapterNum
            });
        }

        return detectedChapters;
    }

    /**
     * Find chapter markers in text using regex patterns
     */
    private static findChapterMarker(text: string): { title: string; number: number | null } | null {
        // Clean text to remove extra whitespace
        const cleanText = text.trim();

        // Pattern 1: Multi-line format - "Chapter 1" on one line, "Title" on next line
        // This handles textbooks where chapter number and title are on separate lines (opening pages)
        const multiLinePattern = /^(?:Chapter|CHAPTER|Ch\.?)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|[IVX]+)\s*\n\s*([A-Z][^\n]{3,100})/i;
        const multiLineMatch = cleanText.match(multiLinePattern);
        if (multiLineMatch) {
            const chapterNum = this.parseChapterNumber(multiLineMatch[1]);
            let title = multiLineMatch[2].trim();

            // Skip if title looks like it's just a page header variant (e.g., "INTRODUCTION 2")
            if (/^[A-Z\s]+\d+$/.test(title)) {
                return null;
            }

            title = title.replace(/\s+/g, ' ').trim();
            if (title.length > 100) {
                title = title.substring(0, 97) + '...';
            }

            return { title, number: chapterNum };
        }

        // Pattern 2: Single-line ONLY if at start of text with LOTS of content after
        // This avoids matching page headers which are typically short/isolated
        // Must have at least 200 characters of content after the chapter line
        const singleLinePattern = /^(?:Chapter|CHAPTER|Ch\.?)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|[IVX]+)\s*[:\.\-–—\s]+\s*([A-Z][^\n]{3,100})\n([\s\S]{200,})/i;
        const singleLineMatch = cleanText.match(singleLinePattern);
        if (singleLineMatch) {
            const chapterNum = this.parseChapterNumber(singleLineMatch[1]);
            let title = singleLineMatch[2]?.trim() || '';

            // Skip if title looks like a sequential header (e.g., "INTRODUCTION 2", "INTRODUCTION 3")
            if (/^[A-Z\s]+\d+$/.test(title)) {
                return null;
            }

            if (!title || title.length < 3) {
                title = `Chapter ${chapterNum || singleLineMatch[1]}`;
            }

            title = title.replace(/\s+/g, ' ').trim();
            if (title.length > 100) {
                title = title.substring(0, 97) + '...';
            }

            return { title, number: chapterNum };
        }

        // Pattern 3: "Unit X: Title" with content requirement
        const unitPattern = /^(?:Unit|UNIT)\s+(\d+)\s*[:–-]\s*(.+?)\n([\s\S]{200,})/i;
        const unitMatch = cleanText.match(unitPattern);
        if (unitMatch) {
            const chapterNum = this.parseChapterNumber(unitMatch[1]);
            let title = unitMatch[2]?.trim() || '';

            title = title.replace(/\s+/g, ' ').trim();
            if (title.length > 100) {
                title = title.substring(0, 97) + '...';
            }

            return { title, number: chapterNum };
        }

        // Pattern 4: "CHAPTER X" standalone - but only if followed by substantial content
        const standalonePattern = /^(?:CHAPTER|Chapter)\s+(\d+|[IVX]+)\s*\n([\s\S]{200,})/i;
        const standaloneMatch = cleanText.match(standalonePattern);
        if (standaloneMatch) {
            const chapterNum = this.parseChapterNumber(standaloneMatch[1]);
            const title = `Chapter ${chapterNum || standaloneMatch[1]}`;

            return { title, number: chapterNum };
        }

        return null;
    }

    /**
     * Parse chapter number from string (handles digits, words, roman numerals)
     */
    private static parseChapterNumber(str: string): number | null {
        // Try digit first
        const digitMatch = str.match(/\d+/);
        if (digitMatch) {
            return parseInt(digitMatch[0]);
        }

        // Word to number
        const wordToNum: Record<string, number> = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        const word = str.toLowerCase();
        if (wordToNum[word]) {
            return wordToNum[word];
        }

        // Roman numerals
        const romanMatch = str.match(/^[IVX]+$/i);
        if (romanMatch) {
            return this.romanToInt(romanMatch[0].toUpperCase());
        }

        return null;
    }

    /**
     * Convert roman numerals to integer
     */
    private static romanToInt(s: string): number {
        const roman: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
        let result = 0;

        for (let i = 0; i < s.length; i++) {
            const current = roman[s[i]];
            const next = roman[s[i + 1]];

            if (next && current < next) {
                result -= current;
            } else {
                result += current;
            }
        }

        return result;
    }

    /**
     * Extract preview text (first 200 chars)
     */
    private static extractPreview(content: string): string {
        // Remove markdown formatting for preview
        const plainText = content
            .replace(/#+\s/g, '') // Remove headers
            .replace(/\*\*/g, '') // Remove bold
            .replace(/\*/g, '') // Remove italic
            .replace(/\n+/g, ' ') // Replace newlines with space
            .trim();

        return plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
    }

    /**
     * Merge two adjacent chapters
     */
    static mergeChapters(
        chapter1: DetectedChapter,
        chapter2: DetectedChapter
    ): DetectedChapter {
        return {
            id: chapter1.id,
            title: `${chapter1.title} & ${chapter2.title}`,
            startPage: chapter1.startPage,
            endPage: chapter2.endPage,
            content: `${chapter1.content}\n\n${chapter2.content}`,
            previewText: this.extractPreview(`${chapter1.content}\n\n${chapter2.content}`),
            chapterNumber: chapter1.chapterNumber
        };
    }

    /**
     * Split a chapter at a specific page
     */
    static splitChapter(
        chapter: DetectedChapter,
        splitAtPage: number,
        pages: LlamaParsePageResult[]
    ): [DetectedChapter, DetectedChapter] {
        const part1Pages = pages.filter(p => p.page >= chapter.startPage && p.page < splitAtPage);
        const part2Pages = pages.filter(p => p.page >= splitAtPage && p.page <= chapter.endPage);

        const part1Content = part1Pages.map(p => p.md || p.text).join('\n\n');
        const part2Content = part2Pages.map(p => p.md || p.text).join('\n\n');

        return [
            {
                id: `${chapter.id}-part1`,
                title: `${chapter.title} (Part 1)`,
                startPage: chapter.startPage,
                endPage: splitAtPage - 1,
                content: part1Content,
                previewText: this.extractPreview(part1Content),
                chapterNumber: chapter.chapterNumber
            },
            {
                id: `${chapter.id}-part2`,
                title: `${chapter.title} (Part 2)`,
                startPage: splitAtPage,
                endPage: chapter.endPage,
                content: part2Content,
                previewText: this.extractPreview(part2Content),
                chapterNumber: chapter.chapterNumber ? chapter.chapterNumber + 1 : null
            }
        ];
    }
}
