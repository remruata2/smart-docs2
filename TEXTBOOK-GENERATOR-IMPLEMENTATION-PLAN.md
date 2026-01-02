# MBSE Smart Textbook Generator - Implementation Plan

**Project Code:** Zirna-AI  
**Module Location:** `/admin/textbook-generator`  
**Created:** 2025-12-15  
**Target Audience:** Higher Secondary Students (Class XI & XII) in Mizoram

---

## 1. Executive Summary

This document outlines the implementation plan for integrating the MBSE Smart Textbook Generator as a new admin module within the existing `ai-exam-prep` (Zirna) application. The module will enable administrators to:

1. Input raw MBSE syllabus text
2. Parse it into a structured format
3. Generate comprehensive textbook content using AI
4. Create educational diagrams and visuals
5. Compile everything into a printable PDF textbook

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Admin Module                         │
│                  /admin/textbook-generator                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Syllabus     │  │ Content      │  │ PDF Preview &        │   │
│  │ Input/Parser │  │ Generation   │  │ Download             │   │
│  │ UI           │  │ Dashboard    │  │ Interface            │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
├─────────┴─────────────────┴──────────────────────┴───────────────┤
│                         API Routes                                │
│     /api/admin/textbook-generator/*                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Syllabus     │  │ AI Content   │  │ PDF Generator        │   │
│  │ Parser       │  │ Service      │  │ Service              │   │
│  │ Service      │  │ (Gemini)     │  │ (React-PDF/jsPDF)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                            │
│              (Textbook, Chapter, Generation Jobs)                 │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Decisions

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | React/TypeScript | Consistent with existing admin UI |
| **Styling** | TailwindCSS + shadcn/ui | Matches existing design system |
| **API** | Next.js API Routes | Unified backend |
| **AI Content (Primary)** | **Gemini 3 Pro** (`gemini-3-pro-preview`) | Most capable model with advanced reasoning |
| **AI Content (Fallback)** | Gemini 2.5 Pro | Stable fallback for reliability |
| **Image Generation** | Gemini Imagen 3 | For diagrams and visuals |
| **PDF Generation** | `@react-pdf/renderer` | React-native PDF, good TypeScript support |
| **Database** | PostgreSQL + Prisma | Existing infrastructure |

> **🎉 Using the Best Available Model:** Since this textbook content will feed the main Zirna app for quiz generation, we're using **Gemini 3 Pro** (now available!) for all chapter content and question generation. This model features dynamic thinking and advanced reasoning for highest quality educational content.

---

## 3. Database Schema Design

### 3.1 New Models to Add

```prisma
// ============================================
// TEXTBOOK GENERATOR MODELS
// ============================================

/// Represents a complete textbook project
model Textbook {
  id              Int                @id @default(autoincrement())
  title           String             @db.VarChar(255)
  description     String?
  class_level     String             @db.VarChar(20)  // "XI", "XII"
  stream          String?            @db.VarChar(50)  // "Arts", "Science", "Commerce"
  subject_id      Int?
  board_id        String?            @default("MBSE")
  
  // Metadata
  academic_year   String?            @db.VarChar(20)  // "2024-2025"
  author          String?            @db.VarChar(255)
  
  // Status tracking
  status          TextbookStatus     @default(DRAFT)
  progress        Int                @default(0)      // 0-100 percentage
  
  // Generated content
  cover_image_url String?
  pdf_url         String?
  
  // Timestamps
  created_at      DateTime           @default(now()) @db.Timestamptz(6)
  updated_at      DateTime           @updatedAt @db.Timestamptz(6)
  created_by      Int
  
  // Relations
  creator         user               @relation(fields: [created_by], references: [id])
  subject         Subject?           @relation(fields: [subject_id], references: [id])
  board           Board?             @relation(fields: [board_id], references: [id])
  units           TextbookUnit[]
  generation_jobs TextbookGenerationJob[]
  
  @@index([status, created_at(sort: Desc)])
  @@index([board_id, class_level])
  @@map("textbooks")
}

/// Represents a unit/part within a textbook
model TextbookUnit {
  id              Int                @id @default(autoincrement())
  textbook_id     Int
  order           Int
  title           String             @db.VarChar(255)  // e.g., "Part A: INDIAN CONSTITUTION AT WORK"
  description     String?
  
  created_at      DateTime           @default(now()) @db.Timestamptz(6)
  updated_at      DateTime           @updatedAt @db.Timestamptz(6)
  
  textbook        Textbook           @relation(fields: [textbook_id], references: [id], onDelete: Cascade)
  chapters        TextbookChapter[]
  
  @@unique([textbook_id, order])
  @@map("textbook_units")
}

/// Represents a chapter within a unit
model TextbookChapter {
  id                  Int                @id @default(autoincrement())
  unit_id             Int
  chapter_number      String             @db.VarChar(10)  // "1", "1.1", etc.
  title               String             @db.VarChar(255)
  order               Int
  
  // Raw syllabus input
  raw_syllabus_text   String?
  subtopics           Json?              // Array of subtopic strings
  
  // Generated content
  content_markdown    String?            // Full chapter content in Markdown
  content_html        String?            // Rendered HTML for preview
  learning_outcomes   Json?              // Array of learning outcomes
  key_takeaways       Json?              // Array of key points
  
  // Competitive exam highlights
  neet_relevant       Boolean            @default(false)
  jee_relevant        Boolean            @default(false)
  cuet_relevant       Boolean            @default(false)
  exam_highlights     Json?              // Specific exam-relevant points
  
  // Practice questions
  mcq_questions       Json?              // Array of MCQ objects
  short_questions     Json?              // Array of short answer questions
  long_questions      Json?              // Array of long answer questions
  
  // Status
  status              ChapterGenStatus   @default(PENDING)
  generation_error    String?
  
  created_at          DateTime           @default(now()) @db.Timestamptz(6)
  updated_at          DateTime           @updatedAt @db.Timestamptz(6)
  
  unit                TextbookUnit       @relation(fields: [unit_id], references: [id], onDelete: Cascade)
  images              TextbookImage[]
  
  @@unique([unit_id, order])
  @@index([status])
  @@map("textbook_chapters")
}

/// Stores generated images/diagrams for chapters
model TextbookImage {
  id              Int                @id @default(autoincrement())
  chapter_id      Int
  type            ImageType          // DIAGRAM, CHART, MAP, ILLUSTRATION, COVER
  prompt          String             // The prompt used to generate
  alt_text        String             @db.VarChar(255)
  image_url       String
  order           Int                @default(0)
  
  // Generation metadata
  model_used      String?            @db.VarChar(100)
  generation_time Int?               // Time in ms
  
  created_at      DateTime           @default(now()) @db.Timestamptz(6)
  
  chapter         TextbookChapter    @relation(fields: [chapter_id], references: [id], onDelete: Cascade)
  
  @@index([chapter_id, type])
  @@map("textbook_images")
}

/// Tracks generation jobs for async processing
model TextbookGenerationJob {
  id              Int                @id @default(autoincrement())
  textbook_id     Int
  job_type        GenerationJobType  // PARSE_SYLLABUS, GENERATE_CHAPTER, GENERATE_IMAGE, COMPILE_PDF
  status          JobStatus          @default(QUEUED)
  
  // Job details
  target_id       Int?               // chapter_id or unit_id depending on job_type
  input_data      Json?
  output_data     Json?
  error_message   String?
  
  // Progress tracking
  progress        Int                @default(0)
  started_at      DateTime?          @db.Timestamptz(6)
  completed_at    DateTime?          @db.Timestamptz(6)
  
  // Retry logic
  attempts        Int                @default(0)
  max_attempts    Int                @default(3)
  
  created_at      DateTime           @default(now()) @db.Timestamptz(6)
  
  textbook        Textbook           @relation(fields: [textbook_id], references: [id], onDelete: Cascade)
  
  @@index([status, created_at])
  @@index([textbook_id, job_type])
  @@map("textbook_generation_jobs")
}

// ============================================
// ENUMS
// ============================================

enum TextbookStatus {
  DRAFT
  PARSING
  GENERATING
  REVIEWING
  PUBLISHED
  ARCHIVED
}

enum ChapterGenStatus {
  PENDING
  GENERATING
  GENERATED
  FAILED
  REVIEWED
}

enum ImageType {
  DIAGRAM
  CHART
  MAP
  ILLUSTRATION
  COVER
  GRAPH
  ANATOMY
  CIRCUIT
}

enum GenerationJobType {
  PARSE_SYLLABUS
  GENERATE_CHAPTER
  GENERATE_QUESTIONS
  GENERATE_IMAGE
  COMPILE_PDF
  FULL_TEXTBOOK
}

enum JobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 3.2 Relation Updates to Existing Models

Add to existing models:

```prisma
// In model user:
textbooks_created  Textbook[]

// In model Subject:
textbooks          Textbook[]

// In model Board:
textbooks          Textbook[]
```

---

## 4. API Routes Design

### 4.1 Route Structure

```
/api/admin/textbook-generator/
├── textbooks/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE
│       ├── parse/route.ts    # POST - Parse syllabus text
│       ├── generate/route.ts # POST - Start generation
│       └── pdf/route.ts      # GET - Download PDF
│
├── units/
│   ├── route.ts              # POST (create)
│   └── [id]/
│       └── route.ts          # GET, PATCH, DELETE, reorder
│
├── chapters/
│   ├── route.ts              # POST (create)
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE
│       ├── generate/route.ts # POST - Generate content
│       ├── questions/route.ts # POST - Generate questions
│       └── images/route.ts   # POST - Generate images
│
├── jobs/
│   ├── route.ts              # GET (list jobs)
│   └── [id]/
│       └── route.ts          # GET (status), DELETE (cancel)
│
└── parser/
    └── preview/route.ts      # POST - Preview parsed structure
```

### 4.2 Key API Endpoints

#### 4.2.1 Parse Syllabus Preview
```typescript
// POST /api/admin/textbook-generator/parser/preview
// Input: { rawText: string }
// Output: { parsed: { class, units: [{ title, chapters: [...] }] } }
```

#### 4.2.2 Generate Chapter Content
```typescript
// POST /api/admin/textbook-generator/chapters/[id]/generate
// Input: { options: { includeExamHighlights: boolean, difficulty: 'basic'|'intermediate'|'advanced' } }
// Output: { jobId: number }
```

#### 4.2.3 Generate PDF
```typescript
// GET /api/admin/textbook-generator/textbooks/[id]/pdf
// Output: PDF file stream
```

---

## 5. Frontend Components

### 5.1 Page Structure

```
/admin/textbook-generator/
├── page.tsx                    # Dashboard - list of textbooks
├── layout.tsx                  # Module layout with sidebar
├── new/
│   └── page.tsx               # Create new textbook wizard
├── [id]/
│   ├── page.tsx               # Textbook detail/editor
│   ├── parse/
│   │   └── page.tsx           # Syllabus input & parsing
│   ├── edit/
│   │   └── page.tsx           # Edit textbook structure
│   ├── generate/
│   │   └── page.tsx           # Generation dashboard
│   ├── preview/
│   │   └── page.tsx           # PDF preview
│   └── chapters/
│       └── [chapterId]/
│           └── page.tsx       # Chapter editor
└── settings/
    └── page.tsx               # Module settings (prompts, templates)
```

### 5.2 Core Components

```
/components/textbook-generator/
├── TextbookCard.tsx           # Card display for textbook list
├── TextbookForm.tsx           # Create/edit textbook form
├── SyllabusInput.tsx          # Text area for syllabus input
├── SyllabusParser.tsx         # Parser UI with preview
├── ParsedStructureTree.tsx    # Tree view of parsed structure
├── ChapterEditor.tsx          # Markdown editor for chapter content
├── ChapterPreview.tsx         # Rendered chapter preview
├── QuestionEditor.tsx         # Edit generated questions
├── ImageGallery.tsx           # Manage chapter images
├── GenerationProgress.tsx     # Progress tracking UI
├── PDFPreview.tsx             # In-browser PDF preview
├── ExportOptions.tsx          # PDF export settings
└── PromptTemplateEditor.tsx   # Edit AI prompts
```

### 5.3 UI Wireframes

#### 5.3.1 Textbook Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Textbook Generator                        [+ New Textbook]│
├─────────────────────────────────────────────────────────────┤
│  Filter: [All Streams ▼] [All Classes ▼] [All Status ▼]    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Political Sci   │  │ Physics         │  │ + Create     │ │
│  │ Class XI        │  │ Class XII       │  │   New        │ │
│  │ ████████░░ 80%  │  │ ██░░░░░░░░ 20%  │  │              │ │
│  │ 🟢 Generating   │  │ 🟡 Draft        │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Syllabus Parser
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 Parse Syllabus                              [Parse] [Save]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Raw Syllabus Text       │ │ Parsed Structure            │ │
│ │                         │ │                             │ │
│ │ CLASS XI                │ │ 📘 Class XI                 │ │
│ │ Part A: INDIAN CONST... │ │ └─ 📂 Part A: Indian Const. │ │
│ │ 1. The Constitution:    │ │    ├─ 📄 Ch 1: The Const... │ │
│ │    Why and How?         │ │    │   ├─ Why do we need... │ │
│ │    Why do we need a...  │ │    │   └─ The Authority...  │ │
│ │                         │ │    └─ 📄 Ch 2: Rights...    │ │
│ │                         │ │                             │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.3 Generation Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Generation Progress - Political Science XI               │
├─────────────────────────────────────────────────────────────┤
│ Overall Progress: ████████████░░░░░░░░ 60%                  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Chapter                    │ Content │ Images │ Quiz   │  │
│ ├────────────────────────────┼─────────┼────────┼────────┤  │
│ │ 1. The Constitution        │   ✅    │   ✅   │   ✅   │  │
│ │ 2. Rights in Constitution  │   ✅    │   🔄   │   ⏳   │  │
│ │ 3. Election and Repres...  │   🔄    │   ⏳   │   ⏳   │  │
│ │ 4. The Executive           │   ⏳    │   ⏳   │   ⏳   │  │
│ └────────────────────────────┴─────────┴────────┴────────┘  │
│                                                              │
│ [Pause Generation] [Skip to PDF] [View Logs]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. AI Prompt Engineering

### 6.1 Syllabus Parser Prompt

```typescript
const PARSER_SYSTEM_PROMPT = `You are an expert at parsing educational syllabus documents.
Given raw MBSE (Mizoram Board of School Education) syllabus text, extract and structure it into JSON.

Rules:
1. Identify class level (XI or XII)
2. Identify parts/units (e.g., "Part A: INDIAN CONSTITUTION AT WORK")
3. Extract chapter numbers and titles
4. Identify subtopics (items after semicolons or bullet points)
5. Preserve the exact hierarchy

Output JSON Schema:
{
  "class": "XI" | "XII",
  "stream": "Arts" | "Science" | "Commerce" | null,
  "subject": string,
  "units": [
    {
      "title": string,
      "chapters": [
        {
          "number": string,
          "title": string,
          "subtopics": string[]
        }
      ]
    }
  ]
}`;
```

### 6.2 Chapter Content Generation Prompt

```typescript
const CHAPTER_GENERATION_PROMPT = `You are an expert teacher preparing textbook content for Class {class_level} {subject} following the MBSE/NCERT syllabus.

CHAPTER: {chapter_title}
SUB-TOPICS: {subtopics}

DIRECTIVES:
1. Write content suitable for Class {class_level} students
2. Use simple, clear English
3. Include real-life examples and analogies
4. Structure with proper headings and subheadings
5. Include "Learning Outcomes" at the beginning
6. Add "Key Takeaways" boxes for important concepts
7. Highlight concepts relevant for {exam_types} with special markers
8. For Mizoram-specific topics, include local context and examples

OUTPUT FORMAT:
Return the chapter content in Markdown format with the following structure:
- Learning Outcomes (bullet list)
- Main content with H2/H3 headings
- Key Takeaway boxes (use blockquotes)
- Exam relevance notes (use callout syntax)

Also return metadata:
- estimated_reading_time: number (in minutes)
- difficulty_level: "basic" | "intermediate" | "advanced"
- key_terms: string[] (important vocabulary)
- image_suggestions: { type: string, description: string, placement: string }[]`;
```

### 6.3 Question Generation Prompt

```typescript
const QUESTION_GENERATION_PROMPT = `Based on the following chapter content from Class {class_level} {subject}:

{chapter_content}

Generate practice questions following MBSE/CBSE/CUET patterns:

1. Generate 5 Multiple Choice Questions (MCQs):
   - Each with 4 options (A, B, C, D)
   - Include correct answer and explanation
   - Mix difficulty levels
   - 2 should be CUET-style application questions

2. Generate 3 Short Answer Questions (2-3 marks):
   - Should test understanding, not just recall
   - Include expected answer points

3. Generate 1 Long Answer Question (5 marks):
   - Should require critical thinking
   - Include marking scheme with key points

Return as JSON with proper structure.`;
```

### 6.4 Image Generation Prompts

```typescript
const IMAGE_PROMPTS = {
  DIAGRAM: `Educational diagram for Class {class_level} {subject}: {description}. 
    Style: Clean, textbook-quality, labeled appropriately, black and white line art with minimal shading.
    Must be scientifically accurate. No decorative elements.`,
  
  MAP: `Educational map for Geography Class {class_level}: {description}.
    Style: Clear political/physical boundaries, proper labels, legend included.
    Focus on Mizoram/India as specified.`,
  
  ANATOMY: `Anatomical diagram for Biology Class {class_level}: {description}.
    Style: Scientific accuracy is paramount. Properly labeled with leader lines.
    Cross-section view if applicable. Textbook quality.`,
  
  CIRCUIT: `Circuit diagram for Physics Class {class_level}: {description}.
    Style: Standard circuit symbols, neat layout, component values labeled.
    Follow NCERT/CBSE conventions.`,
  
  GRAPH: `Mathematical/Scientific graph for Class {class_level}: {description}.
    Style: Proper axes with labels and units, clear data representation.
    Grid lines if needed. Textbook quality.`
};
```

---

## 7. PDF Generation

### 7.1 PDF Structure

```
┌─────────────────────────────────────────┐
│            COVER PAGE                    │
│  Subject Name, Class, Board, Year        │
│  Generated Cover Image                   │
├─────────────────────────────────────────┤
│         TABLE OF CONTENTS                │
├─────────────────────────────────────────┤
│         UNIT 1: Title                    │
│  ┌─────────────────────────────────────┐│
│  │ Chapter 1: Title                    ││
│  │ - Learning Outcomes                 ││
│  │ - Content with images               ││
│  │ - Key Takeaways                     ││
│  │ - Practice Questions                ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ Chapter 2: Title                    ││
│  │ ...                                 ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│         UNIT 2: Title                    │
│         ...                              │
├─────────────────────────────────────────┤
│         APPENDIX                         │
│  - Glossary                              │
│  - Answer Key                            │
│  - Index                                 │
└─────────────────────────────────────────┘
```

### 7.2 PDF Styling

```typescript
const PDF_STYLES = {
  fonts: {
    heading: 'Outfit',      // For headings
    body: 'Noto Sans',      // For body text (supports Mizo characters)
    mono: 'JetBrains Mono'  // For code/formulas
  },
  colors: {
    primary: '#1a365d',     // Dark blue for headings
    secondary: '#2c5282',   // Medium blue for subheadings
    accent: '#ed8936',      // Orange for highlights
    examTag: '#48bb78',     // Green for exam relevance tags
    keyTakeaway: '#f6e05e'  // Yellow for key takeaway boxes
  },
  layout: {
    pageSize: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    headerHeight: 36,
    footerHeight: 24
  }
};
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema migration
- [ ] Basic API routes (CRUD for textbooks, units, chapters)
- [ ] Admin page structure and navigation
- [ ] Textbook list and create form

### Phase 2: Parser Module (Week 3)
- [ ] Syllabus parser service
- [ ] Parser UI with preview
- [ ] Import parsed structure to database
- [ ] Manual structure editor

### Phase 3: Content Generation (Week 4-5)
- [ ] Chapter content generation service
- [ ] Question generation service
- [ ] Generation queue and job tracking
- [ ] Progress dashboard
- [ ] Chapter editor with Markdown support

### Phase 4: Visual Generation (Week 6)
- [ ] Image generation service
- [ ] Image gallery management
- [ ] Image placement in chapters
- [ ] Manual image upload option

### Phase 5: PDF Compilation (Week 7-8)
- [ ] PDF template system
- [ ] React-PDF components
- [ ] Cover page generation
- [ ] Table of contents generation
- [ ] PDF preview
- [ ] Download and export

### Phase 6: Polish & Testing (Week 9-10)
- [ ] Error handling and retry logic
- [ ] User feedback and editing workflow
- [ ] Performance optimization
- [ ] Testing with real MBSE syllabus
- [ ] Documentation

---

## 9. File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── textbook-generator/
│   │       ├── page.tsx
│   │       ├── layout.tsx
│   │       ├── new/page.tsx
│   │       ├── [id]/
│   │       │   ├── page.tsx
│   │       │   ├── parse/page.tsx
│   │       │   ├── edit/page.tsx
│   │       │   ├── generate/page.tsx
│   │       │   ├── preview/page.tsx
│   │       │   └── chapters/[chapterId]/page.tsx
│   │       └── settings/page.tsx
│   │
│   └── api/
│       └── admin/
│           └── textbook-generator/
│               ├── textbooks/
│               │   ├── route.ts
│               │   └── [id]/
│               │       ├── route.ts
│               │       ├── parse/route.ts
│               │       ├── generate/route.ts
│               │       └── pdf/route.ts
│               ├── units/
│               ├── chapters/
│               ├── jobs/
│               └── parser/
│
├── components/
│   └── textbook-generator/
│       ├── TextbookCard.tsx
│       ├── TextbookForm.tsx
│       ├── SyllabusInput.tsx
│       ├── SyllabusParser.tsx
│       ├── ParsedStructureTree.tsx
│       ├── ChapterEditor.tsx
│       ├── ChapterPreview.tsx
│       ├── QuestionEditor.tsx
│       ├── ImageGallery.tsx
│       ├── GenerationProgress.tsx
│       ├── PDFPreview.tsx
│       ├── PDFDocument.tsx
│       └── ExportOptions.tsx
│
├── lib/
│   └── textbook-generator/
│       ├── parser.ts           # Syllabus parsing logic
│       ├── content-generator.ts # AI content generation
│       ├── question-generator.ts
│       ├── image-generator.ts
│       ├── pdf-generator.ts
│       ├── prompts.ts          # AI prompt templates
│       └── types.ts            # TypeScript types
│
└── services/
    └── textbook-generator/
        └── queue.ts            # Job queue management
```

---

## 10. Dependencies to Add

```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.4.0",
    "react-markdown": "^9.0.0",
    "rehype-katex": "^7.0.0",
    "remark-math": "^6.0.0",
    "@uiw/react-md-editor": "^4.0.0",
    "zustand": "^4.5.0"
  }
}
```

---

## 11. AI Model Configuration

### 11.1 Model Selection Strategy

Since this textbook content will serve as the **foundation for quiz generation in the main Zirna app**, we prioritize **quality over cost**. Poor quality textbook content will propagate errors throughout the entire learning system.

**🎉 Gemini 3 Pro is now available!** According to Google's documentation, it's their most capable model with stepwise improvements over Gemini 2.5 Pro, featuring dynamic thinking and advanced reasoning.

| Task | Primary Model | Fallback Model | Rationale |
|------|--------------|----------------|-----------|
| **Chapter Content Generation** | `gemini-3-pro-preview` ⭐ | `gemini-2.5-pro` | Most capable model with advanced reasoning |
| **Question Generation** | `gemini-3-pro-preview` ⭐ | `gemini-2.5-pro` | Best for pedagogically sound questions |
| **Syllabus Parsing** | `gemini-2.0-flash` | - | Structured extraction is simpler, Flash is sufficient |
| **Image Generation** | `imagen-3.0-generate-002` | - | Best available for educational diagrams |
| **Content Summarization** | `gemini-2.0-flash` | - | Summarization is less critical |

### 11.2 Model Configuration

```typescript
// lib/textbook-generator/models.ts

export const TEXTBOOK_AI_MODELS = {
  // Primary model for high-quality content generation (BEST AVAILABLE)
  CONTENT_PRIMARY: 'gemini-3-pro-preview',
  
  // Fallback if primary fails
  CONTENT_FALLBACK: 'gemini-2.5-pro',
  
  // For structured parsing (JSON extraction) - Flash is sufficient
  PARSER: 'gemini-2.0-flash',
  
  // For image generation
  IMAGE: 'imagen-3.0-generate-002',
} as const;

// Gemini 3 Pro specific configuration
export const GEMINI_3_CONFIG = {
  // Use high thinking level for complex educational content
  thinkingLevel: 'high' as const,  // 'low' | 'high'
  
  // Temperature: Google recommends 1.0 (default) for Gemini 3
  // Lower values may cause looping issues
  temperature: 1.0,
  
  // For PDF/document processing
  mediaResolution: 'high' as const,
};

// Model capabilities and token limits
export const MODEL_LIMITS = {
  'gemini-3-pro-preview': {
    maxInputTokens: 1_000_000,
    maxOutputTokens: 65_536,
    thinkingEnabled: true,
    // Pricing TBD - check https://ai.google.dev/gemini-api/docs/pricing
  },
  'gemini-2.5-pro': {
    maxInputTokens: 1_000_000,
    maxOutputTokens: 65_536,
    costPerMillionInput: 1.25,    // USD per 1M input tokens
    costPerMillionOutput: 10.00,  // USD per 1M output tokens
  },
  'gemini-2.0-flash': {
    maxInputTokens: 1_000_000,
    maxOutputTokens: 8_192,
    costPerMillionInput: 0.10,
    costPerMillionOutput: 0.40,
  },
} as const;
```

### 11.3 Gemini 3 Pro Best Practices

Based on Google's documentation:

1. **Thinking Level**: Use `thinkingLevel: 'high'` for complex educational content generation. This maximizes reasoning depth.

2. **Simplified Prompts**: Gemini 3 responds better to concise, direct instructions. Remove complex prompt engineering techniques (like explicit Chain-of-thought) as the model handles reasoning internally.

3. **Temperature**: Keep at default (1.0). Lower values may cause looping issues.

4. **Context Placement**: For long documents, place instructions at the END of the prompt, after the data context. Start questions with "Based on the information above...".

### 11.4 Cost Estimation

**Per Textbook (estimated 15 chapters):**

| Task | Model | Notes |
|------|-------|-------|
| Chapter Content (x15) | `gemini-3-pro-preview` | May use more tokens due to thinking, but higher quality |
| Questions (x15) | `gemini-3-pro-preview` | Better pedagogical alignment |
| Parsing | `gemini-2.0-flash` | Fast and cost-effective |

> 💡 **Note:** Gemini 3 Pro pricing may differ from 2.5 Pro. Check the [official pricing page](https://ai.google.dev/gemini-api/docs/pricing) for current rates. This is a one-time generation cost that will serve thousands of students.

---

## 12. Environment Variables

```env
# Textbook Generator Settings
TEXTBOOK_GEN_ENABLED=true
TEXTBOOK_GEN_MAX_CONCURRENT_JOBS=3

# AI Models (use highest quality for textbook generation)
TEXTBOOK_GEN_CONTENT_MODEL=gemini-3-pro-preview
TEXTBOOK_GEN_PARSER_MODEL=gemini-2.0-flash
TEXTBOOK_GEN_IMAGE_MODEL=imagen-3.0-generate-002

# Gemini 3 specific settings
TEXTBOOK_GEN_THINKING_LEVEL=high

# Fallback model if primary fails
TEXTBOOK_GEN_FALLBACK_MODEL=gemini-2.5-pro

# Storage
TEXTBOOK_GEN_PDF_STORAGE_PATH=/uploads/textbooks

# Quality settings
TEXTBOOK_GEN_ENABLE_HUMAN_REVIEW=true
TEXTBOOK_GEN_AUTO_GENERATE_QUESTIONS=true
TEXTBOOK_GEN_AUTO_GENERATE_IMAGES=true
```

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Syllabus parsing accuracy | > 95% |
| Chapter generation time | < 2 minutes per chapter |
| PDF generation time | < 30 seconds for full textbook |
| Content quality score (human review) | > 4/5 |
| Question relevance score | > 80% aligned with syllabus |

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI hallucination in content | High | Human review workflow, fact-checking prompts |
| Image generation quality | Medium | Allow manual upload alternative, iterative prompt refinement |
| PDF generation memory issues | Medium | Chunked generation, streaming PDF |
| Syllabus format variations | Medium | Multiple parser patterns, manual override option |
| Cost overrun on AI calls | Medium | Usage tracking, batch processing, caching |

---

## 15. Future Enhancements

1. **Multi-language support** - Generate content in Mizo/Hindi
2. **Collaborative editing** - Multiple admins can work on same textbook
3. **Version control** - Track changes across revisions
4. **Student feedback integration** - Improve based on student usage
5. **Audio narration** - Text-to-speech for accessibility
6. **Interactive elements** - QR codes linking to videos/quizzes
7. **Print-ready export** - Professional printing specifications

---

## 16. Getting Started

Once this plan is approved, the implementation will begin with:

1. **Create Prisma migration** for new database models
2. **Set up the admin module folder structure**
3. **Create the textbook dashboard page**
4. **Implement basic CRUD APIs**

Shall we proceed with Phase 1?
