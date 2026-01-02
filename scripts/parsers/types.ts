export interface ParsedChapter {
    title: string;
    chapter_number: string;
    order: number;
    subtopics: string[];
}

export interface ParsedUnit {
    title: string;
    order: number;
    chapters: ParsedChapter[];
}

export interface ParsedSyllabus {
    subject: string;
    classLevel: string; // 'XI' or 'XII'
    rawContent: string;
    units: ParsedUnit[];
}
