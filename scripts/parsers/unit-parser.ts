import { ParsedUnit } from './types';
import { parseInlineSubtopics, splitLineIntoSubtopics } from './common';

/**
 * Parse subjects that use Unit I, Unit II, Unit III structure (most subjects)
 */
export function parseUnitBasedStructure(content: string): ParsedUnit[] {
    const units: ParsedUnit[] = [];
    const lines = content.split('\n');

    // Create a single Section A to contain all units
    const mainSection: ParsedUnit = {
        title: 'Section A',
        order: 1,
        chapters: [],
    };

    let chapterOrder = 0;
    let currentSubtopics: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip THEORY/PRACTICAL markers
        if (line === 'THEORY' || line === 'PRACTICAL' || line === 'PROJECT') continue;

        // Detect Unit headers
        // Unit I:, Unit 1:, Unit I -, Unit II:, etc.
        const unitMatch = line.match(/^Unit\s+([IVX]+|\d+)\s*[:–-]?\s*(.*)/i);

        if (unitMatch) {
            // Save previous chapter content
            if (chapterOrder > 0 && mainSection.chapters.length > 0) {
                mainSection.chapters[mainSection.chapters.length - 1].subtopics = currentSubtopics;
            }
            chapterOrder++;

            // Check for inline subtopics in the Unit title line itself?
            const titleLine = unitMatch[2] || `Unit ${unitMatch[1]}`;
            const { title, subtopics } = parseInlineSubtopics(titleLine);

            currentSubtopics = subtopics; // Initialize with inline subtopics

            mainSection.chapters.push({
                title: title || `Unit ${unitMatch[1]}`, // fallback
                chapter_number: unitMatch[1], // Keep original unit number as string
                order: chapterOrder,
                subtopics: [], // Will be updated later
            });
        } else if (line.length > 0 && chapterOrder > 0) {
            // Add as split topics current chapter
            currentSubtopics.push(...splitLineIntoSubtopics(line));
        }
    }

    // Add remaining topics to last chapter
    if (chapterOrder > 0 && mainSection.chapters.length > 0) {
        mainSection.chapters[mainSection.chapters.length - 1].subtopics = currentSubtopics;
    }

    if (mainSection.chapters.length > 0) {
        units.push(mainSection);
    }

    // If no units found, create a default structure
    if (units.length === 0) {
        units.push({
            title: 'Section A',
            order: 1,
            chapters: [{
                title: 'Main Content',
                chapter_number: '1',
                order: 1,
                subtopics: content.split('\n').filter(l => l.trim().length > 0).slice(0, 30),
            }],
        });
    }

    return units;
}
