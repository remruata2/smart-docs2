/**
 * MBSE Syllabus Seed Script
 * 
 * Parses the comprehensive MBSESyllabus.md file and seeds the database
 * with structured syllabus data for all 21 subjects.
 * Refactored to use modular parsers.
 */

import { PrismaClient, SyllabusStatus } from '../src/generated/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { ParsedSyllabus, ParsedUnit } from './parsers/types';
import { parseEnglishStructure } from './parsers/english-parser';
import { parseMizoStructure } from './parsers/mizo-parser';
import { parseBiologyStructure } from './parsers/biology-parser';
import { parsePartBasedStructure } from './parsers/part-parser';
import { parseUnitBasedStructure } from './parsers/unit-parser';

const prisma = new PrismaClient();

// All subject names in the order they appear in the file
const SUBJECTS = [
    'ENGLISH',
    'MIZO',
    'HINDI',
    'POLITICAL SCIENCE',
    'HISTORY',
    'SOCIOLOGY',
    'EDUCATION',
    'PSYCHOLOGY',
    'COMPUTER SCIENCE',
    'HOME SCIENCE',
    'GEOGRAPHY',
    'ECONOMICS',
    'PUBLIC ADMINISTRATION',
    'MATHEMATICS',
    'PHYSICS',
    'CHEMISTRY',
    'BIOLOGY',
    'GEOLOGY',
    'BUSINESS STUDIES',
    'ACCOUNTANCY',
    'BUSINESS MATHEMATICS',
];

// ============================================================================
// HELPER FUNCTIONS (Subject Splitter)
// ============================================================================

/**
 * Split the raw file content into individual subject blocks
 */
function splitBySubject(content: string): Map<string, string> {
    const subjectBlocks = new Map<string, string>();
    const lines = content.split('\n');

    let currentSubject: string | null = null;
    let currentContent: string[] = [];
    let skipUntilFirstSubject = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if this line is a subject header
        const matchedSubject = detectSubjectHeader(line, lines[i + 1]?.trim() || '');

        if (matchedSubject) {
            // Save previous subject content
            if (currentSubject && currentContent.length > 0) {
                subjectBlocks.set(currentSubject, currentContent.join('\n'));
            }

            currentSubject = matchedSubject;
            currentContent = [lines[i]]; // Start with the header line
            skipUntilFirstSubject = false;
        } else if (!skipUntilFirstSubject && currentSubject) {
            currentContent.push(lines[i]);
        }
    }

    // Save last subject
    if (currentSubject && currentContent.length > 0) {
        subjectBlocks.set(currentSubject, currentContent.join('\n'));
    }

    return subjectBlocks;
}

/**
 * Detect if a line is a subject header
 */
function detectSubjectHeader(line: string, nextLine: string): string | null {
    // Handle special case for MIZO which has format "MIZO CLASS XI"
    if (line.startsWith('MIZO CLASS')) {
        return 'MIZO';
    }

    // Check for exact subject matches
    for (const subject of SUBJECTS) {
        if (subject === 'MIZO') continue; // Already handled above

        if (line === subject) {
            if (nextLine === '' ||
                nextLine.toLowerCase().includes('objective') ||
                nextLine.match(/^The general/i)) {
                return subject;
            }
        }
    }

    return null;
}

/**
 * Detect class markers like "CLASS XI", "CLASS XII"
 */
function detectClassMarker(line: string): string | null {
    if (line.match(/^CLASS\s+XI\b/i)) return 'XI';
    if (line.match(/^CLASS\s+XII\b/i)) return 'XII';
    return null;
}

/**
 * Split a subject block into CLASS XI and CLASS XII sections
 */
function splitByClass(subjectContent: string, subjectName: string): { classLevel: string; content: string }[] {
    const results: { classLevel: string; content: string }[] = [];
    const lines = subjectContent.split('\n');

    // Special handling for MIZO
    if (subjectName === 'MIZO') {
        const mizoResults = splitMizoByClass(subjectContent);
        return mizoResults;
    }

    let currentClass: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const classMatch = detectClassMarker(trimmed);

        if (classMatch) {
            if (currentClass && currentContent.length > 0) {
                results.push({
                    classLevel: currentClass,
                    content: currentContent.join('\n'),
                });
            }
            currentClass = classMatch;
            currentContent = [line];
        } else if (currentClass) {
            currentContent.push(line);
        }
    }

    if (currentClass && currentContent.length > 0) {
        results.push({
            classLevel: currentClass,
            content: currentContent.join('\n'),
        });
    }

    return results;
}

function splitMizoByClass(content: string): { classLevel: string; content: string }[] {
    const results: { classLevel: string; content: string }[] = [];
    const lines = content.split('\n');
    let currentClass: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^MIZO CLASS\s+XI$/i) || trimmed.match(/^CLASS\s+XI$/i)) {
            if (currentClass && currentContent.length > 0) {
                results.push({ classLevel: currentClass, content: currentContent.join('\n') });
            }
            currentClass = 'XI';
            currentContent = [line];
        } else if (trimmed.match(/^MIZO CLASS\s+XII$/i) || trimmed.match(/^CLASS\s+XII$/i)) {
            if (currentClass && currentContent.length > 0) {
                results.push({ classLevel: currentClass, content: currentContent.join('\n') });
            }
            currentClass = 'XII';
            currentContent = [line];
        } else if (currentClass) {
            currentContent.push(line);
        }
    }

    if (currentClass && currentContent.length > 0) {
        results.push({ classLevel: currentClass, content: currentContent.join('\n') });
    }

    return results;
}

/**
 * Delegate to appropriate modular parser
 */
function parseStructure(content: string, subjectName: string): ParsedUnit[] {
    switch (subjectName) {
        case 'ENGLISH':
            return parseEnglishStructure(content);
        case 'MIZO':
            return parseMizoStructure(content);
        case 'BIOLOGY':
            return parseBiologyStructure(content);
        case 'GEOGRAPHY':
        case 'ECONOMICS':
        case 'BUSINESS STUDIES':
        case 'ACCOUNTANCY':
        case 'BUSINESS MATHEMATICS':
            return parsePartBasedStructure(content);
        default:
            return parseUnitBasedStructure(content);
    }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function seedSyllabus(parsedData: ParsedSyllabus): Promise<void> {
    const { subject, classLevel, rawContent, units } = parsedData;

    console.log(`  Seeding: ${subject} Class ${classLevel}`);
    const title = `${subject} - Class ${classLevel}`;

    let syllabus;
    const existing = await prisma.syllabus.findFirst({
        where: {
            subject: subject,
            class_level: `Class ${classLevel}`,
        },
    });

    if (existing) {
        console.log(`    ♻️  Replacing existing syllabus: ${title} (ID: ${existing.id})`);

        // Delete existing units (cascades to chapters)
        await prisma.syllabusUnit.deleteMany({
            where: { syllabus_id: existing.id }
        });

        // Update main syllabus record
        syllabus = await prisma.syllabus.update({
            where: { id: existing.id },
            data: {
                title,
                raw_text: rawContent,
                status: SyllabusStatus.PARSED,
                updated_at: new Date(),
            }
        });
    } else {
        syllabus = await prisma.syllabus.create({
            data: {
                title,
                subject,
                class_level: `Class ${classLevel}`,
                board: 'MBSE',
                academic_year: '2024-2025',
                raw_text: rawContent,
                status: SyllabusStatus.PARSED,
            },
        });
        console.log(`    ✅ Created new syllabus: ${syllabus.id}`);
    }

    for (const unit of units) {
        const createdUnit = await prisma.syllabusUnit.create({
            data: {
                syllabus_id: syllabus.id,
                title: unit.title,
                order: unit.order,
            },
        });

        for (const chapter of unit.chapters) {
            await prisma.syllabusChapter.create({
                data: {
                    unit_id: createdUnit.id,
                    title: chapter.title,
                    chapter_number: chapter.chapter_number,
                    order: chapter.order,
                    subtopics: chapter.subtopics, // Prisma handles string array to Json
                },
            });
        }
        console.log(`      📦 Unit ${unit.order}: ${unit.title} (${unit.chapters.length} chapters)`);
    }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
    console.log('🚀 Starting MBSE Syllabus Seed Script (Modular)\n');

    const syllabusPath = path.join(__dirname, '..', 'MBSESyllabus.md');

    if (!fs.existsSync(syllabusPath)) {
        console.error(`❌ File not found: ${syllabusPath}`);
        process.exit(1);
    }

    console.log(`📄 Reading file: ${syllabusPath}\n`);
    const content = fs.readFileSync(syllabusPath, 'utf-8');

    console.log('📊 Splitting content by subjects...\n');
    const subjectBlocks = splitBySubject(content);

    console.log(`Found ${subjectBlocks.size} subjects:\n`);
    for (const [subject] of subjectBlocks) {
        console.log(`  - ${subject}`);
    }
    console.log('');

    let totalSyllabi = 0;

    for (const [subject, subjectContent] of subjectBlocks) {
        console.log(`\n📚 Processing: ${subject}`);
        console.log('─'.repeat(40));

        const classBlocks = splitByClass(subjectContent, subject);

        if (classBlocks.length === 0) {
            console.log(`  ⚠️  No class blocks found for ${subject}`);
            continue;
        }

        for (const { classLevel, content: classContent } of classBlocks) {
            const units = parseStructure(classContent, subject);

            const parsedData: ParsedSyllabus = {
                subject,
                classLevel,
                rawContent: classContent,
                units,
            };

            await seedSyllabus(parsedData);
            totalSyllabi++;
        }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`✨ Seeding complete! Created ${totalSyllabi} syllabus records.`);
    console.log('═'.repeat(50));
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
