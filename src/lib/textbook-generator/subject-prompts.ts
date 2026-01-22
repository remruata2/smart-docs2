/**
 * Subject-Specific Prompt Instructions
 * 
 * Returns tailored instructions based on the subject to prevent context pollution.
 * Now also integrates with exam category for exam-aware Rule of 3 levels.
 * - Math: Python plots for precision, proofs, Rule of 3
 * - Science: Virtual Labs, diagrams, mnemonics
 * - Humanities: Case studies, narratives, primary sources
 */

import type { ExamCategory } from './exam-prompts';

/**
 * Get Rule of 3 level labels based on exam category
 * This makes the difficulty progression relevant to the target exam
 */
function getRule3Levels(examCategory?: ExamCategory): { level1: string; level2: string; level3: string } {
   switch (examCategory) {
      case 'engineering':
         return {
            level1: 'JEE Main Level (Direct Application)',
            level2: 'JEE Main+ (Multi-step Problem)',
            level3: 'JEE Advanced (Multi-concept + Traps)'
         };
      case 'medical':
         return {
            level1: 'NCERT Direct (Definition-based)',
            level2: 'NEET Standard (Application)',
            level3: 'NEET High-Yield (Exceptions + Tricky)'
         };
      case 'government_prelims':
         return {
            level1: 'Factual Recall (Direct Statement)',
            level2: 'Application (Multi-statement MCQ)',
            level3: 'Elimination Required (Tricky Options)'
         };
      case 'government_mains':
         return {
            level1: '150-Word Answer (Basic Coverage)',
            level2: '250-Word Answer (With Examples)',
            level3: 'Essay Level (Multi-dimensional Analysis)'
         };
      case 'banking':
         return {
            level1: 'Speed Drill (30 seconds)',
            level2: 'Standard (45 seconds)',
            level3: 'DI/Puzzle Based (60+ seconds)'
         };
      case 'university':
         return {
            level1: '2-Mark (Short Answer)',
            level2: '5-Mark (Descriptive)',
            level3: '10-Mark (Essay/Numerical)'
         };
      case 'academic_board':
      default:
         return {
            level1: 'Board Level (Drill/Direct)',
            level2: 'CBSE Standard (Word Problem)',
            level3: 'Competitive (JEE/NEET Style)'
         };
   }
}

export function getSubjectInstructions(subjectName: string, classLevel: string, examCategory?: ExamCategory): string {
   const normalizedSubject = subjectName.toLowerCase();
   const r3 = getRule3Levels(examCategory);

   // 🧮 MATHEMATICS: Precision, Python Plots, Proofs
   if (
      normalizedSubject.includes('math') ||
      normalizedSubject.includes('algebra') ||
      normalizedSubject.includes('calculus') ||
      normalizedSubject.includes('geometry') ||
      normalizedSubject.includes('statistics')
   ) {
      return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: MATHEMATICS ***

1. 📉 PRECISION PLOTTING (PYTHON):
   - Generative AI is bad at coordinate precision. For ANY graph requiring exact coordinates (e.g., "Graph of y=x^2", "Sine wave", "Histogram"), you MUST NOT use the [IMAGE] tag.
   - Instead, provide a **Python/Matplotlib script** in a block labeled \`\`\`python-plot\`\`\`.
   - The code must be complete and runnable.
   - Example:
     \`\`\`python-plot
     import matplotlib.pyplot as plt
     import numpy as np
     x = np.linspace(-10, 10, 100)
     plt.plot(x, x**2)
     plt.title('Parabola $y = x^2$')
     plt.xlabel('x')
     plt.ylabel('y')
     plt.grid(True)
     plt.axhline(y=0, color='k', linewidth=0.5)
     plt.axvline(x=0, color='k', linewidth=0.5)
     \`\`\`

2. 🖼️ CONCEPTUAL DIAGRAMS (IMAGE GEN):
   - For visual patterns that are hard to code (e.g., "Venn Diagram shading", "Sarrus Rule arrows", "3D Cone Sections"), use the standard [IMAGE: description] tag.
   - Examples: Sarrus Rule, Cramer's Rule diagram, Set operations visualization.

3. 📐 THE "RULE OF 3" EXAMPLES:
   - Every major formula MUST have 3 Solved Examples:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}

4. 📜 THEORETICAL RIGOR:
   - If the syllabus mentions "Proof", you MUST provide the formal mathematical proof in a callout block.
   - Show every algebraic step. Never skip steps.

5. 🏛️ HISTORY CORNER:
   - Include brief mentions of mathematicians behind key concepts (Cantor, Euler, etc.).
`;
   }

   // 🧬 SCIENCE (Physics, Chemistry, Biology): Labs, Diagrams
   if (
      normalizedSubject.includes('physics') ||
      normalizedSubject.includes('chemistry') ||
      normalizedSubject.includes('biology') ||
      normalizedSubject.includes('science') ||
      normalizedSubject.includes('botany') ||
      normalizedSubject.includes('zoology')
   ) {
      return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: SCIENCE (PHYSICS, CHEMISTRY, BIOLOGY) ***

1. 🔬 TECHNICAL RIGOR & DEPTH:
   - This is for ${classLevel} students and Competitive Aspirants. Do NOT simplify concepts to a juvenile level.
   - **Biology:** Focus on cellular anatomy, biochemical pathways (e.g., specific hormones, enzymes, ATP cycles), and physiological interactions. 
   - **Physics/Chemistry:** Focus on theoretical derivations, molecular interactions, and mathematical proofs.
   - Use professional technical terminology (e.g., instead of "nurse cells", explain the *paracrine signaling* and *metabolic support* provided by Sertoli cells).
   - **MANDATORY Call-out Boxes:**
     - **Ploidy Check (Bio):** For every stage of a biological process, explicitly list the ploidy (e.g., "Primary Oocyte: 2n").
     - **Formula Hub (Phys/Chem):** Summarize every derivation into a clear, boxed formula.
     - **Numerical Practice:** Include at least 2-3 calculation-based questions within the text to test conceptual application.

2. 🗺️ VISUAL STRATEGY (MACRO-TO-MICRO):
   - You MUST follow a hierarchical visual flow. 
   - Start with **Gross Anatomy/System Overview** (e.g., Sagittal views of a system, whole organ location) before zooming into **Microscopic/Histological** views. 
   - Never show a cell before showing the organ it belongs to.

3. ✍️ SCHEMATIC STYLE FOR EXAMS:
   - When describing diagrams for students, prioritize **Scientific Schematics** over photorealistic images.
   - Images must be "reproducible"—clean lines and clear labels that a student can practice drawing for their board exams.

4. ⚗️ VIRTUAL LAB MANUAL:
   - For every standard experiment mentioned in the syllabus, create a dedicated section:
     - **Aim:** Clear objective.
     - **Apparatus:** List of tools/materials.
     - **Procedure:** Step-by-step instructions.
     - **Observation Table:** A Markdown table with headers. Pre-fill ONE row with realistic sample data.
     - **Precautions:** Critical safety tips.
     - **Result/Conclusion:** Expected outcome.

5. 🖼️ DIAGRAM STRATEGY:
   - Use [IMAGE: description] for all biological structures, chemical bonds, and physical setups.
   - Required: At least one highly detailed diagram per major concept.

6. 🚀 COMPETITIVE EDGE (NEET/JEE):
   - Include "Mechanism of Action" sections for biological and chemical processes.
   - Focus on "Exception to the Rule" cases (highly common in NEET/JEE).
   - Include "Pitfall Alerts" for common exam mistakes.

6. 📐 THE "RULE OF 3" NUMERICAL LADDER:
   - Every major formula/law MUST have 3 Numerical Problems:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}
   - Show complete solutions with units and significant figures.

7. 📊 DERIVATIONS & CALCULATIONS:
   - Show EVERY step of any derivation. Use LaTeX for all equations.
   - Include "Numerical Practice" inside the content, not just at the end.
`;
   }

   // 📚 LANGUAGES (English, Hindi, Mizo, etc.)
   if (
      normalizedSubject.includes('english') ||
      normalizedSubject.includes('hindi') ||
      normalizedSubject.includes('mizo') ||
      normalizedSubject.includes('language') ||
      normalizedSubject.includes('literature')
   ) {
      return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: LANGUAGE & LITERATURE ***

1. 📖 TEXT ANALYSIS:
   - For each literary piece, provide: Summary, Themes, Character Analysis, Literary Devices.
   - Use callout blocks for important quotes.

2. ✍️ WRITING SKILLS:
   - Include templates/formats for: Letters, Essays, Reports, Articles.
   - Provide sample openings and closings.

3. 🗣️ VOCABULARY BUILDING:
   - Include a "Word Power" section with 10-15 important words per chapter.
   - Format: Word → Meaning → Synonym → Antonym → Example sentence.

4. 🖼️ VISUALS:
   - Use [IMAGE: description] sparingly - only for author portraits, text covers, or scene illustrations.
   - Do NOT use Python plots.

5. 📝 GRAMMAR FOCUS:
   - Include dedicated sections for grammar rules relevant to the chapter.
   - Provide 5 practice exercises with answers.

6. 📐 THE "RULE OF 3" APPLICATION LADDER:
   - Every grammar rule or literary concept MUST have 3 Examples:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}
`;
   }

   // 🏛️ HUMANITIES (History, Geography, Economics, Political Science)
   if (
      normalizedSubject.includes('history') ||
      normalizedSubject.includes('geography') ||
      normalizedSubject.includes('economics') ||
      normalizedSubject.includes('political') ||
      normalizedSubject.includes('sociology') ||
      normalizedSubject.includes('civics')
   ) {
      return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: HUMANITIES ***

1. 🔍 CASE STUDIES:
   - Instead of Solved Examples, provide "Real World Case Studies" or "Primary Source Analysis".
   - Use block quotes for excerpts from historical documents.

2. 📅 TIMELINE APPROACH:
   - For historical topics, include chronological timelines as Markdown tables.
   - For Geography, include location-based context.

3. 🖼️ VISUALS:
   - Use [IMAGE: description] for maps, historical scenes, infographics, or flowcharts.
   - Do NOT use Python plots.

4. 💡 CRITICAL THINKING:
   - Include "Think About It" boxes with discussion questions.
   - Present multiple perspectives on controversial topics.

5. 📊 DATA & STATISTICS:
   - For Economics/Geography, present data in well-formatted Markdown tables.
   - Include "Trend Analysis" sections where applicable.

6. 🏛️ KEY TERMS GLOSSARY:
   - Include a definitions section for important terms at the end of the chapter.

7. 📐 THE "RULE OF 3" ANALYSIS LADDER:
   - Every major concept/event MUST have 3 Practice Questions:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}
`;
   }

   // 💻 COMPUTER SCIENCE / INFORMATICS
   if (
      normalizedSubject.includes('computer') ||
      normalizedSubject.includes('informatics') ||
      normalizedSubject.includes('programming') ||
      normalizedSubject.includes('it')
   ) {
      return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: COMPUTER SCIENCE & IT ***

1. 💻 CODE & VISUALIZATION:
   - **Side-by-Side:** When teaching HTML/CSS or UI concepts, you MUST describe the code and then immediately describe or provide an [IMAGE: description] of the **Rendered Output**.
   - **Syntax Highlighting:** Always use specific language blocks (e.g., \`\`\`html, \`\`\`python).

2. 🛠️ PRACTICAL SKILLS (MANDATORY):
   - Include a "Hacker's Corner" or "Pro Tip" section.
   - Teach **Keyboard Shortcuts** (Ctrl+C, Ctrl+V, Alt+Tab).
   - Teach **Search Operators** (site:, filetype:).
   - Teach **VS Code / Tooling** tricks.

3. 🖼️ SYSTEM ARCHITECTURE:
   - Use Analogies for Hardware (CPU=Brain, RAM=Workbench, HDD=Warehouse).
   - Use Flowcharts for Algorithms.

4. ⚡ COMPLEXITY ANALYSIS:
   - For every major algorithm, include Time/Space complexity.

5. 📐 THE "RULE OF 3" COMPLEXITY LADDER:
   - Every algorithm/concept MUST have 3 Code Examples:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}
`;
   }

   // 🎨 ARTS & ELECTIVES (Fine Arts, Music, Home Science, etc.)
   return `
*** SUBJECT-SPECIFIC INSTRUCTIONS: GENERAL/ELECTIVES ***

1. 📖 NARRATIVE APPROACH:
   - Use engaging, descriptive language to explain concepts.
   - Include historical/cultural context where relevant.

2. 🖼️ VISUALS:
   - Use [IMAGE: description] for illustrative diagrams, examples, or demonstrations.
   - Focus on clarity and educational value.

3. 🎯 PRACTICAL APPLICATIONS:
   - Include hands-on activities, projects, or demonstrations.
   - Provide step-by-step instructions for practical work.

4. 📝 ASSESSMENT:
   - Include a mix of objective and subjective questions.
   - Provide rubrics for project-based assessments where applicable.

5. 📐 THE "RULE OF 3" PRACTICE LADDER:
   - Every major concept MUST have 3 Practice Activities:
     - **Level 1:** ${r3.level1}
     - **Level 2:** ${r3.level2}
     - **Level 3:** ${r3.level3}
`;
}

/**
 * Get universal instructions that apply to all subjects
 */
export function getUniversalInstructions(): string {
   return `
*** UNIVERSAL INSTRUCTIONS (ALL SUBJECTS) ***

1. 🚫 NO SUMMARIES - SHOW THE WORK:
   - NEVER say "It can be shown that...", "Substituting values we get...", or "After simplification...".
   - **Derivation Rule:** You MUST show EVERY algebraic/logical step.
     - Step 1: State assumptions clearly.
     - Step 2: Write the base formula/theorem.
     - Step 3: Show substitution and manipulation line-by-line using LaTeX.
     - Step 4: Interpret the final result.
   - **Length:** Write as much as needed. There is NO word limit. Cover every subtopic comprehensively.

2. 📖 DEPTH OVER BREVITY (MANDATORY - NO EXCEPTIONS):
   - **STRICT RULE:** NEVER write a one-liner or a simple bullet-point definition. 
   - Each concept (even small ones) MUST be explained in at least 2-3 substantive paragraphs.
   - If you provide a list of parts/cells (like "Sertoli cells", "Leydig cells"), DO NOT just list them. Give EACH item its own ### subsection or a substantial bolded paragraph (100+ words each) explaining its function, anatomy, and significance.
   - **Pedagogical Structure for Every Topic:**
     1. **Technical Definition**: Formal terminology with KaTeX.
     2. **Functional Explanation**: How it works, the "Why" and "How", connectivity to other parts.
     3. **Structural Details**: Physical location, appearance, biochemical makeup.
     4. **Exam context**: Why examiners ask about this (High-yield points).
     5. **TABLES OVER LISTS**: If data can be compared (e.g., Glands, Developmental Milestones, Comparative Anatomy), you MUST use a Markdown Table. Bulleted lists are for simple features only.
   - **Word Count & Depth:** You must strictly separate "Core Concepts" from "Minor Details". 
     - If the target word count is high (8000+), go into extreme depth for everything.
     - If the target word count is low (<4000), focus on the Core Concepts and keep minor details concise.
     - **ALWAYS prioritization total technical accuracy over length padding.**

3. 📋 SYLLABUS COMPLETE COVERAGE:
   - You MUST cover EVERY item in the SUBTOPICS list. Do not skip any topic, treat every words inside the subtopics as important, especially towards the end.
   - Treat the subtopics as a mandatory checklist.

4. 🚀 EXAM MASTERY SECTIONS:
   - **"Pitfall Alert"**: Common mistakes students make (e.g., "Don't confuse velocity with speed").
   - **"Competitive Corner"**: Shortcuts, tricks, or advanced tips for JEE/NEET/CUET.

5. � EXERCISES (END OF CHAPTER - MANDATORY):
   - **CRITICAL**: Do NOT write the exercises in the markdown body.
   - You MUST populate the JSON fields \`mcqs\`, \`short_answers\`, and \`long_answers\` with high-quality questions.
   - The system will automatically append them to the chapter in a standardized format.
   - **Task**: Generate extensive practice material in the JSON arrays:
     - **MCQs**: As requested by exam config (15-50 questions).
     - **Short/Long Answers**: As requested.
     - **HOTS**: Include difficult application questions.

6. 📄 FORMATTING STANDARDS:
   - Use Blockquotes (>) for definitions, laws, and key statements.
   - Use Markdown Tables for comparisons and data.

7. 🚫 NO CODE BLOCKS (STRICT):
   - Unless the subject is explicitly Computer Science/Informatics, you must **NEVER** include code snippets (Python, C++, Java, etc.).
   - Do NOT show Python code for plots in the final output text (use the \`\`\`python-plot\`\`\` block ONLY if you are generating a plot image, but do not show code to the student).
   - If explaining a concept, use mathematical notation ($...$) or pseudocode/algorithms in plain text, \`not_code_blocks\`.

8. 📱 INDIAN CONTEXT:
   - Use "Scientific Calculator" or "Manual Calculation" instead of "Computer Algebra System".
   - Use Indian names, rupees (₹), and local examples where appropriate.
   - Assume resources available in typical Indian schools.

8. 🖼️ IMAGE GENERATION (CRITICAL):
   - **QUANTITY**: There is NO upper limit. Generate as many images, plots, and diagrams as needed to ensure every major conceptual step is visually supported. For detailed chapters, 8-15 visuals are encouraged.
   - **PLACEMENT**: Insert tags on their own line: \`[IMAGE: short_unique_description]\`
   - **TIMING**: Place image tags AFTER introducing the concept, never before.
   - **MATCHING**: The 'placement' in 'images_to_generate' MUST be just the \`short_unique_description\` part of the tag (e.g., "diagram_ovary_structure"), NOT the whole \`[IMAGE: ...]\` tag.
   - **REQUIRED TYPES**:
     - At least 1 conceptual diagram per major section
     - Flowcharts for processes/algorithms
     - Comparison charts for contrasting concepts
     - Visual representations of abstract ideas
   - **FOR MATH**: Use \`\`\`python-plot\`\`\` for precise coordinate graphs (parabolas, sine waves, etc.)
   - **FOR SCIENCE**: Diagrams for experimental setups, biological structures, chemical reactions
   - **FOR HUMANITIES**: Maps, timelines, infographics
`;
}
