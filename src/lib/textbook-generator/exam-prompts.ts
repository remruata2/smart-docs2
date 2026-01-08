/**
 * Exam-Specific Prompt Instructions
 * 
 * Modular prompt system for different exam categories.
 * Each exam category has unique question patterns, content focus, and assessment styles.
 */

// Available exam categories
export const EXAM_CATEGORIES = [
   'academic_board',      // CBSE, MBSE, State Boards
   'engineering',         // JEE Main, JEE Advanced
   'medical',             // NEET, AIIMS
   'government_prelims',  // UPSC Prelims, MPSC, SSC CGL
   'government_mains',    // UPSC Mains, State Mains
   'banking',             // IBPS, SBI PO, RBI Grade B
   'university',          // College/University exams
   'general',             // Default fallback
] as const;

export type ExamCategory = typeof EXAM_CATEGORIES[number];

// Exam category labels for UI
export const EXAM_CATEGORY_LABELS: Record<ExamCategory, string> = {
   academic_board: 'Academic (Board Exams)',
   engineering: 'Engineering (JEE)',
   medical: 'Medical (NEET)',
   government_prelims: 'Government Prelims (UPSC/MPSC/SSC)',
   government_mains: 'Government Mains (UPSC/State)',
   banking: 'Banking & Finance (IBPS/SBI)',
   university: 'University/College',
   general: 'General Purpose',
};

// Specific exam names within each category
export const EXAM_TYPES_BY_CATEGORY: Record<ExamCategory, string[]> = {
   academic_board: ['CBSE', 'MBSE', 'ICSE', 'State Board'],
   engineering: ['JEE Main', 'JEE Advanced', 'BITSAT', 'VITEEE'],
   medical: ['NEET', 'AIIMS', 'JIPMER'],
   government_prelims: ['UPSC Prelims', 'MPSC', 'MPPSC', 'SSC CGL', 'SSC CHSL', 'State PSC'],
   government_mains: ['UPSC Mains', 'State Mains', 'Essay Paper'],
   banking: ['IBPS PO', 'IBPS Clerk', 'SBI PO', 'SBI Clerk', 'RBI Grade B', 'NABARD'],
   university: ['Semester Exam', 'Annual Exam', 'Entrance Exam'],
   general: ['General Study'],
};

/**
 * Content configuration per exam category
 * Determines depth, question counts, and example requirements
 */
export const EXAM_CONTENT_CONFIG: Record<ExamCategory, {
   chapterDepth: 'concise' | 'comprehensive' | 'exhaustive';
   minWordsPerSection: number;
   examplesPerConcept: number;
   mcqCount: number;
   shortAnswerCount: number;
   longAnswerCount: number;
   minImagesPerChapter: number;
   specialFormats: string[];
}> = {
   academic_board: {
      chapterDepth: 'comprehensive',
      minWordsPerSection: 1000,
      examplesPerConcept: 3,
      mcqCount: 25, // Increased from 15 for better drill
      shortAnswerCount: 10,
      longAnswerCount: 5,
      minImagesPerChapter: 10,
      specialFormats: ['Competency-Based', 'Case Study', 'Practical Skill Box', 'HOTS Questions']
   },
   engineering: {
      chapterDepth: 'exhaustive',
      minWordsPerSection: 1200,
      examplesPerConcept: 5,
      mcqCount: 30, // Increased for practice
      shortAnswerCount: 5,
      longAnswerCount: 3,
      minImagesPerChapter: 5,
      specialFormats: ['Integer Type', 'Matrix Match', 'Paragraph Questions', 'Multi-Correct MCQ']
   },
   medical: {
      chapterDepth: 'exhaustive',
      minWordsPerSection: 1200,
      examplesPerConcept: 4,
      mcqCount: 40, // High drill volume needed
      shortAnswerCount: 5,
      longAnswerCount: 2,
      minImagesPerChapter: 15,
      specialFormats: ['Assertion-Reason', 'Match Columns', 'Diagram Based', 'Statement Based']
   },
   government_prelims: {
      chapterDepth: 'concise',
      minWordsPerSection: 500,
      examplesPerConcept: 2,
      mcqCount: 50, // Increased for speed drill
      shortAnswerCount: 0,
      longAnswerCount: 0,
      minImagesPerChapter: 5,
      specialFormats: ['Statement Based', 'Match Columns', 'Map Based']
   },
   government_mains: {
      chapterDepth: 'exhaustive',
      minWordsPerSection: 1500,
      examplesPerConcept: 3,
      mcqCount: 0,
      shortAnswerCount: 8,
      longAnswerCount: 5,
      minImagesPerChapter: 5,
      specialFormats: ['Case Study', 'Essay', 'Policy Analysis']
   },
   banking: {
      chapterDepth: 'concise',
      minWordsPerSection: 400,
      examplesPerConcept: 10,
      mcqCount: 40, // Increased speed drill
      shortAnswerCount: 0,
      longAnswerCount: 0,
      minImagesPerChapter: 5,
      specialFormats: ['Data Interpretation', 'Puzzles', 'Inequality']
   },
   university: {
      chapterDepth: 'comprehensive',
      minWordsPerSection: 1000,
      examplesPerConcept: 4,
      mcqCount: 20,
      shortAnswerCount: 8,
      longAnswerCount: 5,
      minImagesPerChapter: 5,
      specialFormats: ['Long Essay', 'Short Note', 'Practical Viva']
   },
   general: {
      chapterDepth: 'comprehensive',
      minWordsPerSection: 800,
      examplesPerConcept: 3,
      mcqCount: 15,
      shortAnswerCount: 5,
      longAnswerCount: 3,
      minImagesPerChapter: 5,
      specialFormats: []
   },
};

/**
 * Get exam-specific instructions based on exam category
 * Includes content config header for context
 */
export function getExamInstructions(category: ExamCategory, specificExams?: string[]): string {
   const config = EXAM_CONTENT_CONFIG[category];
   const contentHeader = `
📊 CONTENT REQUIREMENTS FOR THIS EXAM CATEGORY:
- Depth Level: ${config.chapterDepth.toUpperCase()}
- Minimum ${config.minWordsPerSection} words per major section
- Include ${config.examplesPerConcept} solved examples per concept
- **Minimum Images to Generate: ${config.minImagesPerChapter}**
- Special Formats: ${config.specialFormats.join(', ')}

🎯 ASSESSMENT REQUIREMENTS (MUST BE IN A DEDICATED FLUSH-OUT SECTION AT THE END):
- MCQs: Generate exactly ${config.mcqCount} High-Quality Questions
- Short Answers: ${config.shortAnswerCount} Questions
- Long Answers: ${config.longAnswerCount} Questions
`;

   switch (category) {
      case 'academic_board':
         return contentHeader + getAcademicBoardInstructions(specificExams);
      case 'engineering':
         return contentHeader + getEngineeringInstructions(specificExams);
      case 'medical':
         return contentHeader + getMedicalInstructions(specificExams);
      case 'government_prelims':
         return contentHeader + getGovernmentPrelimsInstructions(specificExams);
      case 'government_mains':
         return contentHeader + getGovernmentMainsInstructions(specificExams);
      case 'banking':
         return contentHeader + getBankingInstructions(specificExams);
      case 'university':
         return contentHeader + getUniversityInstructions(specificExams);
      default:
         return contentHeader + getGeneralInstructions();
   }
}

// ============================================
// ACADEMIC BOARD EXAMS (CBSE, MBSE, State Boards)
// ============================================
function getAcademicBoardInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'Board Exams';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: ACADEMIC BOARD EXAMS (${examList}) ***

1. 📝 MARKING SCHEME FOCUS (2024 Pattern):
   - Structure answers according to typical board exam marking schemes
   - Include "Model Answer" boxes showing how to write for full marks
   - Highlight "Keywords for Marks" - terms examiner looks for
   - Show step-by-step solutions with marks distribution
   - **Weightage**: 20% MCQ + 40% Competency-Based + 40% Subjective (CBSE 2024)

2. 📋 QUESTION TYPES (CBSE New Pattern):
   - **1 Mark MCQs**: Direct, factual, definition-based
   - **2-3 Marks**: Short answer, reason-based, diagram-based
   - **5 Marks**: Long answer, derivation, comprehensive explanation
   - **Case-Based/Competency Questions (40% weightage)**:
     - Passage/Data/Source → 4-5 sub-questions
     - Tests application, analysis, and evaluation
     - Include at least 2 case-based sets per chapter

3. 🎯 NCERT ALIGNMENT (Critical):
   - Use NCERT terminology and definitions VERBATIM
   - Include "As per NCERT" callouts for standard definitions
   - NCERT diagrams are frequently asked - describe them precisely
   - Reference NCERT chapter & page numbers where applicable

4. ✍️ PRACTICAL/LAB COMPONENT:
   - Include Viva Questions at the end of practical topics
   - Provide Observation Table templates
   - List common sources of error and precautions
   - For Science subjects: 30 marks practical component

5. 📌 SOURCE-BASED QUESTIONS (for History/Civics):
   - Include historical document excerpts with questions
   - "Read the passage and answer" format
   - Teach source analysis and inference skills

6. 📊 COMPETENCY TESTING:
   - Include real-life application questions
   - Graph/Chart/Data interpretation questions
   - Statement-based reasoning questions
`;
}
// ============================================
// ENGINEERING EXAMS (JEE Main, JEE Advanced)
// ============================================
function getEngineeringInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'JEE';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: ENGINEERING EXAMS (${examList}) ***

1. 🧮 NUMERICAL PROBLEM FOCUS (Critical - 70% of paper):
   - 70% of content should be problem-solving oriented
   - **Integer Type Questions**: Answer is a non-negative integer (0-9999)
     Example: "The maximum velocity attained is ___ m/s"
   - **Numerical Value Questions**: Answer to 2 decimal places
     Example: "The kinetic energy is ___ J (round to 2 decimals)"
   - Show calculator-free techniques and mental math shortcuts

2. 📐 MATRIX MATCH FORMAT (JEE Advanced specialty):
   - Include 2-3 Matrix Match questions per chapter
   - Format Example:
     | List I (Concepts)      | List II (Values)    |
     |------------------------|---------------------|
     | (A) Kinetic Energy     | (P) mv²/2          |
     | (B) Potential Energy   | (Q) mgh            |
   - Teach systematic approach to match-type questions

3. 📖 PARAGRAPH-BASED QUESTIONS:
   - Include 1-2 paragraph sets per chapter
   - Format: 1 paragraph → 2-3 linked questions
   - Tests deep understanding of interconnected concepts

4. 🔥 DIFFICULTY PROGRESSION (JEE Main → JEE Advanced):
   - **Level 1 (JEE Main)**: Direct formula application (30%)
   - **Level 2 (JEE Main)**: Standard word problems (40%)
   - **Level 3 (JEE Advanced)**: Multi-concept, multi-step (30%)
   - Clearly label difficulty level on each problem

5. ⚠️ CONCEPTUAL TRAPS & NEGATIVE MARKING ALERTS:
   - Dedicate a "Common Mistakes" section per topic
   - Include "Negative Marking Alert" boxes for tricky concepts
   - Show "Why this option is wrong" for MCQ explanations
   - Highlight sign errors, unit conversion errors, approximation traps

6. ⏱️ TIME-SAVING TECHNIQUES:
   - "Solve in 60 seconds" boxes with calculation shortcuts
   - Dimensional analysis approaches for elimination
   - Approximation techniques for quick estimates
   - Vedic math shortcuts for common calculations

7. 🎯 TOPIC WEIGHTAGE:
   - Mark each section with expected question count
   - "This topic: 2-3 questions every year" tags
   - Class 12 topics get ~60% weightage in JEE Advanced

8. 📐 ASSERTION-REASON FORMAT:
   - Include 3-5 Assertion-Reason questions per chapter
   - Format: Statement 1 (Assertion), Statement 2 (Reason)
   - All 4 options must be covered in practice
`;
}

// ============================================
// MEDICAL EXAMS (NEET, AIIMS)
// ============================================
function getMedicalInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'NEET';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: MEDICAL EXAMS (${examList}) ***

1. 🧬 NEET 2024 MARKS DISTRIBUTION:
   - **Total**: 720 marks (180 questions from 200, 4 marks each, -1 negative)
   - **Biology**: 360 marks (90 questions) - 50% weightage
   - **Chemistry**: 180 marks (45 questions) - 25% weightage
   - **Physics**: 180 marks (45 questions) - 25% weightage
   - Section A (35 mandatory) + Section B (10 of 15) per subject

2. 📖 NCERT IS THE ABSOLUTE BIBLE:
   - Quote NCERT definitions EXACTLY - verbatim is critical
   - Every single line of NCERT Biology can become a question
   - Include "NCERT Line → Question Conversion" boxes:
     - Show original NCERT text
     - Show how it becomes an MCQ
   - Include page references for quick revision

3. 📊 DIAGRAM-CENTRIC APPROACH:
   - Every biological process needs a LABELED diagram
   - Include "Draw and Label" practice sections
   - Flowcharts for metabolic pathways (Glycolysis, Krebs, etc.)
   - Anatomical diagrams with all standard labels
   - "This diagram appears every year" markers

4. 🔬 ASSERTION-REASON MASTERY:
   - Include 8-10 Assertion-Reason questions per chapter
   - Common NEET pattern - focus on cause-effect relationships
   - All 4 option types must be practiced:
     (a) Both A and R true, R explains A
     (b) Both A and R true, R doesn't explain A
     (c) A is true, R is false
     (d) A is false, R is true

5. ⚠️ EXCEPTIONS TABLE (Heavily Tested):
   - Dedicate a "Exceptions to the Rule" section per topic
   - Format as memorizable tables
   - Example: "Exceptions in Mendel's Laws", "Unusual Amino Acids"
   - Mnemonics for exception lists

6. 🎯 HIGH-YIELD TOPIC MARKERS:
   - ⭐ (Rare) → ⭐⭐⭐⭐⭐ (Every Year) ratings
   - Include "Must Memorize" classification tables
   - Mnemonics for complex sequences and lists
   - "This concept: 2-3 questions guaranteed" tags

7. 💊 CLINICAL CORRELATIONS:
   - Link theoretical concepts to diseases/disorders
   - Include "Applied Biology" boxes with medical relevance
   - Show disease-symptom-cause relationships
   - "Asked as application" question patterns

8. 📝 QUICK REVISION TABLES:
   - End each section with summary tables
   - Comparison tables (e.g., Mitosis vs Meiosis)
   - "Last Hour Revision" bullet points
`;
}

// ============================================
// GOVERNMENT PRELIMS (UPSC, MPSC, SSC)
// ============================================
function getGovernmentPrelimsInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'UPSC Prelims';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: GOVERNMENT PRELIMS (${examList}) ***

1. � UPSC PRELIMS PATTERN:
   - GS Paper I: 100 questions × 2 marks = 200 marks (2 hours)
   - CSAT Paper II: 80 questions × 2.5 marks = 200 marks (qualifying, 33%)
   - Negative marking: 1/3rd of marks deducted for wrong answers
   - Both papers count for merit (unlike CSAT earlier)

2. �📚 FACTUAL ACCURACY IS PARAMOUNT:
   - Every statement must be verifiable from standard sources
   - No room for interpretation - absolute facts only
   - Include source references: (PIB), (Economic Survey 2024), (NITI Aayog)
   - "Government source" carries more weight than private sources

3. 📋 STATEMENT-BASED MCQ FORMAT (Primary pattern):
   - "Consider the following statements:"
     1. Statement one about concept
     2. Statement two about concept
     3. Statement three about concept
     Which of the above statement(s) is/are correct?
     (a) 1 only (b) 2 and 3 only (c) 1 and 3 only (d) 1, 2 and 3
   - Include 15-20 such questions per chapter

4. 🗞️ CURRENT AFFAIRS INTEGRATION:
   - Link static topics to recent news/events (2023-2024)
   - Include "In the News" boxes connecting topic to current affairs
   - Show "Static + Current = Question" patterns
   - Reference: Yojana, Kurukshetra, Economic Survey data

5. 🗺️ MAP-BASED LEARNING:
   - Geography: Every concept needs map visualization
   - Include "Locate on Map" exercises for rivers, states, boundaries
   - Spatial relationships and distributions are frequently tested

6. 📊 DATA POINTS TO MEMORIZE:
   - Latest data from Economic Survey, Census, Budget
   - Format as memorizable tables with source citations
   - "Important Numbers" section per topic
   - Example: "India's GDP rank: 5th (World Bank 2024)"

7. 🎯 ELIMINATION TECHNIQUE:
   - Teach "Option Elimination" strategies
   - "If statement says 'only' or 'always' - likely wrong"
   - "If statement matches NCERT - likely correct"
   - Include "Red Flag Words" that indicate wrong options

8. 📖 ONE-LINER REVISION FORMAT:
   - End each section with bullet-point facts
   - "Quick Revision" format for last-minute study
   - Table summaries with key facts and dates
   - Mnemonics for lists and sequences

9. 🏛️ MPSC/STATE PSC SPECIFIC (if applicable):
   - Include state-specific content (Maharashtra focus for MPSC)
   - State geography, history, and polity weightage
   - Local current affairs integration
`;
}

// ============================================
// GOVERNMENT MAINS (UPSC Mains, State Mains)
// ============================================
function getGovernmentMainsInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'UPSC Mains';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: GOVERNMENT MAINS (${examList}) ***

1. 📋 UPSC MAINS STRUCTURE:
   - 9 papers total: 2 qualifying (language) + 7 merit-ranking
   - GS Papers (I-IV): 250 marks each
   - Essay Paper: 250 marks (2 essays × 125 marks)
   - Optional Subject: 2 papers × 250 marks
   - Total Merit: 1750 marks (Mains) + 275 marks (Interview)

2. ✍️ ANSWER WRITING FRAMEWORK (150 Words):
   - **Structure**: Introduction (2 lines) → Body (3-4 points) → Conclusion (1 line)
   - **Time**: 7-8 minutes max
   - Include model 150-word answers AFTER each major concept
   - Show word count awareness

3. ✍️ ANSWER WRITING FRAMEWORK (250 Words):
   - **Structure**: Introduction → Multiple Dimensions → Case Study/Example → Way Forward
   - **Time**: 15-17 minutes max
   - Use subheadings for clarity
   - Include 1 diagram/flowchart if possible
   - Show "Model Answer" boxes with proper structure

4. 📝 KEYWORD LOADING TECHNIQUE:
   - Identify "Power Keywords" examiner looks for per topic
   - Include "Must-Use Terms" boxes (10-15 keywords per topic)
   - Show how to naturally integrate keywords into answers
   - "If you write X keyword, +1 mark" callouts

5. 🔗 INTERLINKAGE (Critical for GS):
   - Connect every topic across subjects (Polity + Economy + Society + Environment)
   - Include "Holistic Perspective" sections
   - "This topic links to" cross-references:
     - GS1: History/Geography/Society angle
     - GS2: Polity/Governance angle
     - GS3: Economy/Environment angle
     - GS4: Ethics dimension

6. 📰 CASE STUDY & EXAMPLES:
   - Every concept MUST have 2-3 real-world examples
   - Government schemes, policies, and programs as examples
   - "Policy Analysis Framework": Context → Policy → Implementation → Challenges → Way Forward
   - International examples for comparative perspective

7. 📊 DIAGRAM IN ANSWER (+2 marks):
   - "Quick Draw" diagrams (simple, reproducible in 2 minutes)
   - Flowcharts for processes, Mind maps for concepts
   - Show where diagrams add value vs. where they don't
   - Include 3-4 exam-drawable diagrams per chapter

8. 🎯 ESSAY WRITING (250 marks paper):
   - Essay structure: Hook → Thesis → Arguments (multiple dimensions) → Counter → Conclusion
   - Include brainstorming frameworks per topic
   - "Quotations Bank": Famous quotes, thinkers' views, committee reports
   - Essay should cover: Social, Economic, Political, Ethical, Environmental dimensions

9. 💡 CRITICAL ANALYSIS (GS4 Ethics):
   - "Pros and Cons" for every policy/concept
   - "Way Forward" section with actionable recommendations
   - Balanced perspective - never one-sided
   - Case studies with ethical dilemmas

10. 📖 REVISION FORMAT:
    - "Value Addition Points" for each topic (unique insights)
    - Data points and statistics to cite
    - Committee/Report recommendations to quote
`;
}

// ============================================
// BANKING EXAMS (IBPS, SBI, RBI)
// ============================================
function getBankingInstructions(exams?: string[]): string {
   const examList = exams?.join(', ') || 'IBPS/SBI';
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: BANKING EXAMS (${examList}) ***

1. ⚡ SPEED IS SURVIVAL (Critical):
   - **Prelims**: 100 questions in 60 minutes = 36 seconds/question
   - **Mains**: More complex but still speed-critical
   - Every section MUST have "Solve in 30 Seconds" techniques
   - Include Vedic Math shortcuts for calculations
   - Approximation techniques for DI (no need for exact calculations)

2. 📊 DATA INTERPRETATION (15-20 Qs in Mains):
   - Include complete DI Sets: 1 chart/table → 5 questions
   - Types: Pie Chart, Bar Graph, Line Graph, Table, Caselet, Mixed
   - Teach "Data Analysis Before Questions" approach
   - Include 3+ full DI sets per relevant chapter
   - Show how to estimate without calculating

3. 🧩 REASONING PUZZLES (Critical - 20+ marks):
   - **Linear Arrangement**: Single/Double row, facing direction
   - **Circular Arrangement**: Equal/Unequal distance, facing in/out
   - **Floor-based Puzzles**: Multi-floor with multiple variables
   - **Box-based Puzzles**: Stacking, ordering by multiple criteria
   - Include 5+ complete puzzles with step-by-step solutions
   - "Puzzle Solving Strategy" flowcharts

4. 🔀 SYLLOGISM (5+ Qs):
   - All/Some/No statement patterns
   - Venn diagram approach
   - "Possibility" vs "Definite Conclusion" distinction
   - Include 10+ practice sets with varying patterns

5. 📐 QUANTITATIVE APTITUDE SHORTCUTS:
   - **Percentage**: Fraction equivalents (1/8 = 12.5%)
   - **Profit/Loss**: Base change shortcuts
   - **Time & Work**: LCM method
   - **CI/SI**: Effective rate formulas
   - **Ratio**: Component transfer shortcuts
   - Include "Mental Math" boxes with calculation tricks

6. 🔤 ENGLISH LANGUAGE (for Prelims + Mains):
   - Reading Comprehension: Speed reading techniques
   - Cloze Test: Context-based elimination
   - Error Spotting: Subject-verb agreement rules
   - Para Jumbles: Opening/Closing sentence identification
   - Include 5+ RC passages with questions

7. 🏦 BANKING AWARENESS (Mains):
   - RBI policies and recent announcements
   - Banking terms and abbreviations
   - Recent bank mergers and news
   - Financial inclusion schemes
   - "Current Banking GK" section per topic

8. ✍️ DESCRIPTIVE PAPER (Mains):
   - Essay templates (300-400 words)
   - Letter formats: Formal (complaint, inquiry, application)
   - Banking-specific essay topics
   - Include 2-3 model essays per relevant topic

9. 💻 COMPUTER AWARENESS:
   - Hardware/Software basics
   - Networking fundamentals
   - MS Office shortcuts
   - Cybersecurity terms

10. 📈 SECTIONAL CUT-OFF AWARENESS:
    - Each section has separate cut-off
    - Balance time across sections
    - "If stuck, skip and return" strategy
`;
}

// ============================================
// UNIVERSITY/COLLEGE EXAMS
// ============================================
function getUniversityInstructions(exams?: string[]): string {
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: UNIVERSITY/COLLEGE EXAMS ***

1. 📚 TEXTBOOK-ORIENTED:
   - Follow prescribed textbook structure closely
   - Include "As per Syllabus" markers
   - Reference university-recommended books

2. 📝 INTERNAL ASSESSMENT:
   - Include Assignment/Project ideas
   - Viva Voce preparation questions
   - Seminar/Presentation topics

3. 📋 QUESTION PAPER PATTERNS:
   - Section A: Short answers (2 marks)
   - Section B: Descriptive answers (5-7 marks)
   - Section C: Long answers (10-15 marks)
   - Include "Choice-based" question patterns

4. 📊 PRACTICAL COMPONENT:
   - Lab manual style documentation
   - Record keeping formats
   - Practical viva questions

5. 🎓 SEMESTER-WISE ORGANIZATION:
   - Clear unit demarcation
   - End-of-unit summaries
   - Previous university question papers pattern
`;
}

// ============================================
// GENERAL/DEFAULT
// ============================================
function getGeneralInstructions(): string {
   return `
*** EXAM-SPECIFIC INSTRUCTIONS: GENERAL PURPOSE ***

1. 📖 BALANCED APPROACH:
   - Mix of theoretical and practical content
   - Include both objective and subjective questions
   - Suitable for self-study and classroom use

2. 📋 STANDARD QUESTION TYPES:
   - MCQs for quick assessment
   - Short answer questions for understanding
   - Long answer questions for comprehensive learning

3. 🎯 SELF-ASSESSMENT:
   - Include self-check questions after each section
   - Provide answer keys for all objective questions
   - Include model answers for subjective questions
`;
}

/**
 * Detect exam category from class level string
 * This allows automatic categorization based on syllabus/textbook class level
 */
export function detectExamCategory(classLevel: string): ExamCategory {
   const normalized = classLevel.toLowerCase().trim();

   // Government exams
   if (normalized.includes('upsc') || normalized.includes('ias') || normalized.includes('civil services')) {
      return normalized.includes('mains') ? 'government_mains' : 'government_prelims';
   }
   if (normalized.includes('mpsc') || normalized.includes('mppsc') || normalized.includes('psc') || normalized.includes('ssc')) {
      return 'government_prelims';
   }

   // Banking
   if (normalized.includes('ibps') || normalized.includes('sbi') || normalized.includes('bank') || normalized.includes('rbi')) {
      return 'banking';
   }

   // Engineering
   if (normalized.includes('jee') || normalized.includes('iit') || normalized.includes('nit') || normalized.includes('engineering entrance')) {
      return 'engineering';
   }

   // Medical
   if (normalized.includes('neet') || normalized.includes('aiims') || normalized.includes('medical entrance')) {
      return 'medical';
   }

   // University
   if (normalized.includes('b.a') || normalized.includes('b.sc') || normalized.includes('b.com') ||
      normalized.includes('m.a') || normalized.includes('m.sc') || normalized.includes('semester') ||
      normalized.includes('ug') || normalized.includes('pg') || normalized.includes('degree')) {
      return 'university';
   }

   // Academic Board (Class levels)
   if (normalized.match(/class\s*(ix|x|xi|xii|9|10|11|12)/i) ||
      normalized.includes('board') || normalized.includes('cbse') || normalized.includes('mbse') ||
      normalized.includes('icse') || normalized.includes('hsc') || normalized.includes('ssc')) {
      return 'academic_board';
   }

   return 'general';
}

/**
 * Get all exam types for a category (for UI dropdowns)
 */
export function getExamTypesForCategory(category: ExamCategory): string[] {
   return EXAM_TYPES_BY_CATEGORY[category] || [];
}
