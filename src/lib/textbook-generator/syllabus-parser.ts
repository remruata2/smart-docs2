/**
 * Syllabus Parser Service
 * Uses Gemini 2.0 Flash to parse MBSE syllabus text into structured units and chapters
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getProviderApiKey } from '@/lib/ai-key-store';
import { getTextbookModels } from './models';
import type { ParsedSyllabus } from './types';

// Zod schema for validating the parsed syllabus structure
const ParsedChapterSchema = z.object({
    number: z.string().describe('Chapter number, e.g., "1", "2", "1.1"'),
    title: z.string().describe('Chapter title without the chapter number'),
    subtopics: z.array(z.string()).describe('List of subtopics/concepts covered in this chapter'),
});

const ParsedUnitSchema = z.object({
    title: z.string().describe('Unit/Part title, e.g., "Part A: INDIAN CONSTITUTION AT WORK"'),
    chapters: z.array(ParsedChapterSchema).describe('Chapters within this unit'),
});

const ParsedSyllabusSchema = z.object({
    class: z.enum(['XI', 'XII']).describe('Class level extracted from syllabus'),
    stream: z.enum(['Arts', 'Science', 'Commerce']).nullable().describe('Stream if identifiable, null otherwise'),
    subject: z.string().describe('Subject name extracted from syllabus'),
    units: z.array(ParsedUnitSchema).describe('Units/Parts of the syllabus'),
});

/**
 * Parse raw MBSE syllabus text into structured format
 */
export async function parseSyllabus(
    rawSyllabus: string,
    hints?: {
        subjectHint?: string;
        classHint?: 'XI' | 'XII';
        streamHint?: 'Arts' | 'Science' | 'Commerce';
    }
): Promise<{ success: true; data: ParsedSyllabus } | { success: false; error: string }> {
    try {
        if (!rawSyllabus || rawSyllabus.trim().length < 50) {
            return { success: false, error: 'Syllabus text is too short. Please provide more content.' };
        }

        // Get API key
        const { apiKey } = await getProviderApiKey({ provider: 'gemini' });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;

        if (!keyToUse) {
            return { success: false, error: 'No Gemini API key configured. Please add a key in admin settings.' };
        }

        const google = createGoogleGenerativeAI({ apiKey: keyToUse });

        // Build context hints
        const contextHints = [];
        if (hints?.subjectHint) contextHints.push(`Subject: ${hints.subjectHint}`);
        if (hints?.classHint) contextHints.push(`Class: ${hints.classHint}`);
        if (hints?.streamHint) contextHints.push(`Stream: ${hints.streamHint}`);
        const hintText = contextHints.length > 0
            ? `\n\nUSER PROVIDED HINTS:\n${contextHints.join('\n')}`
            : '';

        const prompt = `You are an expert in parsing Indian educational syllabi, specifically MBSE (Mizoram Board of School Education) and NCERT curricula.

TASK: Parse the following raw syllabus text into a structured format.

RULES:
1. Extract the class level (XI or XII) from the text if mentioned
2. Identify the subject name from the syllabus
3. Identify stream (Arts/Science/Commerce) if the subject clearly belongs to one
4. HIERARCHY MAPPING:
   - Top Level Grouping ("units" in JSON): Look for "Part A/B", "Section I/II". If none exist (e.g. syllabus just lists Unit I, Unit II...), create a single group called "Section A".
   - Content Blocks ("chapters" in JSON): Look for "Unit I", "Unit II", "Chapter 1" etc. textual headers. These are the main teaching blocks.
5. For each "Unit" (Content Block), extract the subtopics/concepts listed.

FORMATTING RULES:
- "Chapter" numbers in JSON should reflect the Unit Number (e.g. "I", "1", "A").
- "Title" should be the topic name (e.g. "Sets", "Electrostatics").
- "subtopics" should be a JSON array of strings.
- IMPORTANT: Split long strings into individual concepts. EACH concept should be its own item in the array.
- DO NOT combine distinct concepts into a single string.
- Preserve original order.

EXAMPLE INPUT (Physics Style):
"""
Unit I: Physical World
Scope; Excitement; Laws
Unit II: Kinematics
Motion in straight line; Scalars
"""

EXAMPLE OUTPUT:
{
  "class": "XI",
  "subject": "Physics",
  "units": [
    {
      "title": "Section A",
      "chapters": [
        { "number": "I", "title": "Physical World", "subtopics": ["Scope", "Excitement", "Laws"] },
        { "number": "II", "title": "Kinematics", "subtopics": ["Motion in straight line", "Scalars"] }
      ]
    }
  ]
}

EXAMPLE INPUT (Sociology Style):
"""
Part A: Introducing Sociology
Unit 1: Society and Sociology
...
Part B: Understanding Society
Unit 2: Social Change
...
"""

EXAMPLE OUTPUT (Sociology):
{
  "units": [
    {
      "title": "Part A: Introducing Sociology",
      "chapters": [ { "number": "1", "title": "Society and Sociology", "subtopics": [] } ]
    },
    {
      "title": "Part B: Understanding Society",
      "chapters": [ { "number": "2", "title": "Social Change", "subtopics": [] } ]
    }
  ]
}
${hintText}

RAW SYLLABUS TEXT TO PARSE:
"""
${rawSyllabus}
"""

Parse this syllabus and return the structured JSON.`;

        const { PARSER } = await getTextbookModels();
        const result = await generateObject({
            model: google(PARSER),
            schema: ParsedSyllabusSchema,
            prompt: prompt,
            // @ts-expect-error - timeout is supported by AI SDK v5 but not in type definitions yet
            timeout: 300000, // 5 minutes for complex syllabus parsing
        });

        // Validate the result
        const parsed = result.object;

        if (!parsed.units || parsed.units.length === 0) {
            return { success: false, error: 'Could not identify any units or chapters in the syllabus.' };
        }

        const totalChapters = parsed.units.reduce((acc, unit) => acc + unit.chapters.length, 0);
        if (totalChapters === 0) {
            return { success: false, error: 'Could not identify any chapters in the syllabus.' };
        }

        console.log(`[SYLLABUS-PARSER] Successfully parsed: ${parsed.subject} (Class ${parsed.class})`);
        console.log(`[SYLLABUS-PARSER] Found ${parsed.units.length} units with ${totalChapters} total chapters`);

        return {
            success: true,
            data: parsed as ParsedSyllabus,
        };

    } catch (error) {
        console.error('[SYLLABUS-PARSER] Error parsing syllabus:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse syllabus',
        };
    }
}

/**
 * Create textbook units and chapters from parsed syllabus
 */
export function generateStructureFromParsed(parsed: ParsedSyllabus): {
    units: Array<{
        title: string;
        description?: string;
        order: number;
        chapters: Array<{
            chapter_number: string;
            title: string;
            order: number;
            subtopics: string[];
        }>;
    }>;
} {
    return {
        units: parsed.units.map((unit, unitIndex) => ({
            title: unit.title,
            order: unitIndex + 1,
            chapters: unit.chapters.map((chapter, chapterIndex) => ({
                chapter_number: chapter.number,
                title: chapter.title,
                order: chapterIndex + 1,
                subtopics: chapter.subtopics,
            })),
        })),
    };
}
