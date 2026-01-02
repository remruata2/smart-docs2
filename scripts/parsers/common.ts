/**
 * Split a single line of text into multiple subtopics based on common delimiters
 */
export function splitLineIntoSubtopics(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // Try splitting by semicolon first
    if (trimmed.includes(';')) {
        return trimmed.split(';').map(s => s.trim()).filter(Boolean);
    }

    // Try splitting by comma
    // We check for comma but also ensure we don't split single concepts that might have commas (rare in syllabi)
    if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Try splitting by period + space (sentences)
    if (trimmed.includes('. ')) {
        return trimmed.split(/\.\s+/).map(s => s.trim()).filter(Boolean);
    }

    return [trimmed];
}

export function parseInlineSubtopics(line: string): { title: string; subtopics: string[] } {
    if (!line.includes(':')) {
        return { title: line.trim(), subtopics: [] };
    }

    const parts = line.split(':');
    const title = parts[0].trim();
    const content = parts.slice(1).join(':').trim();

    // If content is empty, return empty array
    if (!content) {
        return { title, subtopics: [] };
    }

    const subtopics = splitLineIntoSubtopics(content);

    return { title, subtopics };
}
