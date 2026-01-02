
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Map filename numbers to subjects if needed, or parse filename
// Filenames: 16_chemistry.md, 01_english.md, etc.

async function seedSyllabi() {
    const projectDir = process.cwd();
    const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md') && /^\d+_.+\.md$/.test(f));

    console.log(`Found ${files.length} syllabus files.`);

    // Clear existing syllabi to avoid duplicates? Or just upsert?
    // User might want to keep existing. I'll upsert based on title.

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(path.join(projectDir, file), 'utf-8');

        // Extract Subject Name from filename (e.g. 16_chemistry.md -> Chemistry)
        const subjectSlug = file.replace(/^\d+_/, '').replace('.md', '');
        const subjectName = subjectSlug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Split by CLASS XI and CLASS XII
        // Regex lookahead or simple split
        const classBlocks = splitByClass(content);

        for (const block of classBlocks) {
            if (!block.content.trim()) continue;

            const title = `MBSE ${subjectName} Class ${block.className} Syllabus`;
            console.log(`  Creating/Updating: ${title}`);

            // Create Syllabus Record
            const syllabus = await prisma.syllabus.upsert({
                where: { id: -1 }, // we can't upsert easily without unique title. 
                // We'll perform findFirst then update or create.
                create: {
                    title,
                    class_level: block.className,
                    subject: subjectName,
                    board: 'MBSE',
                    status: 'PARSED', // We are parsing it here!
                    raw_text: content, // Save full content or block content? Full content is safer for reference.
                },
                update: {
                    raw_text: content,
                    status: 'PARSED'
                }
            })
            // Actually, upsert requires unique key. I'll search first.

            const existing = await prisma.syllabus.findFirst({
                where: { title }
            });

            let syllabusId;
            if (existing) {
                await prisma.syllabus.update({
                    where: { id: existing.id },
                    data: { raw_text: content, status: 'PARSED' }
                });
                syllabusId = existing.id;
                // Verify if we want to overwrite structure? Yes, for seeding.
                await prisma.syllabusUnit.deleteMany({ where: { syllabus_id: syllabusId } });
            } else {
                const newly = await prisma.syllabus.create({
                    data: {
                        title,
                        class_level: block.className,
                        subject: subjectName,
                        board: 'MBSE',
                        academic_year: '2024-2025',
                        status: 'PARSED',
                        raw_text: content
                    }
                });
                syllabusId = newly.id;
            }

            // PARSE STRUCTURE
            const structure = parseMarkdownStructure(block.content);

            // Save Structure
            for (let i = 0; i < structure.length; i++) {
                const unit = structure[i];
                const savedUnit = await prisma.syllabusUnit.create({
                    data: {
                        syllabus_id: syllabusId,
                        title: unit.title,
                        order: i + 1,
                        description: unit.description
                    }
                });

                if (unit.chapters.length > 0) {
                    await prisma.syllabusChapter.createMany({
                        data: unit.chapters.map((ch, idx) => ({
                            unit_id: savedUnit.id,
                            chapter_number: ch.number?.toString() || (idx + 1).toString(),
                            title: ch.title,
                            order: idx + 1,
                            subtopics: JSON.stringify(ch.subtopics)
                        }))
                    });
                }
            }
            console.log(`    Saved ${structure.length} sections/units.`);
        }
    }
}

function splitByClass(text: string): { className: 'XI' | 'XII', content: string }[] {
    const result = [];

    // Find indicators
    const xiIndex = text.indexOf('# CLASS XI');
    const xiiIndex = text.indexOf('# CLASS XII');

    if (xiIndex === -1 && xiiIndex === -1) return [];

    if (xiIndex !== -1) {
        const end = xiiIndex !== -1 ? xiiIndex : text.length;
        result.push({
            className: 'XI' as const,
            content: text.slice(xiIndex, end)
        });
    }

    if (xiiIndex !== -1) {
        result.push({
            className: 'XII' as const,
            content: text.slice(xiiIndex)
        });
    }

    return result;
}

interface ParsedStructureUnit {
    title: string;
    description?: string;
    chapters: ParsedStructureChapter[];
}

interface ParsedStructureChapter {
    number?: string;
    title: string;
    subtopics: string[];
}

function parseMarkdownStructure(text: string): ParsedStructureUnit[] {
    const lines = text.split('\n');
    const units: ParsedStructureUnit[] = [];

    let currentUnit: ParsedStructureUnit | null = null;
    let currentChapter: ParsedStructureChapter | null = null;
    // Default unit for flat list (Physics style) logic:
    // If we see `##`, is it Unit or Chapter?
    // We scan ahead to see if `###` exists?
    // Simpler: 
    // 1. `## Part ...` -> New Unit.
    // 2. `## Unit ...` -> If inside Part, New Chapter. If no Part, New Unit (and current chapter is null?).
    // Wait, Physics: `## Unit I` has subtopics directly. So `## Unit` is a Chapter (in DB) inside a Main Unit?  
    // OR `## Unit` is a Unit (in DB) and it has NO chapters?
    // DB structure: Syllabus -> Unit -> Chapter.
    // We MUST have at least one Unit.
    // Physics `## Unit I` -> We can make it a Chapter inside "Main Content" Unit.
    // Sociology `## Part A` -> Unit. `### Unit 1` -> Chapter.

    // Detection Strategy:
    // Does the text contain `### `?
    const hasLevel3 = text.includes('### ');

    if (hasLevel3) {
        // Sociology / English Style (Hierarchical)
        let defaultUnit = { title: 'Main Content', chapters: [] as ParsedStructureChapter[] };
        units.push(defaultUnit);
        currentUnit = defaultUnit;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
                // New Part/Section (Unit in DB)
                currentUnit = {
                    title: trimmed.replace(/^##\s+/, ''),
                    chapters: []
                };
                units.push(currentUnit);
                // Remove default unit if empty and we just found a real one
                if (units[0] === defaultUnit && units[0].chapters.length === 0 && units.length > 1) {
                    units.shift();
                }
            } else if (trimmed.startsWith('### ')) {
                // New Chapter (Unit in Syllabus)
                if (!currentUnit) {
                    currentUnit = { title: 'Main Content', chapters: [] };
                    units.push(currentUnit);
                }
                currentChapter = {
                    title: trimmed.replace(/^###\s+/, ''),
                    subtopics: []
                };
                // Extract number if possible "Unit 1:"
                const match = currentChapter.title.match(/(Unit|Chapter)\s+(\w+):/);
                if (match) currentChapter.number = match[2];

                currentUnit.chapters.push(currentChapter);
            } else if (trimmed.startsWith('- ') && currentChapter) {
                currentChapter.subtopics.push(trimmed.replace(/^- /, ''));
            }
        });

    } else {
        // Physics / Math / Chemistry Style (Flat)
        // `## Unit I` are Chapters (in DB terms) inside a single "Syllabus" Unit?
        // OR `## Unit I` are Units (in DB terms) and we have single dummy Chapter inside each?
        // User wants "Unit" in frontend.
        // If we map `## Unit` to `SyllabusChapter`, then parent `SyllabusUnit` is "Main Content".
        // This allows "Unit I" to be a Chapter entity.

        let mainUnit = { title: 'Section A', chapters: [] as ParsedStructureChapter[] };
        units.push(mainUnit);
        currentChapter = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('## ')) {
                // New "Unit" from text -> becomes Chapter in DB
                const title = trimmed.replace(/^##\s+/, '');
                currentChapter = {
                    title: title,
                    subtopics: []
                };
                // Extract number "Unit I:"
                const match = title.match(/(Unit|Chapter)\s+([IVX\d]+)/);
                if (match) currentChapter.number = match[2];

                mainUnit.chapters.push(currentChapter);
            } else if (trimmed.startsWith('- ') && currentChapter) {
                currentChapter.subtopics.push(trimmed.replace(/^- /, ''));
            }
        });
    }

    return units;
}

seedSyllabi()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
