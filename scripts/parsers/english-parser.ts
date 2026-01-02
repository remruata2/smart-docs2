import { ParsedUnit } from './types';

/**
 * Parse English syllabus with Sections A, B, C, D
 */
export function parseEnglishStructure(content: string): ParsedUnit[] {
    const units: ParsedUnit[] = [];
    const lines = content.split('\n');

    let currentSection: ParsedUnit | null = null;
    let chapterOrder = 0;
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect Section headers
        const sectionMatch = line.match(/^Section\s+([A-D])\s*[:–-]?\s*(.*)/i) ||
            line.match(/^SECTION\s*[–-]\s*([A-D])\s*[:–-]?\s*(.*)/i);

        if (sectionMatch) {
            if (currentSection) {
                units.push(currentSection);
            }
            sectionOrder++;
            chapterOrder = 0;
            currentSection = {
                title: `Section ${sectionMatch[1]} - ${sectionMatch[2] || 'Content'}`.trim().replace(/-\s*$/, '').trim(),
                order: sectionOrder,
                chapters: [],
            };
        } else if (currentSection && line.length > 0) {
            // Treat significant content as topics within the section
            // English is tricky, usually numbered or specific headers
            if (line.match(/^\d+\./) || line.match(/^[a-z]\)/) || line.match(/^Reading|^Writing|^Grammar|^Literature/i)) {
                chapterOrder++;
                currentSection.chapters.push({
                    title: line.replace(/^\d+\.\s*/, '').trim(),
                    chapter_number: chapterOrder.toString(),
                    order: chapterOrder,
                    subtopics: [],
                });
            }
        }
    }

    if (currentSection) {
        units.push(currentSection);
    }

    // Default fallback
    if (units.length === 0) {
        units.push({
            title: 'Section A - Main Content',
            order: 1,
            chapters: [{
                title: 'English Syllabus Content',
                chapter_number: '1',
                order: 1,
                subtopics: content.split('\n').filter(l => l.trim().length > 0).slice(0, 20),
            }],
        });
    }

    return units;
}
