// Textbook Generator Types
// ============================================

import type {
  Textbook,
  TextbookUnit,
  TextbookChapter,
  TextbookImage,
  TextbookGenerationJob,
  TextbookStatus,
  ChapterGenStatus,
  TextbookImageType,
  TextbookGenerationJobType,
  TextbookJobStatus,
  // Syllabus types
  Syllabus,
  SyllabusUnit,
  SyllabusChapter,
  SyllabusStatus,
} from '@/generated/prisma';

// Re-export Prisma types
export type {
  Textbook,
  TextbookUnit,
  TextbookChapter,
  TextbookImage,
  TextbookGenerationJob,
  TextbookStatus,
  ChapterGenStatus,
  TextbookImageType,
  TextbookGenerationJobType,
  TextbookJobStatus,
  Syllabus,
  SyllabusUnit,
  SyllabusChapter,
  SyllabusStatus,
};

// Extended types with relations
export type SyllabusWithRelations = Syllabus & {
  units: SyllabusUnitWithChapters[];
  _count?: {
    units: number;
    textbooks: number;
  };
};

export type SyllabusUnitWithChapters = SyllabusUnit & {
  chapters: SyllabusChapter[];
};

export type TextbookWithRelations = Textbook & {
  units: TextbookUnitWithChapters[];
  creator: {
    id: number;
    username: string;
    email: string | null;
  };
  syllabus?: Syllabus;
  _count?: {
    units: number;
    generation_jobs: number;
  };
};

export type TextbookUnitWithChapters = TextbookUnit & {
  chapters: TextbookChapterWithImages[];
};

export type TextbookChapterWithImages = TextbookChapter & {
  images: TextbookImage[];
};

// Form types
export interface CreateTextbookInput {
  title: string;
  description?: string;
  class_level: string;
  stream?: 'Arts' | 'Science' | 'Commerce' | 'Vocational' | null;
  subject_name?: string;
  board_id?: string;
  academic_year?: string;
  author?: string;
  syllabus_id?: number; // Optional link to syllabus
  raw_syllabus?: string; // Legacy/Manual override
}

export interface UpdateTextbookInput extends Partial<CreateTextbookInput> {
  status?: TextbookStatus;
}

export interface CreateUnitInput {
  textbook_id: number;
  title: string;
  description?: string;
  order?: number;
}

export interface CreateChapterInput {
  unit_id: number;
  chapter_number: string;
  title: string;
  order?: number;
  raw_syllabus_text?: string;
  subtopics?: string[];
}

// Syllabus Form Types
export interface CreateSyllabusInput {
  title: string;
  description?: string;
  class_level: string; // Changed from literal to string
  stream?: 'Arts' | 'Science' | 'Commerce' | null;
  subject: string;
  board?: string;
  academic_year?: string;
  exam_category?: string; // Exam category for textbook generation prompts
  syllabus_mode?: 'single' | 'multi_split'; // For competitive exams
  raw_text?: string;
  units?: ParsedUnit[]; // Support for manual entry
}

export interface UpdateSyllabusInput extends Partial<CreateSyllabusInput> {
  status?: SyllabusStatus;
}

// Parsed syllabus structure
export interface ParsedSyllabus {
  class: string; // Changed from literal to string
  stream?: 'Arts' | 'Science' | 'Commerce' | null;
  subject: string;
  units: ParsedUnit[];
}

export interface ParsedUnit {
  title: string;
  chapters: ParsedChapter[];
}

export interface ParsedChapter {
  number: string;
  title: string;
  subtopics: string[];
}

// Import exam category type
import type { ExamCategory } from './exam-prompts';
export type { ExamCategory };

// Generation options
export interface ChapterGenerationOptions {
  includeExamHighlights: boolean;
  examCategory?: ExamCategory; // Primary exam category (auto-detected or manual)
  examTypes?: string[]; // Specific exams within the category (e.g., ['JEE Main', 'JEE Advanced'])
  difficulty: 'basic' | 'intermediate' | 'advanced';
  thinkingLevel: 'low' | 'high';
  customPrompt?: string; // Optional extra prompt from admin
  // Overrides
  minWords?: number;
  maxWords?: number;
  mcqCount?: number;
  shortAnswerCount?: number;
  longAnswerCount?: number;
  imageCount?: number;
}

export interface QuestionGenerationOptions {
  mcqCount: number;
  shortAnswerCount: number;
  longAnswerCount: number;
  includeCUETStyle: boolean;
}

// MCQ structure for generated questions
export interface GeneratedMCQ {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examRelevance?: string[]; // Dynamic exam types (e.g., ['UPSC Prelims', 'MPSC'])
  figureSpec?: {
    type: 'series' | 'rotation' | 'odd_one_out' | 'grid';
    figures: {
      shape: 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'diamond' | 'cross' | 'plus' | 'question_mark';
      fill?: 'black' | 'white' | 'gray' | 'none';
      rotation?: number;
      innerShape?: 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'diamond' | 'cross' | 'plus' | 'question_mark';
      innerFill?: 'black' | 'white' | 'gray' | 'none';
      dots?: number;
      lines?: number;
    }[];
    columns?: number;
  };
  answerFigureSpec?: {
    type: 'series' | 'rotation' | 'odd_one_out' | 'grid';
    figures: {
      shape: 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'diamond' | 'cross' | 'plus' | 'question_mark';
      fill?: 'black' | 'white' | 'gray' | 'none';
      rotation?: number;
      innerShape?: 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'diamond' | 'cross' | 'plus' | 'question_mark';
      innerFill?: 'black' | 'white' | 'gray' | 'none';
      dots?: number;
      lines?: number;
    }[];
    columns?: number;
  };
}

export interface GeneratedShortAnswer {
  question: string;
  expectedPoints: string[];
  marks: number;
}

export interface GeneratedLongAnswer {
  question: string;
  markingScheme: {
    point: string;
    marks: number;
  }[];
  totalMarks: number;
}

// Image generation
export interface ImageGenerationRequest {
  chapter_id: number;
  type: TextbookImageType;
  description: string;
  placement?: string;
}

// Chapter content generation request
export interface ChapterContentGenerationRequest {
  chapter_id: number;
  options?: ChapterGenerationOptions;
  customPrompt?: string; // Extra instructions from admin
}

// Generated chapter content structure
export interface GeneratedChapterContent {
  markdown_content: string;
  exam_highlights?: {
    exam_type: string; // Dynamic exam type (e.g., 'UPSC Prelims', 'JEE Main', 'NEET')
    key_points: string[];
    expected_questions: string[];
  }[];
  key_concepts: string[];
  summary: string;
  images_to_generate: {
    type: TextbookImageType | 'FLOWCHART' | 'INFOGRAPHIC' | 'MINDMAP' | 'MOLECULAR' | 'ANATOMICAL' | 'EXPERIMENTAL' | 'GEOMETRIC' | 'TIMELINE' | 'COMPARISON';
    description: string;
    placement: string;
    caption?: string;
  }[];
  mcqs?: GeneratedMCQ[];
  short_answers?: GeneratedShortAnswer[];
  long_answers?: GeneratedLongAnswer[];
}

// Chapter PDF generation
export interface ChapterPDFResult {
  chapter_id: number;
  pdf_url: string; // Supabase storage URL
  file_size: number;
  page_count: number;
  generated_at: Date;
}

// Book compilation request
export interface BookCompilationRequest {
  textbook_id: number;
  chapter_ids: number[]; // Selected chapters to compile
  options?: {
    include_cover: boolean;
    include_toc: boolean;
    include_index: boolean;
  };
}

export interface BookCompilationResult {
  textbook_id: number;
  pdf_url: string;
  file_size: number;
  page_count: number;
  chapters_included: number;
  compiled_at: Date;
}

// Job tracking
export interface JobProgress {
  jobId: number;
  type: TextbookGenerationJobType;
  status: TextbookJobStatus;
  progress: number;
  message?: string;
  error?: string;
}

// API response types
export interface TextbookListResponse {
  textbooks: TextbookWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ParseSyllabusResponse {
  success: boolean;
  parsed?: ParsedSyllabus;
  error?: string;
}

export interface GenerateContentResponse {
  success: boolean;
  jobId?: number;
  error?: string;
}

// Filter options for listing
export interface TextbookFilters {
  status?: TextbookStatus;
  class_level?: string;
  stream?: 'Arts' | 'Science' | 'Commerce';
  board_id?: string;
  search?: string;
}
