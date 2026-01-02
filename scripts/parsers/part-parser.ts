import { ParsedUnit } from './types';
import { parseInlineSubtopics, splitLineIntoSubtopics } from './common';
import { parseUnitBasedStructure } from './unit-parser';

/**
 * Parse subjects that use PART A, PART B, PART C structure
 */
export function parsePartBasedStructure(content: string): ParsedUnit[] {
    const units: ParsedUnit[] = [];
    const lines = content.split('\n');

    let currentPart: ParsedUnit | null = null;
    let partOrder = 0;
    let chapterOrder = 0;
    let currentSubtopics: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip THEORY/PRACTICAL markers
        if (line === 'THEORY' || line === 'PRACTICAL' || line === 'PROJECT') continue;

        // Detect PART headers
        const partMatch = line.match(/^PART\s*[-–:]?\s*([A-C]|[I-III])\s*[:–-]?\s*(.*)/i) ||
            line.match(/^PART\s*([A-C])\s*$/i);

        if (partMatch) {
            if (currentPart) {
                if (chapterOrder > 0 && currentPart.chapters.length > 0) {
                    currentPart.chapters[currentPart.chapters.length - 1].subtopics = currentSubtopics;
                }
                if (currentPart.chapters.length > 0) {
                    units.push(currentPart);
                }
            }
            partOrder++;
            chapterOrder = 0;
            currentSubtopics = [];
            const partTitle = partMatch[2] ? `Part ${partMatch[1]}: ${partMatch[2]}` : `Part ${partMatch[1]}`;
            currentPart = {
                title: partTitle,
                order: partOrder,
                chapters: [],
            };
        } else if (currentPart) {
            // Detect Unit within Part
            const unitMatch = line.match(/^Unit\s+(\d+|[IVX]+)\s*[:–-]?\s*(.*)/i);

            if (unitMatch) {
                if (chapterOrder > 0 && currentPart.chapters.length > 0) {
                    currentPart.chapters[currentPart.chapters.length - 1].subtopics = currentSubtopics;
                }
                chapterOrder++;

                // Inline subtopics check
                const titleLine = unitMatch[2] || `Unit ${unitMatch[1]}`;
                const { title, subtopics } = parseInlineSubtopics(titleLine);

                currentSubtopics = subtopics; // Initialize with inline content

                currentPart.chapters.push({
                    title: title || `Unit ${unitMatch[1]}`,
                    chapter_number: unitMatch[1], // Keep original unit number as string
                    order: chapterOrder,
                    subtopics: [],
                });
            } else if (line.length > 0 && chapterOrder > 0) {
                currentSubtopics.push(...splitLineIntoSubtopics(line));
            }
        }
    }

    if (currentPart) {
        if (chapterOrder > 0 && currentPart.chapters.length > 0) {
            currentPart.chapters[currentPart.chapters.length - 1].subtopics = currentSubtopics;
        }
        if (currentPart.chapters.length > 0) {
            units.push(currentPart);
        }
    }

    // If no parts found, fallback to unit-based
    if (units.length === 0) {
        return parseUnitBasedStructure(content);
    }

    return units;
}
