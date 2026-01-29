# Subject Mastery Calculation Formula

**Version:** 2.1 - Per-Chapter Last 3 Attempts Method  
**Last Updated:** January 20, 2026  
**Author:** AI Exam Prep Team

---

## Executive Summary

Subject mastery is calculated using a **per-chapter recent attempts method** that:
1. Groups quizzes by chapter
2. For each chapter, averages the **last 3 quiz attempts**
3. Averages chapter masteries
4. Multiplies by chapter coverage percentage


This approach solves the "practice penalty" problem (old low scores dragging down mastery) while maintaining accuracy and preventing gaming.

---

## The Formula

```
Step 1: For each chapter, calculate chapter mastery
  Chapter Mastery = Average of (last 3 quiz attempts' scores)
  
Step 2: Calculate average across attempted chapters
  Avg Chapter Mastery = Sum of chapter masteries / Number of chapters attempted
  
Step 3: Calculate chapter coverage
  Coverage = (Chapters attempted / Total chapters) × 100
  
Step 4: Final subject mastery
  Subject Mastery = (Avg Chapter Mastery × Coverage) / 100
```

---

## Detailed Algorithm

### 1. Data Collection

```typescript
// Get ALL completed quizzes for the subject
const completedQuizzes = await prisma.quiz.findMany({
    where: {
        user_id: userId,
        subject_id: subjectId,
        status: "COMPLETED",
        total_points: { gt: 0 }
    },
    select: {
        score: true,
        total_points: true,
        chapter_id: true,
        completed_at: true,
        created_at: true
    }
});
```

### 2. Group by Chapter

```typescript
// Group quizzes by chapter_id
const quizzesByChapter = new Map<string, Quiz[]>();

completedQuizzes.forEach(quiz => {
    if (quiz.chapter_id !== null) {
        const chapterId = quiz.chapter_id.toString();
        if (!quizzesByChapter.has(chapterId)) {
            quizzesByChapter.set(chapterId, []);
        }
        quizzesByChapter.get(chapterId)!.push(quiz);
    }
});
```

### 3. Calculate Per-Chapter Mastery

```typescript
const chapterMasteries: number[] = [];

quizzesByChapter.forEach((chapterQuizzes) => {
    // Sort by date (newest first)
    const sortedQuizzes = chapterQuizzes.sort((a, b) => {
        const dateA = a.completed_at || a.created_at;
        const dateB = b.completed_at || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Take last 3 attempts (or all if less than 3)
    const recentAttempts = sortedQuizzes.slice(0, 3);

    // Calculate cumulative score for these attempts (naturally weights by quiz size)
    const totalScore = recentAttempts.reduce((sum, q) => sum + q.score, 0);
    const totalPoints = recentAttempts.reduce((sum, q) => sum + q.total_points, 0);
    const chapterMastery = (totalScore / totalPoints) * 100;

    chapterMasteries.push(chapterMastery);
});
```

### 4. Calculate Final Mastery

```typescript
// Average mastery across all attempted chapters
const avgChapterMastery = chapterMasteries.length > 0
    ? chapterMasteries.reduce((sum, m) => sum + m, 0) / chapterMasteries.length
    : 0;

// Calculate chapter coverage
const totalChapters = subject.chapters.count;
const chaptersAttempted = quizzesByChapter.size;
const coveragePercentage = totalChapters > 0 
    ? (chaptersAttempted / totalChapters) * 100 
    : 0;

// Final mastery
const subjectMastery = Math.round((avgChapterMastery * coveragePercentage) / 100);
```

---

## Worked Examples

### Example 1: Learning Progression (Solves Practice Penalty)

**Scenario:** Student practices Chapter 1 multiple times, showing improvement

**Chapter 1 Quiz History (oldest to newest):**
1. Quiz 1: 5/10 = 50%
2. Quiz 2: 6/10 = 60%
3. Quiz 3: 7/10 = 70%
4. Quiz 4: 8/10 = 80%
5. Quiz 5: 9/10 = 90%
6. Quiz 6: 9/10 = 90%
7. Quiz 7: 10/10 = 100%

**Calculation:**
```
Last 3 attempts: [90%, 90%, 100%]
Average = (90 + 90 + 100) / 3 = 93.3%

Chapter 1 Mastery: 93.3% ✅
(Old method would have been: 78.6% ❌)
```

**Subject Level:**
```
Avg Chapter Mastery: 93.3% (only 1 chapter)
Coverage: 1/10 = 10%
Subject Mastery = (93.3% × 10%) / 100 = 9% ✅
```

---

## Why This Works

### ✅ Solves "Practice Penalty"
- Early low scores don't permanently drag down mastery
- Recent performance (last 3 attempts) reflects current knowledge
- Students see their improvement rewarded faster

### ✅ Prevents "Easy Quiz Gaming"
- Must demonstrate mastery across ALL chapters (coverage requirement)
- Can't inflate mastery by retaking easy quizzes on one chapter
- Requires consistent performance (average of 3 attempts, not just 1)

### ✅ Naturally Weights by Quiz Size
- Using the cumulative method `(total_score / total_points)` means a 20-question quiz carries more weight than a 5-question quiz.
- Example: 5/5 (100%) and 10/20 (50%) results in (5+10)/(5+20) = 60%, reflecting the higher effort of the larger quiz.

---

## Edge Cases

### Case 1: Less Than 3 Attempts per Chapter
**Behavior:** Use all available attempts
```
If chapter has only 2 attempts: average both
If chapter has 1 attempt: use that 1 score
```

### Case 2: Subject-Level Quizzes (No chapter_id)
**Behavior:** Excluded from calculation
```
Quizzes with chapter_id = null are filtered out
They don't inflate coverage or mastery
```

---

## Configuration

### Tunable Parameters

| Parameter | Current Value | Rationale |
|-----------|--------------|-----------|
| **Attempts Window** | 3 | Reflects latest learning while staying stable |
| **Rounding** | Nearest integer | Simplicity for users |

---

## Implementation Files

### Mobile App
- **File:** `/api/mobile/dashboard/continue-learning/route.ts`

### Web App  
- **File:** `/app/app/subjects/actions.ts`

Both implementations use **identical algorithms** to ensure consistency.

**Last Reviewed:** January 20, 2026
