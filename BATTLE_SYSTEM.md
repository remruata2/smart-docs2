# Battle System Documentation

## Overview
The Battle System allows users to compete in real-time quizzes (1v1 or Group). It leverages **Supabase Realtime** for synchronization and **Prisma** for data persistence.

## Architecture

### Tech Stack
-   **Frontend**: Next.js 14 App Router, React Server Components + Client Components.
-   **Backend**: Next.js API Routes (Serverless).
-   **Database**: PostgreSQL (via Prisma ORM).
-   **Realtime**: Supabase Realtime (Channels/Broadcast).
-   **State Management**: React State + Optimistic UI.

### Data Model
-   **Battle**: Represents the room. Stores `code` (join code), `status` (WAITING/IN_PROGRESS/COMPLETED), `settings`, and `duration_minutes`.
-   **BattleParticipant**: Links `User` to `Battle`. Stores `score`, `current_q_index`, `finished` status, and `completed_at` (for tie-breaking).
-   **Quiz**: Reused from standard quiz system. A Battle refers to a single `Quiz` instance.

## Key Workflows

### 1. Creation & Joining
-   **Creation**: User generates a battle. Requires `BattleService.createBattle`. A `Quiz` is automatically generated (via `QuizService` using Question Bank or AI) or linked.
-   **Joining**: Users join via 6-digit code. `api/battle/join` -> `BattleService.joinBattle`.
-   **Lobby**: `BattleLobbyRoom.tsx` connects to Supabase channel `battle:[id]`. Listen for `BATTLE_UPDATE` (joins/leaves).

### 2. Host Controls (Settings)
Host can configure the battle in the Lobby:
-   **Topic**: Select Subject/Chapter (Updates `quiz_id`).
-   **Questions**: 5-20 questions.
-   **Duration**: 3, 5, 10, 15 minutes.
-   **Flow**:
    1.  Host opens Settings Dialog.
    2.  Updates trigger `api/battle/settings`.
    3.  Server regenerates/links new Quiz if needed.
    4.  Broadcast `BATTLE_UPDATE` (Settings).
    5.  Clients update UI instantly.

### 3. Gameplay (Battle Arena)
-   **Start**: Host clicks Start -> Broadcast `START` signal.
-   **Timer**: **Global Timer** controlled by `started_at` + `duration_minutes`. Local clients calculate remaining time based on server time.
-   **Progress**:
    -   Answers submitted to `api/battle/update-progress`.
    -   Server updates `BattleParticipant` score/index.
    -   Broadcasts `PROGRESS` event to update live scores.
-   **Completion**:
    -   Natural Finish: User completes all questions.
    -   Timeout: Global timer hits 0. Client forces `finished: true` submission.
    -   **Tie-Breaker**: Ranking sorted by Score (Desc) -> `completed_at` (Asc).

### 4. Performance Optimizations
-   **Page Load**: Parallel fetching of User Session, Course Data, and Battle Data.
-   **Optimistic Leave**: "Leave Battle" button redirects immediately while background request handles cleanup (fire-and-forget).
-   **Settings**: Uses "Question Bank" priority to avoid slow AI generation during setting changes.

## Current Limitations / Future Work
-   **Points & Streaks**: Battle completion currently updates the in-game score but **does not** yet award global User Points or update Daily Streaks (unlike standard Quizzes). 
-   **Reconnection**: Improving state recovery if a user refreshes during a battle (currently handles basic recovery but could be smoother).
-   **Question Types**: Currently optimized for MCQ/TrueFalse.

## API Reference
-   `POST /api/battle/create` - Create new battle.
-   `POST /api/battle/join` - Join with code.
-   `POST /api/battle/settings` - Update topic/duration/questions.
-   `POST /api/battle/start` - Start the battle.
-   `POST /api/battle/update-progress` - Submit answer/score.
-   `POST /api/battle/leave-battle` - Leave the room.
-   `POST /api/battle/ready` - Toggle ready status.
