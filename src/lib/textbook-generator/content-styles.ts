/**
 * Content Styles for Textbook Generation
 * 
 * Defines different content formats for generated chapters:
 * - Academic: Deep explanations, examples, derivations
 * - Quick Reference: Bullet points, tables, facts
 * - Q&A Practice: Question-answer format, heavy MCQs
 * - Summary: Ultra-condensed key points
 * - Case Study: Real-world scenarios, application-focused
 * - Aptitude Drill: Speed-focused practice with shortcuts and time estimates
 */

export const CONTENT_STYLES = [
    'academic',
    'quick_reference',
    'qa_practice',
    'summary',
    'case_study',
    'aptitude_drill',
] as const;

export type ContentStyle = typeof CONTENT_STYLES[number];

// Labels for UI dropdowns
export const CONTENT_STYLE_LABELS: Record<ContentStyle, string> = {
    academic: 'Academic Textbook',
    quick_reference: 'Quick Reference',
    qa_practice: 'Q&A Practice',
    summary: 'Summary Notes',
    case_study: 'Case Study',
    aptitude_drill: 'Aptitude Drill',
};

// Descriptions for UI
export const CONTENT_STYLE_DESCRIPTIONS: Record<ContentStyle, string> = {
    academic: 'Detailed explanations, worked examples, derivations - ideal for conceptual subjects',
    quick_reference: 'Bullet points, tables, facts, one-liners - ideal for GK, Current Affairs',
    qa_practice: 'Question-answer format with heavy MCQs - ideal for revision and practice',
    summary: 'Ultra-condensed key points only - ideal for last-minute revision',
    case_study: 'Real-world scenarios, application-focused - ideal for management, law',
    aptitude_drill: 'Speed-focused practice with shortcuts, time estimates, multiple approaches - ideal for aptitude tests',
};

// Style-specific configuration
export interface StyleConfig {
    minWords: number;
    maxWords: number;
    mcqCount: number;
    shortAnswerCount: number;
    longAnswerCount: number;
    imageCount: number;
    format: 'narrative' | 'bullet' | 'qa' | 'condensed' | 'scenario' | 'drill';
}

export const STYLE_CONFIG: Record<ContentStyle, StyleConfig> = {
    academic: {
        minWords: 8000,
        maxWords: 12000,
        mcqCount: 15,
        shortAnswerCount: 5,
        longAnswerCount: 3,
        imageCount: 10,
        format: 'narrative',
    },
    quick_reference: {
        minWords: 6000,
        maxWords: 8000,
        mcqCount: 30,
        shortAnswerCount: 10,
        longAnswerCount: 0,
        imageCount: 3,
        format: 'bullet',
    },
    qa_practice: {
        minWords: 3000,
        maxWords: 5000,
        mcqCount: 50,
        shortAnswerCount: 10,
        longAnswerCount: 5,
        imageCount: 0, // No images for pure Q&A format
        format: 'qa',
    },
    summary: {
        minWords: 800,
        maxWords: 1500,
        mcqCount: 10,
        shortAnswerCount: 0,
        longAnswerCount: 0,
        imageCount: 2,
        format: 'condensed',
    },
    case_study: {
        minWords: 4000,
        maxWords: 6000,
        mcqCount: 10,
        shortAnswerCount: 5,
        longAnswerCount: 3,
        imageCount: 5,
        format: 'scenario',
    },
    aptitude_drill: {
        minWords: 4000,
        maxWords: 6000,
        mcqCount: 0, // All MCQs are inline in markdown, not in JSON
        shortAnswerCount: 0, // Pure objective
        longAnswerCount: 0, // Pure objective
        imageCount: 0, // Disable Gemini images - we use programmatic SVGs instead
        format: 'drill',
    },
};

/**
 * Get style-specific generation instructions (appended after core prompt)
 */
export function getStyleInstructions(style: ContentStyle): string {
    switch (style) {
        case 'academic':
            return getAcademicStyleInstructions();
        case 'quick_reference':
            return getQuickReferenceInstructions();
        case 'qa_practice':
            return getQAPracticeInstructions();
        case 'summary':
            return getSummaryInstructions();
        case 'case_study':
            return getCaseStudyInstructions();
        case 'aptitude_drill':
            return getAptitudeDrillInstructions();
        default:
            return getAcademicStyleInstructions();
    }
}

/**
 * Get style-specific CORE prompt that replaces the default academic prompt
 * This is the main prompt template, not an addendum
 */
export function getStyleCorePrompt(
    style: ContentStyle,
    context: {
        subjectName: string;
        classLevel: string;
        textbookTitle: string;
        unitTitle: string;
        chapterNumber: string;
        chapterTitle: string;
        examCategoryLabel: string;
        subtopicsText: string;
        examSection: string;
        contextSection: string;
        customSection: string;
    }
): string {
    const config = STYLE_CONFIG[style];
    const { subjectName, classLevel, textbookTitle, unitTitle, chapterNumber, chapterTitle, examCategoryLabel, subtopicsText, examSection, contextSection, customSection } = context;

    switch (style) {
        case 'quick_reference':
            return getQuickReferenceCorePrompt(config, context);
        case 'qa_practice':
            return getQAPracticeCorePrompt(config, context);
        case 'summary':
            return getSummaryCorePrompt(config, context);
        case 'case_study':
            return getCaseStudyCorePrompt(config, context);
        case 'aptitude_drill':
            return getAptitudeDrillCorePrompt(config, context);
        case 'academic':
        default:
            return getAcademicCorePrompt(config, context);
    }
}

/**
 * Get style-specific universal instructions
 * Replaces the default academic-focused getUniversalInstructions()
 */
export function getStyleUniversalInstructions(style: ContentStyle): string {
    switch (style) {
        case 'quick_reference':
            return getQuickReferenceUniversalInstructions();
        case 'qa_practice':
            return getQAPracticeUniversalInstructions();
        case 'summary':
            return getSummaryUniversalInstructions();
        case 'case_study':
            return getCaseStudyUniversalInstructions();
        case 'aptitude_drill':
            return getAptitudeDrillUniversalInstructions();
        case 'academic':
        default:
            // Return empty - use the default from subject-prompts.ts
            return '';
    }
}

// ============================================
// ACADEMIC TEXTBOOK STYLE (Default)
// ============================================
function getAcademicCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are a World-Class Educator and Textbook Author specializing in ${ctx.subjectName} for ${ctx.classLevel}.
Your goal is to create a "Super-Textbook" that covers the standard curriculum but significantly outperforms standard textbooks in clarity, depth, and exam utility.

🚨 CRITICAL INSTRUCTION - CONTENT LENGTH & DEPTH 🚨
- **TOTAL TARGET LENGTH**: ${config.minWords} to ${config.maxWords} Words. This is a NON-NEGOTIABLE requirement.
- **NO SUMMARIES**: Do not summarize subtopics. You must expand on every single subtopic with extreme detail.
- **STRUCTURE**: For each major concept, you must provide:
  1. Formal Definition
  2. Detailed, Multi-Paragraph Explanation (How it works, Why it matters)
  3. Real-World Analogies (e.g., Railway tracks vs Trains)
  4. Technical Details (Protocols, Flow, Architecture)
  5. Concrete Examples
- **SUBTOPIC HANDLING**: You will receive a long list of subtopics. Group them logically but COVER EVERY SINGLE ONE in depth. Do not skip or gloss over any item.

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}

function getAcademicStyleInstructions(): string {
    return `
## CONTENT STYLE: ACADEMIC TEXTBOOK

FORMAT REQUIREMENTS:
1. **Structure**: Use clear hierarchical headings (H2, H3, H4)
2. **Explanations**: Provide deep, thorough explanations of every concept
3. **Examples**: Include 2-3 worked examples for each major concept
4. **Derivations**: Show step-by-step derivations where applicable
5. **"Why" Focus**: Explain the reasoning behind concepts, not just definitions
6. **Visuals**: Describe diagrams, charts, or illustrations that should be included
7. **Practice Problems**: End sections with 2-3 practice problems with solutions
8. **Summary Box**: Include a summary box at the end of each major section
9. **Key Terms**: Highlight and define key terms in bold
10. **Cross-References**: Reference related topics for deeper understanding

TONE: Formal, educational, thorough. Write as if teaching a student who needs to deeply understand the material.
`;
}

// ============================================
// QUICK REFERENCE STYLE
// ============================================
function getQuickReferenceCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are an Expert GK/General Knowledge Study Material Creator.
Your goal is to create a comprehensive QUICK REFERENCE GUIDE in the classic GK book format - fact-dense, table-heavy, and exam-focused.

🚨 CRITICAL INSTRUCTION - GK BOOK FORMAT 🚨
- **TOTAL TARGET LENGTH**: ${config.minWords} to ${config.maxWords} Words.
- **NO PARAGRAPHS**: Use ONLY bullet points, tables, and lists.
- **CLASSIC GK BOOK FORMATS**: Follow these specific section types:

📊 MANDATORY GK SECTION FORMATS:

**1. STATISTICS FORMAT** (for numerical data):
Use key:value format like:
| Property | Value |
|----------|-------|
| Age | 5 Billion years |
| Distance | 149.8 Million Kms |
| Diameter | 1,38,400 Kms |

**2. THE WHO/WHEN/WHERE/WHAT SECTIONS**:
Create dedicated sections:
- "WHO discovered/invented..." table
- "WHEN did... happen" (chronological facts)
- "WHERE is..." (geographical facts)
- "WHAT is called..." (definitions, nicknames)

**3. EPITHETS/NICKNAMES TABLE**:
| Epithet | Refers To |
|---------|----------|
| Land of Rising Sun | Japan |
| Gift of Nile | Egypt |
| Eternal City | Rome |

**4. SUPERLATIVES BY CATEGORY**:
Organize "Highest, Biggest, Longest, Smallest, etc." by category:
### RIVERS
| Record | Name | Details |
|--------|------|--------|
| Longest (World) | Nile | 6,650 km |
| Longest (India) | Ganga | 2,525 km |

**5. CATEGORIZED LISTS**:
Group related items (e.g., Seven Wonders, First Five Year Plans, Important Dates)

**6. ONE-LINER FACTS**:
- Each fact = ONE line only
- Bold the key term/answer
- Format: Question/Description → **Answer**

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}

function getQuickReferenceInstructions(): string {
    return `
## CONTENT STYLE: QUICK REFERENCE (GK BOOK FORMAT)

🚨 MANDATORY SECTION TYPES - Include at least 4 of these:

### 1. STATISTICS TABLES
For any topic with numerical data:
| Property | Value |
|----------|-------|
| Population | 1.4 Billion |
| Area | 3.287 million km² |

### 2. EPITHETS/NICKNAMES
Two-column table format:
| Epithet | Refers To |
|---------|----------|
| Manchester of India | Ahmedabad |
| Silicon Valley of India | Bengaluru |

### 3. SUPERLATIVES (Highest/Longest/First/Largest)
Organize by category:
**MOUNTAINS:**
- Highest Peak (World): Mt. Everest (8,849m)
- Highest Peak (India): Kanchenjunga (8,586m)

**RIVERS:**
- Longest River (World): Nile (6,650 km)
- Longest River (India): Ganga (2,525 km)

### 4. THE 5 W's FORMAT
Create sections for:
- **THE WHO**: Who discovered/invented/founded...
- **THE WHEN**: Important dates and events
- **THE WHERE**: Geographical locations and facts
- **THE WHAT**: Definitions, terms, meanings
- **THE WHICH**: "Which is the first/only/largest..."

### 5. QUICK ONE-LINERS
- First Indian to win Nobel Prize → **Rabindranath Tagore (1913)**
- Chemical formula of water → **H₂O**
- Capital of Australia → **Canberra**

### 6. CATEGORIZED LISTS
Group related items:
**Seven Wonders of Ancient World:**
1. Great Pyramid of Giza
2. Hanging Gardens of Babylon
...

### 7. MEMORY AIDS (Mnemonics)
Create catchy acronyms:
- **VIBGYOR**: Violet, Indigo, Blue, Green, Yellow, Orange, Red
- **ROY G. BIV**: Same colors, different mnemonic

TONE: Ultra-concise, factual, exam-focused. Every line = one fact.
`;
}

function getQuickReferenceUniversalInstructions(): string {
    return `
*** UNIVERSAL INSTRUCTIONS: QUICK REFERENCE STYLE ***

1. 🚫 NO LONG EXPLANATIONS:
   - NEVER write paragraphs longer than 2-3 sentences.
   - Use bullet points for ALL factual content.
   - Tables are MANDATORY for any comparative information.

2. 📋 STRUCTURE PRIORITY:
   - Start each section with a quick definition (1 line)
   - Follow with bullet-point facts
   - Include comparison tables where applicable
   - End with key takeaways in a box

3. 📊 DATA EMPHASIS:
   - All dates, numbers, and statistics should be BOLDED
   - Use markdown tables for lists of 3+ items
   - Create "At a Glance" summary boxes

4. 🧠 MEMORY AIDS:
   - Include mnemonics for lists (e.g., "SOWJED" for Preamble words)
   - Create acronyms where possible
   - Add "Remember This" callout boxes

5. 📝 MCQ FOCUS:
   - Generate ${STYLE_CONFIG.quick_reference.mcqCount}+ MCQs
   - Focus on factual recall questions
   - Include "trick" questions with similar-sounding options

6. 🖼️ VISUAL ELEMENTS:
   - Prefer table-based infographics over diagrams
   - Maps for geographical content
   - Timelines for historical sequences
`;
}

// ============================================
// Q&A PRACTICE STYLE
// ============================================
function getQAPracticeCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are an Expert Question Bank Creator specializing in ${ctx.subjectName} for competitive exams.
Your goal is to create a PRACTICE-FOCUSED chapter where content is presented primarily through questions and answers.

🚨 CRITICAL INSTRUCTION - Q&A FORMAT 🚨
- **PRIMARY FORMAT**: Present content as Questions and Answers, not as narrative text.
- **NO TEXTBOOK NARRATIVES**: Do NOT write long explanations or "covering the topic" paragraphs.
- **MCQ HEAVY**: Generate ${config.mcqCount}+ Multiple Choice Questions with detailed explanations.
- **ANSWER EXPLANATIONS**: Every answer MUST have a detailed explanation.
- **DIFFICULTY TAGGING**: Tag each question as [Easy], [Medium], or [Hard].
- **CONTENT LENGTH**: ${config.minWords} to ${config.maxWords} Words total.

CONTENT STRUCTURE:
1. **Concept Snapshot** - ULTRA-BRIEF 1-paragraph intro (max 50 words) just to set context.
2. **Question Bank by Subtopic** - The core content. Organize strictly by questions.
   - MCQs with 4 options and explanation
   - Short Answer Questions (2-3 marks)
   - Long Answer Questions (5-10 marks)
3. **Common Mistakes** - "Trap" questions that students often get wrong
4. **Previous Year Pattern** - Questions in the style of real exams

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}

function getQAPracticeInstructions(): string {
    return `
## CONTENT STYLE: Q&A PRACTICE

FORMAT REQUIREMENTS:
1. **Question-First**: Present content primarily as questions and answers
2. **MCQ Heavy**: 60% of content should be MCQs with explanations
3. **Short Answers**: Include 2-3 line answer questions
4. **Long Answers**: Include 1-2 detailed answer questions per topic
5. **Previous Year Questions**: Mark questions that are exam-pattern style
6. **Difficulty Levels**: Tag questions as Easy/Medium/Hard
7. **Explanations**: Every answer must have an explanation
8. **Tricks & Traps**: Highlight common mistakes and confusing options
9. **Time Estimates**: Suggest time to solve each question type
10. **Topic Tags**: Tag each question with relevant subtopic

🚨 CRITICAL MCQ FORMATTING (MANDATORY):
- Each option MUST be on its OWN LINE
- Use this EXACT format:
  **Q1. [MCQ - Easy]** Question text here?
  
  A) Option one
  B) Option two
  C) Option three
  D) Option four
  
  **Answer:** B
  **Explanation:** Explanation text here.

- NEVER put all options on a single line like "A) ... B) ... C) ... D) ..."

TONE: Practice-oriented, exam-focused. Write as if preparing a question bank.

EXAMPLE FORMAT:
### Topic: Fundamental Rights

**Q1. [MCQ - Medium]** Which of the following is NOT a Fundamental Right?

A) Right to Equality
B) Right to Property
C) Right to Freedom
D) Right against Exploitation

**Answer:** B
**Explanation:** Right to Property was removed as a Fundamental Right by the 44th Amendment (1978). It is now a legal right under Article 300A.

**Q2. [Short Answer - Easy]** Define 'Right to Constitutional Remedies'.
**Answer:** Article 32 gives citizens the right to approach the Supreme Court directly for enforcement of Fundamental Rights. Dr. Ambedkar called it the "heart and soul" of the Constitution.
`;
}

function getQAPracticeUniversalInstructions(): string {
    return `
*** UNIVERSAL INSTRUCTIONS: Q&A PRACTICE STYLE ***

1. 📝 QUESTION-FIRST APPROACH:
   - Start each subtopic with 2-3 quick concept lines
   - Immediately follow with related questions
   - Use the Q&A format to teach concepts

2. 🎯 MCQ REQUIREMENTS:
   - Generate ${STYLE_CONFIG.qa_practice.mcqCount}+ MCQs total
   - Each MCQ MUST have a detailed explanation
   - Include "Why other options are wrong" analysis
   - Tag difficulty: [Easy], [Medium], [Hard]

3. 📊 DIFFICULTY DISTRIBUTION:
   - Easy: 30% (Direct recall)
   - Medium: 50% (Application/Multi-step)
   - Hard: 20% (Tricky/Multi-concept)

4. ⚠️ COMMON MISTAKES SECTION:
   - Include a "Trap Alert" section
   - Show commonly confused concepts
   - Explain why students make these mistakes

5. 📖 ANSWER FORMAT:
   - Short Answers: 3-5 key points
   - Long Answers: Proper marking scheme with point-wise breakdown

6. 🖼️ MINIMAL IMAGES:
   - Only include images essential for question understanding
   - Focus on question quality, not visuals
`;
}

// ============================================
// SUMMARY NOTES STYLE
// ============================================
function getSummaryCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are an Expert Study Notes Creator specializing in ULTRA-CONDENSED revision notes.
Your goal is to create the SHORTEST possible summary that covers all key points - for last-minute revision.

🚨 CRITICAL INSTRUCTION - ULTRA-CONDENSED FORMAT 🚨
- **TOTAL LENGTH**: ${config.minWords} to ${config.maxWords} Words ONLY. Do NOT exceed.
- **MAX 3-4 SENTENCES per concept**: Strip everything to essentials.
- **NO EXAMPLES**: Skip worked examples and derivations.
- **KEY POINTS ONLY**: Only the most critical information.
- **MEMORY-FRIENDLY**: Create lists, acronyms, and memory hooks.

CONTENT STRUCTURE:
1. **One-Line Summary** - What is this chapter about (1 sentence)
2. **Key Numbers/Facts** - Bullet list of must-remember data
3. **Core Concepts** - Ultra-brief explanations (2-3 lines each)
4. **Quick Formulas** - Only final formulas, no derivations
5. **Memory Hooks** - Mnemonics, acronyms, tricks
6. **Revision Checklist** - "Can you answer?" self-check questions

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}

function getSummaryInstructions(): string {
    return `
## CONTENT STYLE: SUMMARY NOTES

FORMAT REQUIREMENTS:
1. **Ultra-Condensed**: Maximum 3-4 sentences per concept
2. **Key Points Only**: Only the most essential information
3. **No Examples**: Skip worked examples and derivations
4. **Numbered Lists**: Use numbered lists for easy memorization
5. **Acronyms**: Create acronyms for lists where possible
6. **Highlight Keywords**: Bold the absolutely critical terms
7. **One-Page Target**: Each chapter should fit conceptually on 1-2 pages
8. **Memory Hooks**: Include one memorable fact or hook per topic
9. **Quick Formulas**: Only final formulas, no derivations
10. **Revision Checklist**: End with "Can you answer?" checklist

TONE: Minimalist, essential, memory-friendly. Write for last-minute revision before an exam.

EXAMPLE FORMAT:
### Indian Constitution - Summary

**Key Numbers to Remember:**
- 395 Articles (originally), 470+ now
- 12 Schedules
- 25 Parts
- Enacted: 26 Nov 1949, Effective: 26 Jan 1950

**Preamble SOWJED:**
**S**overeign, S**O**cialist, Secular, Democratic, Republic
**W**e the people, **J**ustice, **E**quality, Fraternity, **D**ignity

**Top 5 Must-Know Articles:**
1. Article 14: Right to Equality
2. Article 19: Six Freedoms
3. Article 21: Right to Life
4. Article 32: Constitutional Remedies
5. Article 51A: Fundamental Duties

✅ **Can You Answer?**
- [ ] What is the Preamble called?
- [ ] Name 3 Fundamental Rights
- [ ] Which article is "Heart of Constitution"?
`;
}

function getSummaryUniversalInstructions(): string {
    return `
*** UNIVERSAL INSTRUCTIONS: SUMMARY NOTES STYLE ***

1. 🚫 ABSOLUTE BREVITY:
   - MAXIMUM 3-4 sentences per concept
   - NO detailed explanations
   - NO worked examples
   - NO derivations

2. 📋 STRUCTURE:
   - Use numbered bullet lists exclusively
   - Bold all key terms and numbers
   - Create tables only for direct comparisons

3. 🧠 MEMORY AIDS (MANDATORY):
   - Create acronyms for every list of 4+ items
   - Include "Memory Hook" for each topic
   - Add visual mnemonics where possible

4. ✅ REVISION CHECKLIST:
   - End EVERY chapter with a "Can You Answer?" section
   - List 5-7 self-check questions
   - Focus on most likely exam questions

5. 📝 MCQ COUNT:
   - Only ${STYLE_CONFIG.summary.mcqCount} essential MCQs
   - Focus on most frequently asked questions
   - No short/long answer questions

6. 🖼️ MINIMAL IMAGES:
   - Maximum 2 images per chapter
   - Only include if absolutely essential for understanding
`;
}

// ============================================
// CASE STUDY STYLE
// ============================================
function getCaseStudyCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are an Expert Case Study Author specializing in scenario-based learning for ${ctx.subjectName}.
Your goal is to teach concepts through REAL-WORLD SCENARIOS and analytical case studies.

🚨 CRITICAL INSTRUCTION - SCENARIO-BASED FORMAT 🚨
- **SCENARIO-FIRST**: Every concept should be introduced through a real-world scenario.
- **ANALYSIS FRAMEWORK**: Provide structured analysis approaches.
- **DECISION POINTS**: Include "What would you do?" prompts.
- **CONTENT LENGTH**: ${config.minWords} to ${config.maxWords} Words.

CONTENT STRUCTURE:
1. **Opening Scenario** - A real-world situation that illustrates the topic
2. **Problem Analysis** - Breaking down the scenario's key issues
3. **Concept Connection** - How theoretical concepts apply
4. **Multiple Perspectives** - Different viewpoints/solutions
5. **Decision Points** - Interactive "What would you do?" questions
6. **Lessons Learned** - Key takeaways from each case
7. **Application Questions** - "How would you apply this to..." prompts

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}

function getCaseStudyInstructions(): string {
    return `
## CONTENT STYLE: CASE STUDY

FORMAT REQUIREMENTS:
1. **Scenario-Based**: Present concepts through real-world scenarios
2. **Problem Statement**: Each section starts with a situation/problem
3. **Analysis Framework**: Provide structured analysis approach
4. **Multiple Perspectives**: Discuss different viewpoints/solutions
5. **Decision Points**: Include "What would you do?" questions
6. **Real Examples**: Use actual case studies, company names, events
7. **Outcome Discussion**: Analyze what happened and why
8. **Lessons Learned**: Summarize key takeaways from each case
9. **Application Questions**: "How would you apply this to..." prompts
10. **Ethics Considerations**: Include ethical dimensions where relevant

TONE: Analytical, practical, discussion-oriented. Write for understanding application, not just theory.

EXAMPLE FORMAT:
### Case Study: The 2008 Financial Crisis

**Scenario**: In September 2008, Lehman Brothers, a 158-year-old investment bank, filed for bankruptcy...

**Key Questions to Consider**:
1. What were the early warning signs?
2. How did regulatory failure contribute?
3. What alternatives did policymakers have?

**Analysis**:
The crisis originated from... [detailed analysis]

**Decision Point**: If you were the Fed Chairman in September 2008, would you have bailed out Lehman Brothers? Why or why not?

**Lessons Learned**:
- Importance of liquidity management
- Risks of excessive leverage
- Need for regulatory oversight

**Application**: How do these lessons apply to the current banking sector?
`;
}

function getCaseStudyUniversalInstructions(): string {
    return `
*** UNIVERSAL INSTRUCTIONS: CASE STUDY STYLE ***

1. 📖 SCENARIO-FIRST APPROACH:
   - Start every major section with a real-world scenario
   - Use actual company names, dates, and events
   - Make scenarios relatable and engaging

2. 🔍 ANALYSIS FRAMEWORK:
   - Provide structured analysis templates
   - Break down problems into components
   - Show cause-and-effect relationships

3. ❓ DECISION POINTS (MANDATORY):
   - Include at least 3 "What would you do?" prompts per chapter
   - Present ethical dilemmas where applicable
   - Encourage critical thinking

4. 📊 MULTIPLE PERSPECTIVES:
   - Present different stakeholder viewpoints
   - Discuss pros and cons of each approach
   - Avoid presenting only one "right" answer

5. 📝 QUESTION FORMAT:
   - Focus on analytical and application questions
   - Include "Compare and Contrast" questions
   - Add "What if..." scenario variations

6. 🖼️ VISUAL ELEMENTS:
   - Include flowcharts for decision processes
   - Use infographics for case summaries
   - Add timeline visuals for case sequences
`;
}

// ============================================
// APTITUDE DRILL STYLE
// ============================================
function getAptitudeDrillCorePrompt(config: StyleConfig, ctx: any): string {
    return `You are an Expert Aptitude Test Coach specializing in competitive exam preparation.
Your goal is to create a MASSIVE QUESTION BANK organized by speed tiers.

🚨 CRITICAL INSTRUCTION - APTITUDE DRILL FORMAT 🚨

**THIS IS A QUESTION BANK, NOT A TEXTBOOK.**

- **NO LONG EXPLANATIONS** - Maximum 1-2 lines per concept intro
- **QUESTIONS ARE THE CONTENT** - 90% of the chapter should be Q&A
- **EVERY QUESTION** must have: Time Tag + Question + Answer + Shortcut

📊 **MANDATORY QUESTION QUANTITIES (60 INLINE MCQs)**:
- **⏱️ 30-Second Speed Drill**: 20 MCQs
- **⏱️ 60-Second Standard Drill**: 25 MCQs  
- **⏱️ 90-Second Challenge Drill**: 15 MCQs
- **TOTAL**: 60 inline MCQs in the markdown content
- **NO JSON MCQs** - all questions are inline in the content

📝 **QUESTION FORMAT (STRICT)**:
Each question MUST follow this exact format:

**Q1. [⏱️ 30s]** Question text here?

A) Option one
B) Option two
C) Option three
D) Option four

**Answer:** B
**Shortcut:** One-line method to solve quickly.

---

🚫 **NEVER** put options on a single line like "A) ... B) ... C) ... D) ..."
🚫 **NEVER** use [IMAGE:] tags - use \`\`\`figure-spec\`\`\` JSON blocks for figures
🚫 **NEVER** write long paragraphs explaining concepts

CONTENT STRUCTURE:
1. **📋 Formula Card** (2-3 lines MAX with key formulas)
2. **⏱️ 30-SECOND SPEED DRILL** (15+ questions - easy, direct application)
3. **⏱️ 60-SECOND STANDARD DRILL** (15+ questions - multi-step)
4. **⏱️ 90-SECOND CHALLENGE DRILL** (10+ questions - tricky/multi-concept)
5. **⚡ SHORTCUT TECHNIQUES** (Named techniques with examples)
6. **⚠️ TRAP ALERT** (Common mistakes)
7. **📊 ANSWER KEY** (Quick reference grid)

CONTEXT:
TEXTBOOK: ${ctx.textbookTitle}
UNIT: ${ctx.unitTitle}
CHAPTER: ${ctx.chapterNumber}. ${ctx.chapterTitle}
AUDIENCE: ${ctx.classLevel} students preparing for ${ctx.examCategoryLabel}.
${ctx.subtopicsText}
${ctx.examSection}
${ctx.contextSection}
${ctx.customSection}`;
}


function getAptitudeDrillInstructions(): string {
    return `
## CONTENT STYLE: APTITUDE DRILL (QUESTION BANK)

🎯 **THIS IS A QUESTION BANK** - 90% of content should be Q&A, not explanations.

📊 **MINIMUM QUESTION COUNTS (60 INLINE MCQs)**:
- 30-Second Drill: 20 MCQs
- 60-Second Drill: 25 MCQs
- 90-Second Drill: 15 MCQs
- Total Inline: 60 MCQs

📝 **QUESTION FORMAT (MANDATORY)**:
\`\`\`
**Q1. [⏱️ 30s]** Question text?

A) Option one
B) Option two  
C) Option three
D) Option four

**Answer:** B
**Shortcut:** Quick method.

---
\`\`\`

🚫 **VIOLATIONS THAT WILL FAIL**:
- Putting options on a single line: "A) ... B) ... C) ... D) ..." ❌
- Using [IMAGE:] tags (use \`\`\`figure-spec\`\`\` JSON instead) ❌
- Writing long paragraphs of explanation ❌
- Only 2-3 questions per drill section ❌

TONE: Fast-paced, exam-focused, like coaching before a test.
`;
}

function getAptitudeDrillUniversalInstructions(): string {
    return `
*** UNIVERSAL INSTRUCTIONS: APTITUDE DRILL STYLE ***

1. ⚡ SPEED IS EVERYTHING:
   - Every problem MUST have a time tag: ⏱️ 30s / 60s / 90s
   - Include "Solve in X seconds" challenges
   - Emphasize mental calculation over written steps

2. 🎯 MULTIPLE APPROACHES (MANDATORY):
   - Show at least 2 solution methods for every problem type
   - Label approaches: "Long Method" vs "Shortcut"
   - Highlight the fastest approach with ⭐

3. 🧮 SHORTCUT TECHNIQUES:
   - Name your shortcuts (e.g., "The 11's Rule", "Complement Method")
   - Create memorable abbreviations and acronyms
   - Show Vedic Math techniques where applicable

4. 📊 PROBLEM QUANTITY:
   - Generate ${STYLE_CONFIG.aptitude_drill.mcqCount}+ MCQs
   - Distribute: 40% Easy (30s), 40% Medium (60s), 20% Hard (90s)
   - NO short/long answer questions (pure objective)

5. ⚠️ PATTERN RECOGNITION:
   - Include "Spot the Pattern" sections
   - Show "Question Fingerprints" (how to identify question type instantly)
   - Teach elimination strategies

6. 🖼️ FIGURE GENERATION (For Visual Questions):
   For figure-based questions (shapes, patterns, sequences), use this JSON format:
   
   \`\`\`figure-spec
   {
     "type": "series",
     "figures": [
       {"shape": "circle", "fill": "black"},
       {"shape": "square", "fill": "black"},
       {"shape": "triangle", "fill": "black"},
       {"shape": "question_mark"}
     ]
   }
   \`\`\`
   
   **Available shapes**: circle, square, triangle, pentagon, hexagon, star, arrow, diamond, cross, plus, question_mark
   **Shape options**: 
   - fill: "black" | "white" | "gray" | "none"
   - rotation: 0-360 (degrees)
   - innerShape: any shape (for nested shapes)
   - dots: 1-6 (dots inside shape)
   - lines: 1-4 (lines inside shape)
   
   **Pattern types**:
   - "series": Shape sequence (A → B → C → ?)
   - "rotation": Same shape rotated progressively
   - "odd_one_out": Find the different shape
   - "grid": 3x3 pattern matrix

   **DO NOT** use [IMAGE:] tags. Use the JSON figure-spec format above.
   For pure calculation questions (percentages, averages), DO NOT use any figures.

   **ANSWER FIGURES**:
   For visual pattern questions, you MUST also include a figure-spec in the Answer/Explanation section showing the correct solution pattern (the completed series/grid) so the student can visualize why it is correct.

7. 🚫 WHAT TO AVOID:
   - NO long paragraphs of explanation
   - NO subjective questions
   - NO derivations or proofs

8. 📝 ANSWER KEY FORMAT:
   - Provide answer grid at the end
   - Include "Quick Solve" hints for each answer
`;
}
