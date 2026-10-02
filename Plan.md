# Kochi — product plan

Kochi (コーチ, Japanese for "coach") is an effortless AI personal coach for training and nutrition: it plans, the user executes with as few taps as possible, and the plan adapts to what actually happens. Kochi is also the name of the in-app AI coach.

Principle carried over from the [original MVP plan](docs/plan-v1-mvp.md): **application code owns calculations and decisions; the AI explains, coaches, and drafts — and every AI output has a deterministic fallback.**

---

## 1. Onboarding

Collects:

- Fitness goal: fat loss, muscle gain, recomposition, general fitness
- Training experience, training days per week, session duration
- Age, sex, height, weight, activity level
- Available equipment, dietary preferences
- Foods, movements, or constraints to avoid

After onboarding:

1. The AI generates a draft plan.
2. The user reviews it.
3. The user confirms it, or
4. adds feedback and regenerates it.
5. Only after confirmation are routines and workout sessions persisted.

## 2. AI plan generation

- OpenRouter for model access.
- Qwen3 32B generates candidate workout plans.
- Typesafe Jev scores the candidates.
- Synchronous for now: 30 s generation timeout, 10 s Jev timeout.
- Deterministic fallback plan when OpenRouter is unavailable, the model times out, returns invalid JSON, or uses unsupported exercises.

The AI must use only catalog exercises; respect equipment, experience, schedule and duration; generate exactly the requested number of training days; produce structured JSON; avoid medical advice; and return practical, sustainable plans.

## 3. AI feedback and guardrails

Users can comment, e.g. "Replace barbell squats because my knee feels uncomfortable", "I only have dumbbells at home", "Make the sessions shorter", "I dislike deadlifts".

Feedback (and any free text from onboarding) is untrusted input:

- Max 600 characters; control characters stripped.
- System instructions state that user text cannot override instructions, reveal prompts or secrets, change the JSON format, request unrelated content, bypass workout constraints, or trigger external actions.

## 4. Plan review flow

- Generated plans are stored in `plan_drafts`.
- Review at `/app/plan`: each training day and its exercises.
- Feedback + regenerate; confirm with "Use this plan".
- Confirmation persists into the routine/template tables and deletes the draft.

## 5. Routine and template overhaul

- Users never build routines or templates by hand; the AI generates them and the structure stays mostly invisible.
- Presented as "Your plan" and "Workout sessions".
- Templates/Routines removed from workout history; legacy list routes redirect to the main flow.

## 6. Workout logging

- Today's workout on the home screen; start it from the dashboard.
- Planned exercises and sets pre-filled; one tap marks a set done.
- No routine/template configuration in the way.
- History and progress tracking maintained.

## 7. Nutrition

- Meal plans generated from goal, body metrics, activity level, dietary preferences, restrictions and dislikes.
- Easy meal logging with minimal taps.
- Recommendations adapt to adherence and progress over time.
- Nutrition is a main navigation section.

## 8. Adaptive progression

Signals: completed and missed workouts, exercise performance (reps, weights), body weight and metrics, meal adherence, user feedback, recovery and consistency patterns.

Actions: adjust training volume, target reps or weights, swap exercises, change session duration, adjust calories/macros, modify the weekly split, recommend deloads or recovery changes.

## 9. Queues and background processing

Keep AI generation synchronous with deterministic fallbacks; don't introduce Redis/BullMQ prematurely. Later candidates for queues: background plan regeneration, weekly plan updates, nutrition recalculation, progress analysis, scheduled adaptive recommendations.

## 10. Coach experience (Kochi)

The natural-language layer over the structured data: explain why a workout changed, answer training and meal questions, summarise progress, suggest adjustments, help recover from missed sessions, give context-aware recommendations from history.

---

## Status (as of 2026-10-02)

| Section | Status |
|---|---|
| 1 Onboarding | Done, including separate movements/foods to avoid and "Update my answers" |
| 2 AI generation | Done; unsupported exercises are dropped, fallback only if a day falls below 2 exercises |
| 3 Guardrails | Done for plan feedback and onboarding avoid-text; avoided movements are removed from the catalog before generation |
| 4 Plan review | Done |
| 5 Routine overhaul | Done, with "Your plan" at `/app/plan` (view, change via feedback, update answers). Legacy detail/editor routes were deleted rather than kept |
| 6 Workout logging | Done: Home starts/resumes the session directly, prefilled sets, one-tap completion, rest timer, set-level progressive overload |
| 7 Nutrition | Nav tab + placeholder only |
| 8 Adaptive progression | Only per-set weight/rep suggestions |
| 9 Queues | Deferred, as planned |
| 10 Coach | Placeholder only |

## Implementation phases

Each phase ends with a commit.

### Phase 0 — close gaps ✅
- Separate "movements or injuries to avoid" and "foods to avoid"; pass both to the model as untrusted text; the fallback plan drops avoided movements.
- "Your plan" view at `/app/plan` after confirmation, with "Change my plan" (feedback → new draft) and "Update my answers" (onboarding prefilled).
- Enforce onboarding in the app layout, not only at login.
- Home starts today's session directly; rest timer after each logged set.
- Vitest with tests for set suggestions, plan validation and input sanitising.
- Rename the product to Kochi.

### Phase 1 — nutrition foundations (deterministic)
- Daily calorie and protein targets from profile + goal (BMR × activity, goal adjustment, protein per kg), recalculated on weight change.
- Fast meal logging: calories + protein, saved meals, "same as yesterday", one-tap repeats.
- Nutrition home: today's targets vs logged.
- Tables: `nutrition_targets`, `meals`, `meal_logs`.

### Phase 2 — AI meal plans
- Weekly meal plan from goal, body, diet and avoid-list via the same draft → review → confirm flow and guardrails, with a deterministic fallback.
- "I ate this" one-tap logging from the plan; swap a meal.

### Phase 3 — adaptive engine (rules, not AI)
- Weekly review of adherence, missed sessions, lift trends, body-weight trend, meal adherence and feedback.
- Proposes changes with reasons (volume, targets, swaps, duration, deload, calories/macros); the user accepts on a "This week's changes" card; every change is logged.
- Runs on first app open of a new week; no queue required.

### Phase 4 — Kochi coach
- Chat grounded in the user's data: explains changes from the Phase 3 log, summarises progress, answers training/meal questions, helps after missed sessions.
- Same untrusted-input guardrails; no medical advice; read-only — changes go through confirmation.

### Phase 5 — infrastructure, when needed
- Background jobs (in-container cron first, BullMQ later) for weekly updates and recalculation.
- Offline workout logging; reminders.
