
# 🧠 MindPulse Feature Build Spec
## Feature: Daily Pulse Check-In & Reflection Log

---

## 🎯 Objective

Implement a Daily Pulse Check-In module that allows users to:

1. Submit one self-report per day
2. Log mood, stress, and energy (1–5 scale)
3. Add an optional short reflection
4. Store entries in local user storage
5. View historical entries in a timeline view
6. Integrate subjective score into overall MindPulse score
7. Emphasize privacy (local-only storage)

This feature replaces the previous Face Tracking Logs section.

---

## 🧱 Tech Assumptions

- Frontend: React (Vite)
- Language: TypeScript
- Storage: localStorage (prototype phase)
- No backend required initially

---

## 📦 Data Model

```ts
export type DailyPulseEntry = {
  id: string
  date: string // ISO format YYYY-MM-DD
  mood: number // 1–5
  stress: number // 1–5
  energy: number // 1–5
  reflection?: string
  createdAt: string
}
```

---

## 💾 Storage Requirements

Use localStorage.

Key:
mindpulse_daily_entries

Stored as:
DailyPulseEntry[]

Create helper functions:

```ts
getDailyEntries(): DailyPulseEntry[]
saveDailyEntry(entry: DailyPulseEntry): void
getTodayEntry(): DailyPulseEntry | null
```

Rules:
- Only one submission allowed per calendar day
- Match by `date` field (YYYY-MM-DD)

---

## 🖥 UI Requirements

### Dashboard Card

Title:
**Daily Pulse Check-In**

If NO entry for today:
- Mood selector (1–5 emoji buttons)
- Stress slider (1–5)
- Energy slider (1–5)
- Optional reflection textarea (max 200 chars)
- Submit button

If entry already exists:
- Show "Today's Check-In Completed"
- Display mood emoji + scores
- Button: "View Reflection History"

---

## 😊 Mood Scale

1 😞 Very Low  
2 🙁 Low  
3 😐 Neutral  
4 🙂 Good  
5 😄 Excellent  

Clickable emoji buttons.

---

## 📖 Reflection History View

Create a secondary view/modal:

Show entries in reverse chronological order.

Each entry displays:
- Date
- Mood emoji
- Stress score
- Energy score
- Reflection text (if exists)

Optional filters:
- Last 7 days
- Last 30 days
- All

---

## ⚙️ Business Logic

### Prevent Duplicate Submission

On component load:
- Call `getTodayEntry()`
- If exists → disable form

---

### Subjective Score Calculation

Convert mood/stress/energy to 0–100 scale:

```ts
const subjectiveScore =
  (mood * 0.4 +
   (6 - stress) * 0.3 +
   energy * 0.3) * 20
```

Normalize between 0–100.

---

## 🧮 Integrate Into Overall Score

Update overall formula to include subjective score:

```ts
OverallScore =
  0.18 * Visual +
  0.32 * Activity +
  0.27 * Sleep +
  0.15 * Environment +
  0.08 * Subjective
```

Subjective weight can be adjusted.

---

## 🔒 Privacy Requirements

Display privacy badge on card:

"Privacy Protected – Daily reflections are stored locally on your device."

Rules:
- Do NOT send reflection text to AI automatically
- Only send numeric summary if AI summary is enabled
- No cloud storage for reflection text in prototype

---

## 🎨 UI Style Guidelines

- Match existing module card design
- Soft pastel accent color (green or lavender)
- Calm, non-clinical design
- Minimalistic
- Rounded corners
- Light shadow

---

## 🚀 Optional Enhancements (If Time Permits)

- 3-day downward mood trend detection
- Streak counter
- Weekly average summary
- Mood trend line chart
- AI-generated weekly insight
- Export to PDF

---

## 🏗 Implementation Steps

1. Create `DailyPulseEntry` type
2. Build localStorage utility helpers
3. Create DailyPulseCheckIn component
4. Add conditional rendering (submitted vs not submitted)
5. Create ReflectionHistory component
6. Add subjective score calculation
7. Integrate into overall score logic
8. Add privacy badge

---

## 🏁 Acceptance Criteria

- User can submit exactly one entry per day
- Entry persists after page refresh
- History view displays correct order
- Subjective score affects overall score
- Reflection text remains local-only
- UI matches existing MindPulse theme
