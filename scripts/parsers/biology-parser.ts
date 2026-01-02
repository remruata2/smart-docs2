import { ParsedUnit } from './types';
import { parseInlineSubtopics, splitLineIntoSubtopics } from './common';
import { parseUnitBasedStructure } from './unit-parser';

/**
 * Parse Biology syllabus with Roman numeral sections (I., II., III., etc.)
 * Fixed to capture inline subtopics correctly.
 */
export function parseBiologyStructure(content: string): ParsedUnit[] {
    const units: ParsedUnit[] = [];
    const lines = content.split('\n');

    let currentSection: ParsedUnit | null = null;
    let sectionOrder = 0;
    let chapterOrder = 0;
    let currentSubtopics: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip markers
        if (line === 'THEORY' || line === 'PRACTICAL') continue;

        // Biology uses Roman numerals: I.Diversity of Living Organisms
        const romanMatch = line.match(/^(I{1,3}|IV|V|VI{0,3})\.\s*(.+)/);

        if (romanMatch) {
            if (currentSection) {
                // Add last chapter to current section
                if (chapterOrder > 0) {
                    currentSection.chapters[currentSection.chapters.length - 1].subtopics = currentSubtopics;
                }
                units.push(currentSection);
            }
            sectionOrder++;
            chapterOrder = 0;
            currentSubtopics = [];
            currentSection = {
                title: `${romanMatch[1]}. ${romanMatch[2]}`,
                order: sectionOrder,
                chapters: [],
            };
        } else if (currentSection && line.length > 0) {
            // Check for new chapter line (contains colon and is substantial)
            if (line.includes(':') && !line.startsWith('-') && line.length > 10) {
                if (chapterOrder > 0) {
                    // Save previous chapter subtopics
                    currentSection.chapters[currentSection.chapters.length - 1].subtopics = currentSubtopics;
                }
                chapterOrder++;

                // Helper captures Title and Subtopics
                const { title, subtopics } = parseInlineSubtopics(line);

                currentSubtopics = subtopics; // Initialize with inline content

                currentSection.chapters.push({
                    title: title,
                    chapter_number: chapterOrder.toString(),
                    order: chapterOrder,
                    subtopics: [],
                });
            } else if (chapterOrder > 0) {
                currentSubtopics.push(...splitLineIntoSubtopics(line));
            }
        }
    }

    if (currentSection) {
        if (chapterOrder > 0 && currentSection.chapters.length > 0) {
            currentSection.chapters[currentSection.chapters.length - 1].subtopics = currentSubtopics;
        }
        units.push(currentSection);
    }

    // Default if nothing found, try standard unit parser
    if (units.length === 0) {
        return parseUnitBasedStructure(content);
    }

    return units;
}
