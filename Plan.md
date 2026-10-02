# Adaptive Fitness Coach PWA - Build Plan

## 1. Product Overview

Build a mobile-first Progressive Web App (PWA) that acts as an adaptive personal fitness coach.

The product combines:
- Workout planning and logging
- Nutrition planning and meal logging
- Progress tracking
- An AI coach with longitudinal memory
- Adaptive recommendations based on what the user actually does

Core loop:

**PLAN → TRAIN → LOG → MEASURE → ANALYZE → ADAPT → REPEAT**

The AI is not the fitness engine. Deterministic application logic owns calculations and recommendations; AI provides natural-language input, explanations, coaching, summaries, and conversational access to structured data.

### Product thesis

> An adaptive fitness coach that learns from what you actually do.

---

## 2. MVP Goal

Validate whether users consistently log workouts and nutrition when tracking, adaptive recommendations, and an AI coach are combined into one product.

Do not attempt to build a complete MyFitnessPal + Hevy + Fitbod + MacroFactor replacement in V1.

### MVP pillars

1. Workout logging
2. Nutrition logging
3. Progress tracking
4. AI coach
5. Adaptive plan recommendations
6. Excellent mobile/PWA UX
7. Offline workout logging

---

## 3. Target User

Initial target:
- Gym users
- Beginners through intermediate lifters
- Fat-loss, muscle-gain, recomposition, and general-fitness goals
- People who struggle to consistently manage workouts, food, and progress

Do not initially optimize for:
- Professional athletes
- Clinical/medical use
- Professional bodybuilding
- Coaches managing many clients
- Advanced sports performance

---

## 4. Product Principles

### 4.1 Logging must be extremely fast

Remember previous weights/reps, provide sensible defaults, allow quick set completion, and minimize forms.

Example:

Previous:
- 70 kg × 8
- 70 kg × 8
- 70 kg × 7

Next target:
- 70 kg × 8-9

### 4.2 AI should not own deterministic logic

Use application code for:
- Calories
- Protein targets
- Progression
- Volume
- Trend calculations
- PR detection
- Adherence
- Workout history

Use AI for:
- Natural-language input
- Coaching
- Explanations
- Summaries
- Conversational queries
- Interpreting structured metrics
- Suggestions within defined constraints

Preferred architecture:

`User → App → Fitness/Nutrition Engine → Structured recommendation → AI explanation`

### 4.3 The app should remember

The coach should understand relevant historical context.

Examples:
- "How did my chest training go this month?"
- "Why am I not losing weight?"
- "Should I increase my bench?"
- "I missed two workouts this week. What should I do?"
- "What should I eat tonight?"

### 4.4 Mobile first

Design for phone screens first. Desktop is a responsive extension.

### 4.5 Offline-first workout logging

Use IndexedDB, optimistic UI, a sync queue, retry handling, and conflict-safe synchronization.

---

## 5. Core User Journey

First session:

1. Landing page
2. Create account
3. Onboarding
4. Define goal
5. Define experience
6. Define schedule
7. Define equipment
8. Define dietary preferences
9. Enter basic body metrics
10. Generate initial plan
11. Show today's workout
12. Start workout
13. Log first set
14. Complete workout
15. Log food
16. See daily progress
17. Meet AI coach

The user should reach the first meaningful workout quickly.

---

## 6. Onboarding

Collect only what is required to produce a useful initial plan.

### Goal
- Lose fat
- Build muscle
- Recomposition
- General fitness

### Experience
- Beginner
- Intermediate
- Advanced

### Training days
- 2
- 3
- 4
- 5
- 6

### Session duration
- 30 minutes
- 45 minutes
- 60 minutes
- 75+ minutes

### Equipment
- Full gym
- Dumbbells
- Home gym
- Bodyweight
- Custom selection

### Basic body information
- Age
- Sex
- Height
- Weight
- Activity level

### Dietary preferences
- No restriction
- Vegetarian
- Vegan
- Other configurable restrictions
- Allergies/restrictions
- Foods to avoid

Do not build a huge food database in V1.

---

## 7. Main Navigation

Mobile navigation:

1. Home
2. Workout
3. Nutrition
4. Progress
5. Coach

Profile/settings should be accessible from a menu.

---

## 8. Home Dashboard

The home screen answers:

> What should I do today?

Display:
- Today's workout
- Estimated duration
- Exercise count
- Start workout button
- Calories consumed / target
- Protein consumed / target
- Current weight
- Weight trend
- Recent strength PR
- One concise coach insight
- Weekly summary

Example coach insight:

> "You completed all 3 workouts this week and your squat volume is trending upward. Keep the current progression next week."

---

## 9. Workout System

A workout plan contains:
- Plan
- Training days
- Exercises
- Sets
- Rep ranges
- Target RIR/RPE
- Rest time
- Progression rule

Example:

### Push A

1. Bench Press
   - 3 sets
   - 6-8 reps
   - RIR 2

2. Incline Dumbbell Press
   - 3 sets
   - 8-12 reps
   - RIR 2

3. Lateral Raise
   - 3 sets
   - 12-15 reps
   - RIR 1-2

---

## 10. Workout Logging

Each set supports:
- Weight
- Reps
- RIR/RPE
- Completed/skipped
- Notes

Always show previous performance.

Support natural-language logging such as:

> Bench 70 for 8, 8, 7

Convert it to structured, schema-validated workout data.

Never allow arbitrary LLM output to directly mutate workout records.

---

## 11. Progression Engine

Start with simple, explainable rules.

### Double progression

For an exercise with 8-12 reps:

Current:
- 20 kg × 10
- 20 kg × 10
- 20 kg × 9

Next:
- Keep 20 kg
- Attempt higher reps

Once prescribed sets consistently reach the upper range with appropriate effort, increase weight.

Example:

`20 kg × 12, 12, 12 → next session 22.5 kg`

Consider:
- Previous performance
- Recent performance trend
- RIR/RPE
- Missed reps
- Exercise history
- Recent volume
- Deload status
- Available equipment increments

Do not implement ML-based progression in V1.

---

## 12. Workout Analytics

Track:
- Total sets
- Total reps
- Training volume
- Exercise frequency
- Muscle-group volume
- Estimated 1RM
- PRs
- Rep PRs
- Weight PRs
- Volume PRs
- Workout consistency

Keep charts simple.

---

## 13. Exercise Database

Start with at least 30 common exercises.

Each exercise:
- Name
- Primary muscle
- Secondary muscles
- Equipment
- Movement pattern
- Instructions
- Alternatives

Allow custom exercises later.

---

## 14. Nutrition System

Initially focus on:
- Calories
- Protein
- Carbohydrates
- Fat

Calculate estimated calorie requirements from:
- Age
- Sex
- Height
- Weight
- Activity level
- Goal

The app must clearly label calculated values as estimates.

Nutrition calculations belong in application code, not the LLM.

---

## 15. Meal Logging

Support:

### Quick entry
- 2 eggs
- 2 rotis
- 1 bowl dal

### Natural language

> I had paneer, three rotis and dal for lunch.

AI extracts:
- Foods
- Quantities
- Meal type

Ask for clarification when confidence is low.

### Saved meals

Allow users to save common meals such as:
- Breakfast
- Lunch
- Dinner
- Snacks

---

## 16. Food Database

V1 should use a small curated database plus user-created foods/meals.

Support:
- grams
- ml
- piece
- serving
- roti
- bowl/katori
- tablespoon
- teaspoon

Nutrition values must come from structured data. Do not let the AI invent nutritional values.

---

## 17. Nutrition Feedback

Show:
- Calories remaining
- Protein remaining
- Macro progress
- Recent adherence

Example:

> Protein: 92 / 130 g

Then provide actionable suggestions.

Avoid medical or disease-related nutrition advice.

---

## 18. Progress Tracking

Track optional body metrics:
- Weight
- Waist
- Chest
- Arms
- Thighs

Support progress photos:
- Front
- Side
- Back

Track strength:
- Exercise PRs
- Estimated 1RM
- Rep progression

Use weight trends/moving averages rather than overemphasizing daily fluctuations.

---

## 19. AI Coach

The AI coach should behave like a coach with structured memory.

Example questions:
- "What should I do today?"
- "Why did my weight increase this week?"
- "Should I increase my bench weight?"
- "I missed yesterday's workout. What should I change?"
- "How am I progressing?"
- "What should I eat tonight?"
- "Give me my weekly review."
- "Why have I stopped progressing?"

### Context layer

Do not send the entire database to the LLM.

Build relevant context:

```text
User profile
Current goal
Current workout plan
Recent 4-8 workouts
Recent nutrition summary
Weight trend
Measurements
Recent PRs
Adherence
Current recommendations
Relevant conversation history
```

---

## 20. AI Tools

The AI should use application tools rather than directly querying the database.

Potential tools:
- get_user_profile
- get_today_workout
- get_workout_history
- get_exercise_history
- get_progress_summary
- get_weight_trend
- get_nutrition_summary
- get_daily_targets
- log_workout
- log_meal
- update_workout
- suggest_workout_change
- generate_weekly_review

All tool inputs/outputs must be schema validated.

---

## 21. Weekly AI Review

Generate a structured weekly review:

### This week
- Workouts completed / planned
- Average calories
- Average protein
- Weight trend
- Strength changes

### What went well
2-3 points.

### What needs attention
1-3 points.

### Recommendation
Specific changes for next week.

AI should explain recommendations using actual tracked data.

---

## 22. Adaptive Plan Engine

Do not change plans randomly.

Possible triggers:
- Consistent completion
- Repeated missed workouts
- Stalled progression
- Fatigue feedback
- Weight trend differing from goal
- Nutrition adherence
- Schedule changes
- Equipment changes

Example:

If a user repeatedly misses 60-minute workouts, recommend a shorter schedule rather than simply adding more work.

AI recommendations must not silently modify the user's plan.

Show:

> "I recommend changing your plan because..."

Then provide:

**Apply change**

---

## 23. AI Safety / Guardrails

This is a fitness product, not a medical product.

AI must not:
- Diagnose conditions
- Claim to treat disease
- Give dangerous exercise instructions
- Encourage extreme calorie restriction
- Encourage eating disorders
- Recommend unsafe supplement/drug use
- Override professional medical advice

When a question requires medical expertise, encourage consultation with a qualified professional.

---

## 24. PWA Architecture

### Frontend

Recommended:
- Next.js
- React
- JavaScript
- Tailwind CSS
- shadcn/ui

### PWA

Implement:
- Web app manifest
- Service worker
- Installable app
- Offline asset caching
- Offline workout logging

### Local storage

Use IndexedDB for:
- Current workout
- Pending workout events
- Pending meal logs
- Offline state

Recommended library:

`Dexie`

---

## 25. Backend

Keep the MVP architecture simple.

Recommended:
- Next.js route handlers/API
- MongoDB
- MongoDB driver or Mongoose

Do not create separate frontend/backend repositories initially.

---

## 26. Database

MongoDB collections:

### users

```js
{
  _id,
  email,
  name,
  createdAt,
  updatedAt
}
```

### userProfiles

```js
{
  userId,
  goal,
  experience,
  age,
  sex,
  height,
  weight,
  activityLevel,
  trainingDays,
  sessionDuration,
  equipment,
  dietaryPreferences,
  restrictions,
  createdAt,
  updatedAt
}
```

### workoutPlans

```js
{
  userId,
  name,
  status,
  days: [],
  createdAt,
  updatedAt
}
```

### exercises

```js
{
  name,
  primaryMuscle,
  secondaryMuscles: [],
  equipment,
  movementPattern,
  instructions,
  alternatives: []
}
```

### workoutSessions

```js
{
  userId,
  planId,
  dayId,
  startedAt,
  completedAt,
  status,
  exercises: [],
  notes,
  createdAt
}
```

### meals

```js
{
  userId,
  date,
  mealType,
  items: [],
  calories,
  protein,
  carbs,
  fat,
  source,
  createdAt
}
```

### foods

```js
{
  name,
  servingSize,
  servingUnit,
  calories,
  protein,
  carbs,
  fat,
  source
}
```

### bodyMetrics

```js
{
  userId,
  date,
  weight,
  waist,
  chest,
  arms,
  thighs,
  photos: [],
  createdAt
}
```

### coachMessages

```js
{
  userId,
  conversationId,
  role,
  content,
  toolCalls: [],
  createdAt
}
```

### recommendations

```js
{
  userId,
  type,
  source,
  reason,
  recommendation,
  status,
  createdAt
}
```

---

## 27. Event-Based Logging

Prefer meaningful events where useful:

- workout_started
- set_logged
- set_updated
- workout_completed
- workout_skipped
- meal_logged
- weight_logged
- measurement_logged
- plan_changed

Do not turn this into a distributed event system. MongoDB is sufficient for MVP.

---

## 28. API Structure

```text
/api/auth
/api/profile
/api/workouts
/api/workouts/:id
/api/workouts/:id/sets
/api/workout-plans
/api/exercises
/api/nutrition
/api/meals
/api/foods
/api/progress
/api/coach
/api/coach/tools
/api/recommendations
```

Validate every input and keep APIs predictable.

---

## 29. Authentication

Use an established authentication solution.

Support:
- Google authentication
- Email/password

Requirements:
- Secure sessions
- Password hashing if passwords are supported
- Protected routes
- User-owned data isolation

---

## 30. UI/UX Requirements

The UI should feel:
- Fast
- Clean
- Modern
- Calm
- Fitness-oriented
- Data-driven without feeling clinical

Avoid:
- Huge dashboards
- Excessive cards
- Excessive charts
- Gamification overload
- Constant AI-generated text
- Long forms

Critical interaction:

Starting a workout should take one tap from Home.

Logging a set should take seconds.

Logging a common meal should take a few seconds.

---

## 31. Core Screens

Build:

1. Landing
2. Sign up / Login
3. Onboarding
4. Home
5. Today's Workout
6. Active Workout
7. Workout History
8. Exercise Detail
9. Nutrition Today
10. Add Meal
11. Saved Meals
12. Progress
13. AI Coach
14. Profile / Settings

Do not build all screens simultaneously.

---

## 32. Development Phases

### Phase 1 - Foundation

- Next.js
- JavaScript
- Tailwind
- shadcn/ui
- MongoDB
- Authentication
- User profile
- PWA manifest
- Responsive shell/navigation

Definition of done:

User can create an account and complete onboarding.

### Phase 2 - Workout Engine

- Exercise database
- Workout plan schema
- Workout generation
- Today's workout
- Active workout
- Set logging
- Previous performance
- Workout completion
- Workout history

Definition of done:

A user can complete an entire workout from a phone.

### Phase 3 - Offline Workout

- IndexedDB
- Local workout state
- Offline set logging
- Sync queue
- Retry handling
- Sync status

Definition of done:

User can go offline, complete a workout, reconnect, and see synchronized data.

### Phase 4 - Progression Engine

- Double progression
- Suggested weight/reps
- PR detection
- Volume calculation
- Exercise history
- Progression explanations

Definition of done:

The next workout reflects previous performance.

### Phase 5 - Nutrition

- Daily calorie target
- Protein target
- Food database
- Meal logging
- Saved meals
- Daily totals
- Natural-language meal parsing

Definition of done:

User can track an entire day's food without another app.

### Phase 6 - Progress

- Weight logging
- Weight trend
- Measurements
- Strength charts
- PR history
- Weekly summary

Definition of done:

User can understand whether they are progressing.

### Phase 7 - AI Coach

- Coach chat
- Context builder
- Tool calling
- Workout history queries
- Nutrition queries
- Progress queries
- Weekly review

Definition of done:

AI answers are grounded in actual user data.

### Phase 8 - Adaptive Plans

- Adherence analysis
- Progress analysis
- Plan recommendations
- Nutrition target adjustments
- Schedule adaptation
- User approval flow

Definition of done:

The system can explain and propose useful changes without silently changing the plan.

---

## 33. Analytics

Track:

```text
signup
onboarding_completed
workout_started
set_logged
workout_completed
meal_logged
weight_logged
coach_opened
coach_message_sent
recommendation_viewed
recommendation_applied
weekly_review_viewed
```

Important metrics:

### Activation

`Signup → onboarding → first workout`

### Workout retention
- First workout
- Second workout
- Week 1
- Week 2
- Week 4

### Nutrition adoption

Percentage of active users logging at least one meal.

### AI engagement

Percentage of active users repeatedly interacting with Coach.

### Core retention metric

Weekly users completing at least one workout.

---

## 34. Monetization

Do not build complex billing during the first prototype.

Initial hypothesis:

### Free
- Basic workout tracking
- Basic nutrition tracking
- Basic progress

### Pro
- AI Coach
- Adaptive plans
- Advanced analytics
- Weekly AI review
- Advanced nutrition features

Initial India pricing hypothesis:

`₹299-₹499/month`

Annual:

`₹2,499-₹3,999/year`

Treat these as hypotheses to validate.

---

## 35. Explicitly Do NOT Build in MVP

- Social feed
- Followers
- Likes
- Challenges
- Trainer marketplace
- Wearable integrations
- Apple Health
- Google Health Connect
- Computer vision
- AI body scanning
- Barcode scanning
- Restaurant integrations
- Grocery delivery
- Supplement marketplace
- Huge food database
- Native iOS app
- Native Android app
- Desktop application
- Advanced ML models
- Complex recommendation algorithms
- Multi-user trainer accounts
- Corporate wellness
- Medical features

Every feature must justify itself against the core loop.

---

## 36. AI Implementation Rules

Use structured outputs and JSON schema validation.

### Meal extraction

```json
{
  "mealType": "lunch",
  "items": [
    {
      "name": "dal",
      "quantity": 1,
      "unit": "bowl"
    }
  ]
}
```

### Workout extraction

```json
{
  "exercise": "Bench Press",
  "sets": [
    {
      "weight": 70,
      "reps": 8
    },
    {
      "weight": 70,
      "reps": 8
    }
  ]
}
```

Never parse arbitrary prose when structured output is possible.

---

## 37. Prompt Architecture

Maintain separate prompts for:
- Coach conversation
- Meal parser
- Workout parser
- Weekly review
- Plan adaptation

Do not create one giant prompt.

Coach context:

```text
SYSTEM INSTRUCTIONS
+
USER PROFILE
+
CURRENT STATE
+
RELEVANT HISTORY
+
AVAILABLE TOOLS
```

Only retrieve relevant historical context.

---

## 38. Privacy

Fitness data is personal data.

Requirements:
- Users can delete their account
- Users can delete their data
- Strict user data isolation
- Secure photo storage
- Avoid unnecessary personal information in AI prompts
- Log AI tool calls for debugging without storing unnecessary sensitive data

---

## 39. Error Handling

Handle gracefully:
- Offline mode
- AI unavailable
- Database unavailable
- Sync failure
- Invalid AI output
- Food not found
- Exercise not found
- Duplicate requests
- Network timeout

Never lose a workout because an API request failed.

---

## 40. Testing

### Unit tests

- Calorie calculation
- Macro calculation
- Weight trend
- Volume calculation
- 1RM calculation
- Progression rules
- PR detection
- Adherence calculation

### Integration tests

- Create workout
- Log set
- Complete workout
- Offline sync
- Log meal
- Generate recommendation

### E2E

- Signup → onboarding → workout → logging → completion
- Signup → onboarding → nutrition → meal logging
- Offline workout → reconnect → sync

---

## 41. Performance

The workout screen is the most latency-sensitive screen.

Requirements:
- Fast initial load
- Optimistic set completion
- Local workout state
- Minimal network dependency
- AI calls must never block normal workout completion

---

## 42. Suggested Repository Structure

```text
app/
  (auth)/
  (dashboard)/
    home/
    workout/
    nutrition/
    progress/
    coach/
  api/

components/
  ui/
  workout/
  nutrition/
  progress/
  coach/

lib/
  db/
  auth/
  fitness/
    progression.js
    volume.js
    oneRepMax.js
    adherence.js
  nutrition/
    calories.js
    macros.js
  ai/
    coach.js
    context.js
    tools.js
    schemas.js

models/
  User.js
  UserProfile.js
  Exercise.js
  WorkoutPlan.js
  WorkoutSession.js
  Meal.js
  Food.js
  BodyMetric.js
  CoachMessage.js
  Recommendation.js

hooks/
  useWorkout.js
  useOfflineSync.js
  useNutrition.js

services/
  workoutService.js
  nutritionService.js
  progressService.js
  coachService.js

public/
  manifest.webmanifest
```

Adjust only when framework conventions provide a clear improvement.

---

## 43. Coding Standards

Use JavaScript, not TypeScript, for this MVP.

Requirements:
- ESLint
- Prettier
- Clear naming
- Small functions
- Avoid unnecessary abstractions
- Avoid premature architecture
- Validate external input
- Keep business logic testable
- Isolate AI code
- Isolate database access
- Never expose secrets to client code

Environment variables:

```text
MONGODB_URI=
AUTH_SECRET=
AI_API_KEY=
```

Use `.env.local`.

Never commit secrets.

---

## 44. Design System

Use shadcn/ui where appropriate.

Reusable primitives:
- Button
- Input
- Select
- Dialog
- Sheet
- Card
- Progress
- Tabs
- Toast
- Bottom navigation

Fitness components:
- ExerciseCard
- SetRow
- WorkoutTimer
- WorkoutProgress
- MacroProgress
- WeightTrend
- PRBadge
- CoachInsight
- MealCard

---

## 45. Seed Data

Create development seed data.

### Exercises

At least 30 common exercises.

### Foods

At least 50 common foods.

### Demo user

Include:
- Example profile
- Example workout plan
- Several completed workouts
- Several meals
- Weight history
- PR history
- Example coach conversations

The dashboard should immediately look useful during development.

---

## 46. AI Coding Agent Instructions

The coding agent must follow this sequence:

### Step 1
Inspect the repository.

Do not overwrite existing work without understanding it.

### Step 2
Create an implementation checklist from this Plan.md.

### Step 3
Set up the application foundation.

### Step 4
Implement authentication and onboarding.

### Step 5
Implement the workout engine.

### Step 6
Implement offline workout logging.

### Step 7
Implement progression.

### Step 8
Implement nutrition.

### Step 9
Implement progress tracking.

### Step 10
Implement AI Coach.

### Step 11
Implement adaptive recommendations.

### Step 12
Add tests and polish.

After every phase:
- Run lint
- Run tests
- Fix errors
- Verify mobile layout
- Do not proceed while core functionality is broken

---

## 47. Coding Agent Behavior

The coding agent should:
- Prefer simple solutions
- Avoid over-engineering
- Reuse components
- Keep business logic separate from UI
- Validate all AI outputs
- Never silently mutate user plans
- Preserve offline data
- Add tests for important algorithms
- Use realistic seed data
- Keep the app usable after every milestone

When requirements are ambiguous:

1. Prefer the simplest interpretation consistent with this plan.
2. Do not introduce large new features.
3. Record assumptions in `IMPLEMENTATION_NOTES.md`.
4. Continue implementation when the decision is low risk.
5. Ask for clarification only when the decision materially affects architecture, security, cost, or product behavior.

---

## 48. Definition of Done for MVP

A new user can:

1. Create an account
2. Complete onboarding
3. Receive a workout plan
4. Start today's workout
5. Log sets quickly
6. Complete the workout
7. Use the workout app offline
8. Sync data after reconnecting
9. See progression recommendations
10. Log meals
11. See calories and protein
12. Log weight
13. See progress trends
14. Ask the AI coach questions
15. Receive answers grounded in actual data
16. Receive a weekly review
17. See proposed plan adaptations
18. Approve or reject changes

---

## 49. Product Success Criteria

Judge the MVP by behavior, not feature count.

Initial beta targets:
- 20 users
- At least 10 users complete 2+ workouts
- At least 5 users return for multiple weeks
- At least 5 users use nutrition logging
- At least 5 users interact with AI Coach repeatedly
- At least 3 users say they would pay for continued access

These are validation targets, not guarantees.

---

## 50. Future Expansion

Only consider after strong retention.

### Phase 2
- Expo/React Native app
- Health integrations
- Wearables
- Better food database
- Barcode scanning
- Advanced analytics
- More sophisticated adaptive programming

### Phase 3
- Social/community
- Trainer mode
- AI voice coach
- Computer vision
- Form analysis
- Personalized recipes
- Grocery planning

Do not let future ideas complicate MVP architecture.

---

## 51. Product Mental Model

Think of the product as five connected systems:

```text
                 ┌─────────────────┐
                 │    AI COACH     │
                 │ Memory + Explain│
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │ ADAPTIVE ENGINE │
                 └───────┬─┬───────┘
                         │ │
              ┌──────────┘ └──────────┐
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │   WORKOUT   │         │  NUTRITION  │
       │    ENGINE   │         │    ENGINE   │
       └──────┬──────┘         └──────┬──────┘
              │                       │
              └──────────┬────────────┘
                         ▼
                 ┌──────────────┐
                 │   PROGRESS   │
                 │    ENGINE    │
                 └──────────────┘
```

Core loop:

```text
User does something
      ↓
User logs it
      ↓
System understands it
      ↓
Metrics change
      ↓
System detects patterns
      ↓
Coach explains what happened
      ↓
System proposes an adjustment
      ↓
User approves
      ↓
Next plan improves
```

Build this loop before building anything shiny.

---

## 52. First Implementation Task

Start with the smallest vertical slice:

```text
Signup
  ↓
Onboarding
  ↓
Generated workout
  ↓
Today's workout
  ↓
Log one set
  ↓
Complete workout
  ↓
Persist workout
  ↓
Show updated history
```

Do not start by building the AI Coach.

The product must have a useful deterministic fitness core before AI is introduced.

Once this vertical slice works end-to-end, continue with nutrition, progress, and finally AI.
