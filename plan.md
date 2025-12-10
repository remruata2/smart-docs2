# Zirna: Multi-Tenant Education Platform Transformation

## Project Overview

Transform the existing Next.js "smart-docs" application into a scalable, multi-tenant education platform called **Zirna** (with international variants like Africa-Tutor). The platform will support:

- **Multiple education systems**: K-12 schools (CBSE, MBSE, state boards), Higher Education (colleges, universities), Competitive Exams (UPSC, IIT-JEE, Banking), Professional Courses (Medical, Engineering, Law).
- **Flexible hierarchy**: Board → Institution (School/College/University/Coaching Center) → Program (Class 10, B.Tech IT, UPSC CSE) → Subject → Chapter.
- **Subject and chapter-level content filtering**: To achieve near-zero hallucinations in AI responses.
- **JSON API for React Native mobile app**: Offline-first sync for low-connectivity markets (rural India, Nigeria, Pakistan, Philippines).
- **International expansion**: Starting with India (IN), Nigeria (NG), Pakistan (PK), Philippines (PH).
- **Admin dashboard**: For content ingestion, board management, and analytics.
- **Monetization**: Stripe subscriptions (user-level premium for unlimited chat/quizzes/offline; institution-level bulk licensing).
- **Core Tech Stack**: Next.js 15 (App Router), NextAuth.js (Credentials + Google OAuth), Prisma ORM (for web/admin) + Supabase client (for mobile RLS), PostgreSQL + pgvector (hybrid search), LlamaParse for PDF processing.

**Success Metrics**:
- Zero hallucinations when `chapter_id` is specified.
- <100ms response time for board-filtered searches.
- 99.9% uptime for mobile API.
- Support for 10+ boards at launch (academic + competitive exams).
- Offline sync for 80% of users in target markets.

**Key Assumptions**:
- Start with existing codebase (Next.js 15, Prisma + PostgreSQL/pgvector, hybrid search on `file_chunks`).
- Migrate to Supabase for mobile APIs (hosted PostgreSQL with RLS for multi-tenancy security).
- Target: 100k users in Year 1, scaling to 1M+ with international expansion.

## ⚠️ Critical Technical Constraints & Rules

These are **non-negotiable** and override any conflicting plan elements. Append to all docs.

### 1. Database Access Strategy (Security)
| Route / Context                  | Allowed DB Client                  | Reason                                                                 |
|----------------------------------|------------------------------------|------------------------------------------------------------------------|
| `/admin/**` (all admin pages)    | Prisma direct                      | Admins are super-users → full access to all tenants for content mgmt.   |
| `/api/mobile/**` (all endpoints) | **ONLY** Supabase client (`createClient`) | Enforces RLS for board isolation. Prisma bypasses RLS → data leak risk. |
| `/api/dashboard/**` (web chat)   | Prisma + manual board_id filtering | Server-side → enforce filters in app code (fast & safe).                |
| Cron jobs / background workers   | Prisma direct                      | Run as service role (full access).                                      |

- **Rule**: Never use Prisma in mobile routes. Always verify `user.program_id` or `user.institution.board_id` in web routes.
- **New Env Vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Vector Search & Multi-Tenancy
- **Mandatory Filter**: Every vector/hybrid search **MUST** include `board_id` metadata filter.
  ```ts
  // src/lib/hybrid-search.ts (enforced in all calls)
  const baseFilter = { board_id: { equals: user.institution.board_id } };  // ALWAYS
  if (chapterId) baseFilter.chapter_id = { equals: chapterId };
  // ... query with filter
  ```
- No search without this for non-admins. Use pgvector's metadata filtering + GIN indexes.

### 3. Offline Sync Protocol
- Follow **WatermelonDB-style** pull/push (battle-tested for offline apps).
  - `GET /api/mobile/sync/pull?last_pulled_at=<timestamp>`: Returns delta changes (created/updated/deleted) since timestamp.
  - `POST /api/mobile/sync/push`: Upload local changes (e.g., quiz scores).
- Add `last_sync_at` (Unix ms) to `Profile` for efficient deltas.
- Conflict Resolution: Server wins for content; client wins for user data (scores/notes) with timestamp checks.

### 4. Content Structure (Global vs. Board-Specific)
- `Chapter.accessible_boards`: `[]` (empty) = board-specific; `null` or `['CBSE', 'MBSE']` = shared across boards; `is_global=true` = accessible to all.
- **RLS Policies** (create in Supabase SQL Editor):
  ```sql
  CREATE POLICY "Users can read chapters for their board"
  ON chapters FOR SELECT USING (
    is_global = true OR 
    auth.jwt()->>'board_id' = ANY(accessible_boards)
  );
  -- Duplicate for chapter_chunks, chapter_pages, subjects.
  ```
- Enable RLS on all tenant tables immediately.

### 5. Premium Strategy (Simplified)
- **User-Level**: `Profile.is_premium` gates unlimited chat/quizzes/offline sync (via Stripe subs).
- **Chapter-Level**: No `is_premium` on chapters (all content free; monetize access/features).
- Institution-Level: `Institution.license_expiry` auto-disables students post-expiry.

## Current State Analysis
- **Architecture**: Next.js 15 (App Router), NextAuth.js, Prisma + PostgreSQL/pgvector, hybrid search (`file_chunks`), LlamaParse PDFs, bounding boxes for citations, roles (admin/staff/user), Stripe.
- **Key Files**:
  - `prisma/schema.prisma`: Current schema (now revised).
  - `src/lib/hybrid-search.ts`: Search impl.
  - `src/lib/ai-service-enhanced.ts`: Chat processing.
  - `src/lib/llamaparse-document-parser.ts`: PDF parsing.
- **Migration Goal**: Transform `FileList`/`FileChunk` to chapter-based with board isolation and extended hierarchy support.

## Enhanced Database Schema (REVISED)

(Prisma models; run `prisma migrate dev` after Phase 1.)

### 1.1 Core Multi-Tenancy Tables

```prisma
model Country {
  id   String @id // 'IN', 'NG', 'PK', 'PH'
  name String // 'India', 'Nigeria'...
  currency String // '₹', '₦'...
  locale String @default("en")
  is_active Boolean @default(true)

  boards Board[]

  @@map("countries")
}

model Board {
  id         String   @id // 'CBSE', 'MBSE', 'IIT-JEE', 'UPSC', 'WAEC'
  name       String   // 'Central Board of Secondary Education', 'Union Public Service Commission'
  country_id String   @default("IN")
  state      String?  // 'Mizoram' (null for national/central)
  type       String   @default("academic") // 'academic', 'competitive_exam', 'professional'
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  country      Country       @relation(fields: [country_id], references: [id])
  institutions Institution[]
  programs     Program[]
  chunkBoards  ChapterChunkBoard[]

  @@index([country_id, is_active])
  @@index([type])
  @@map("boards")
}

// Replaces old "School" - supports schools, colleges, universities, coaching centers
model Institution {
  id             BigInt   @id @default(autoincrement())
  board_id       String
  name           String
  type           String   // 'school', 'college', 'university', 'coaching_center'
  district       String?
  state          String?
  license_expiry DateTime?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())

  board    Board     @relation(fields: [board_id], references: [id])
  programs Program[]
  profiles Profile[]

  @@index([board_id, is_active])
  @@index([type])
  @@map("institutions")
}

// NEW: Represents Class 10, B.Tech IT, MBBS Year 2, UPSC Prelims, CA Foundation, etc.
model Program {
  id             Int      @id @default(autoincrement())
  board_id       String
  institution_id BigInt?  // null for board-level programs (e.g., UPSC CSE, IIT-JEE)
  name           String   // 'Class 10', 'B.Tech - IT', 'MBBS - Year 2', 'UPSC Civil Services', 'CA Foundation'
  code           String?  // 'CLS10', 'BTECH_IT', 'MBBS_Y2', 'UPSC_CSE', 'CA_FOUND'
  level          String?  // 'secondary', 'undergraduate', 'postgraduate', 'competitive', 'professional'
  duration_years Int?     // 1, 4, 5, etc. (null for one-time exams like UPSC)
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())

  board       Board        @relation(fields: [board_id], references: [id])
  institution Institution? @relation(fields: [institution_id], references: [id])
  subjects    Subject[]
  profiles    Profile[]

  @@unique([board_id, institution_id, name])
  @@index([board_id, level])
  @@map("programs")
}

model Profile {
  id            Int      @id @default(autoincrement())
  user_id       Int      @unique
  institution_id BigInt? // null for self-paced learners (e.g., job seekers studying independently)
  program_id    Int?     // null until program selected during onboarding
  is_premium    Boolean  @default(false)
  last_sync_at  BigInt?  // Unix ms for mobile sync

  user        user         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  institution Institution? @relation(fields: [institution_id], references: [id])
  program     Program?     @relation(fields: [program_id], references: [id])

  @@index([institution_id])
  @@index([program_id])
  @@map("profiles")
}
```

### 1.2 Content Organization Tables (REVISED HIERARCHY)

**Key Change**: Subjects now linked to **Programs**, not Boards directly.

```prisma
// Subjects belong to programs (e.g., Physics for Class 10, Data Structures for B.Tech IT)
model Subject {
  id         Int      @id @default(autoincrement())
  program_id Int      // Required: subjects belong to programs
  name       String   // 'Physics', 'Data Structures', 'General Studies', 'Pharmacology'
  code       String?  // 'PHY', 'DS', 'GS', 'PHARM'
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  program  Program   @relation(fields: [program_id], references: [id])
  chapters Chapter[]

  @@unique([program_id, name])
  @@index([program_id])
  @@map("subjects")
}



model Chapter {

  id                BigInt   @id @default(autoincrement())

  subject_id        Int

  title             String   // 'Chapter 6: Life Processes'

  chapter_number    Int?

  content_json      Json     // LlamaParse output

  version_id        String   @default(cuid()) // For sync

  accessible_boards String[]? // null=global; array=board-specific (enforced by RLS)

  is_active         Boolean  @default(true)

  created_at        DateTime @default(now())

  updated_at        DateTime @updatedAt

  parsed_at         DateTime?



  subject Subject       @relation(fields: [subject_id], references: [id])

  chunks  ChapterChunk[]

  pages   ChapterPage[]

  // Junction for perf (avoids array bloat)

  chunkBoards ChapterChunkBoard[]



  @@index([subject_id, chapter_number])

  @@index([accessible_boards], type: Gin) // For RLS

  @@map("chapters")

}



model ChapterChunk {

  id             BigInt   @id @default(autoincrement())

  chapter_id     BigInt

  chunk_index    Int

  content        String

  page_number    Int?

  bbox           Json?    // Bounding box

  search_vector  Unsupported("tsvector")?

  semantic_vector Unsupported("vector")?

  subject_id     Int?     // Denormalized

  created_at     DateTime @default(now())



  chapter        Chapter   @relation(fields: [chapter_id], references: [id], onDelete: Cascade)

  chunkBoards    ChapterChunkBoard[]



  @@index([chapter_id, chunk_index])

  @@index([search_vector], type: Gin)

  @@index([semantic_vector])

  @@index([subject_id])

  @@map("chapter_chunks")

}



// Junction table for board access (scales better than array)

model ChapterChunkBoard {

  chunk_id  BigInt

  board_id  String

  @@id([chunk_id, board_id])

  chunk     ChapterChunk @relation(fields: [chunk_id], references: [id], onDelete: Cascade)

  board     Board        @relation(fields: [board_id], references: [id])

  @@index([board_id])

  @@map("chapter_chunk_boards")

}



model ChapterPage {

  id        BigInt   @id @default(autoincrement())

  chapter_id BigInt

  page_number Int

  image_url String

  width     Int?

  height    Int?

  created_at DateTime @default(now())



  chapter Chapter @relation(fields: [chapter_id], references: [id], onDelete: Cascade)



  @@index([chapter_id, page_number])

  @@map("chapter_pages")

}

```

## Hierarchy Usage Examples

### Example 1: K-12 Student (Class 10, CBSE)
```
Board: CBSE (id: 'CBSE', type:  'academic')
  └─ Institution: "Delhi Public School" (id: 123, type: 'school')
      └─ Program: "Class 10" (id: 1, level: 'secondary')
          └─ Subjects: Physics, Chemistry, Biology, Math
              └─ Chapters: "Chapter 1: Light", "Chapter 2: Electricity", etc.
```
**Profile**: `institution_id=123`, `program_id=1`

### Example 2: College Student (B.Tech IT, Mumbai University)
```
Board: Mumbai University (id: 'MU', type: 'academic')
  └─ Institution: "Sardar Patel Institute of Technology" (id: 456, type: 'college')
      └─ Program: "B.Tech - Information Technology" (id: 50, level: 'undergraduate', duration: 4 years)
          └─ Subjects: Data Structures, Algorithms, DBMS, OS
              └─ Chapters: "DS Chapter 1: Arrays", "Algorithms Chapter 3: Sorting", etc.
```
**Profile**: `institution_id=456`, `program_id=50`

### Example 3: Competitive Exam Aspirant (UPSC Civil Services)
```
Board: UPSC (id: 'UPSC', type: 'competitive_exam')
  └─ Institution: null (board-level program)
      └─ Program: "UPSC Civil Services Examination" (id: 100, institution_id: null, level: 'competitive')
          └─ Subjects: General Studies Paper I, II, III, IV, History, Geography
              └─ Chapters: "GS-I: Indian Heritage", "GS-II: Governance", etc.
```
**Profile**: `institution_id=null`, `program_id=100` (self-paced learner)

### Example 4: Medical Student (MBBS, AIIMS Delhi)
```
Board: Medical Council of India (id: 'MCI', type: 'professional')
  └─ Institution: "AIIMS Delhi" (id: 789, type: 'university')
      └─ Program: "MBBS - Year 2" (id: 200, level: 'professional', duration: 5 years)
          └─ Subjects: Anatomy, Physiology, Biochemistry, Pharmacology
              └─ Chapters: "Pharmacology Chapter 5: ANS Drugs", etc.
```
**Profile**: `institution_id=789`, `program_id=200`

### Key Flexibility
- **Board-Level Programs** (`institution_id=null`): For standardized exams like UPSC, IIT-JEE, CA, Banking PO.
- **Institution-Level Programs**: For colleges, universities, schools with their own curricula.
- **Self-Paced Learners** (`institution_id=null`): Job seekers, independent learners can enroll directly in programs.

### 1.3 Optimizations

- **Vector Indexes**: Composite on `(board_id, subject_id)` via junction.

- **Partitioning**: Partition `chapter_chunks` by `board_id` for >1M chunks.

- **Caching**: Redis for board-specific manifests/subjects.



## Implementation Phases

### Phase 0: Supabase Setup (1 week – Do FIRST!)

1. Sign up for Supabase project (hosted PostgreSQL).

2. Enable RLS on all tables (new + existing).

3. Create the 4 RLS policies (see Rule #4).

4. Generate keys; add to `.env`.

5. Test: Insert global chapter; query as different `board_id` JWTs.



### Phase 1: Multi-Tenant Database Schema + Migration (2 weeks - REVISED)

1. Add new tables (Country, Board, Institution, Program, Profile enhancements, Subject, Chapter, ChapterChunk, ChapterPage, ChapterChunkBoard).

2. **Key Changes from Old Schema**:
   - Replace `School` with `Institution` (supports school/college/university/coaching_center).
   - Add `Program` model to represent Class 10, B.Tech IT, UPSC CSE, etc.
   - Link `Subject` to `Program` (not directly to Board).
   - Update `Profile` to link to `institution_id` and `program_id` (remove `board_id`, ` class_level`, `subject_focus`).

3. **Migration Script** (`scripts/migrate-to-chapters.ts`):
   - Map `FileList` to `Subject`/`Chapter`.
   - `FileChunk` → `ChapterChunk` + junction for default board (e.g., 'CBSE').
   - Re-embed vectors with `board_id` metadata.
   - Keep old tables for 1-month rollback.

4. Seed defaults: 
   - Countries: IN, NG, PK, PH
   - Boards: CBSE, MBSE, WAEC, UPSC, IIT-JEE
   - Create default programs for each board (e.g., Class 10, Class 12 for CBSE)
   - Seed global subjects

5. Force `program_id` on `Profile` during onboarding (UI modal on first login: select institution → program).

6. Add institution license expiry logic (cron to disable expired).



### Phase 2: Enhanced RAG with Subject/Chapter Filtering (2 weeks)

1. Update `src/lib/hybrid-search.ts`:

   - New interface: `{ board_id: string (req), subject_id?: number, chapter_id?: number, class_level?: number }`.

   - Enforce baseFilter (Rule #2).

   - Logic: chapter_id → exact; subject_id → subject-wide; board_id only → all accessible.

   - Use RRF with metadata filters.

2. Update `src/lib/ai-service-enhanced.ts`:

   - Accept filters; pass to search.

   - Prompt: "Answer about [Subject] Chapter [N] for [Board] students."

3. Update `src/app/api/dashboard/chat/route.ts`:

   - Req: `{ message, context: { board_id, subject_id?, chapter_id? } }`.

   - Manual board filter for web.



### Phase 3: Mobile API Endpoints (3 weeks)

1. Migrate all mobile routes to Supabase client (Rule #1).

2. **Auth**: `GET /api/mobile/auth/exchange` → `{ user_id, board_id, class_level, is_premium, subjects }` (from JWT).

3. **Sync** (WatermelonDB-style, Rule #3):

   - `GET /pull?last_pulled_at=<ts>`: Delta for chapters/chunks/pages (filter by board via RLS).

   - `POST /push`: Upload scores/notes (upsert with timestamps).

4. **Content**: `GET /content/[id]` → `content_json` + chunks/pages (RLS-enforced).

5. **Chat**: `POST /chat` → Streaming; pass context filters.

6. Security: Verify premium for sync; rate-limit per board.



### Phase 4: Admin Content Ingestion Dashboard (2 weeks)

1. `src/app/admin/boards/page.tsx`: CRUD for boards/countries; stats (chapters/users).

2. `src/app/admin/chapters/new/page.tsx`: Upload PDF → LlamaParse → review/save (select boards for accessibility).

3. `src/app/admin/chapters/page.tsx`: List/filter (board/subject/class); edit metadata; bulk import (JSON/MD fallback to cut LlamaParse costs).

4. Bulk tools: Re-process PDFs; set global accessibility.

5. Analytics: Track hallucinations per chapter (log queries).



### Phase 5: User-Facing Chapter Selection UI (2 weeks)

1. `src/app/dashboard/chapters/page.tsx`: Board-subjects → chapters; preview images; "Ask AI" button.

2. `src/app/dashboard/chat/page.tsx`: Chapter selector; "Focus Mode" (chapter_id) vs "Global"; pass to API.

3. Onboarding: Board/school/class selector (force before chat).



### Phase 6: International Expansion Support (1 week)

1. Seed international boards (WAEC, etc.).

2. `src/lib/i18n.ts`: Locale/currency per country (en/hi; ₹/₦).

3. `src/middleware.ts`: IP geo-detect → suggest board; manual override.

4. Test: NG user sees only WAEC content.



### Phase 7: Repository Setup (1 day)

1. New repo: `zirna-platform`.

2. Copy codebase; update `package.json`/`README`.

3. `.github/workflows`: CI (lint/test/migrate); CD to Vercel/Supabase.

4. Env: Add `DEFAULT_BOARD_ID=CBSE`, `SUPPORTED_COUNTRIES=IN,NG,PK,PH`, `MOBILE_API_SECRET`.



### Phase 8: Data Migration & Testing (1 week)

1. Run `migrate-to-chapters.ts` on staging DB.

2. `scripts/seed-boards.ts`: Load defaults.

3. E2E Tests: Board isolation, sync deltas, zero hallucinations.

4. Perf: <100ms searches; CDN for images (Cloudinary).



## Additional Suggestions

| Area              | Enhancement                                                                 |

|-------------------|-----------------------------------------------------------------------------|

| **Quizzes**       | Auto-generate MCQs from chunks (Gemini-1.5-flash); sync scores offline.     |

| **Analytics**     | Track query → chunk → hallucination; prioritize re-parsing.                 |

| **Billing**       | School expiry cron; user premium → unlimited (no chapter gates).            |

| **Perf/Security** | Redis for manifests; RLS on all; rate-limit per board.                      |

| **Monitoring**    | Tokens/query per board; alert on slow searches.                             |



## Revised Timeline & Priority

- **Total: 14 weeks** (3 months).

- Order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

- MVP Launch: After Phase 3 (mobile + core RAG).

- Post-Launch: Quizzes, localization.