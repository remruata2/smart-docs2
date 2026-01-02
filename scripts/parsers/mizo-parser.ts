import { ParsedUnit } from './types';

/**
 * Parse Mizo syllabus with ỊHEN sections
 */
export function parseMizoStructure(content: string): ParsedUnit[] {
    const units: ParsedUnit[] = [];
    const lines = content.split('\n');

    let currentSection: ParsedUnit | null = null;
    let chapterOrder = 0;
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect ỊHEN sections (ỊHEN KHATNA, ỊHEN HNIHNA, etc.) or section headers
        const sectionMatch = line.match(/^ỊHEN\s+(\w+)\s*-?\s*(.*)/i) ||
            line.match(/^([A-Z]+)\s+(?:\d+\.)?(.+)/); // e.g., "FAKNA 1.Ka va ngai"

        // Check for Mizo section types
        const mizoSections = ['FAKNA', 'RAM HMANGAIHNA', 'LENGZEM', 'HMANGAIHNA', 'THUZIAK', 'BIAK', 'TAWNG'];
        const isMizoSection = mizoSections.some(s => line.startsWith(s));

        if (sectionMatch && !isMizoSection) {
            if (currentSection && currentSection.chapters.length > 0) {
                units.push(currentSection);
            }
            sectionOrder++;
            chapterOrder = 0;
            currentSection = {
                title: line,
                order: sectionOrder,
                chapters: [],
            };
        } else if (isMizoSection) {
            if (currentSection && currentSection.chapters.length > 0) {
                units.push(currentSection);
            }
            sectionOrder++;
            chapterOrder = 0;
            const sectionName = mizoSections.find(s => line.startsWith(s)) || 'Content';
            currentSection = {
                title: sectionName,
                order: sectionOrder,
                chapters: [],
            };
            // Add the content as a chapter
            chapterOrder++;
            currentSection.chapters.push({
                title: line,
                chapter_number: chapterOrder.toString(),
                order: chapterOrder,
                subtopics: [],
            });
        } else if (currentSection && line.length > 0 && line.match(/^\d+\./)) {
            // Numbered items are chapters/topics
            chapterOrder++;
            currentSection.chapters.push({
                title: line.replace(/^\d+\.\s*/, ''),
                chapter_number: chapterOrder.toString(),
                order: chapterOrder,
                subtopics: [],
            });
        }
    }

    if (currentSection && currentSection.chapters.length > 0) {
        units.push(currentSection);
    }

    // Default if nothing found
    if (units.length === 0) {
        units.push({
            title: 'Section A - Mizo Content',
            order: 1,
            chapters: [{
                title: 'Mizo Syllabus Content',
                chapter_number: '1',
                order: 1,
                subtopics: [],
            }],
        });
    }

    return units;
}
