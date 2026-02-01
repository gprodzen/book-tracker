# Book Tracker Overhaul Plan (Professional Modern UX)

Date: 2026-02-01

This document is the execution guide for the UI/UX and product overhaul discussed. It is designed so another agent can implement the changes consistently across the codebase, using the approved professional concept in `frontend/mockups/new-experience-concepts.html` as the visual and interaction reference.

---

## 1) Goals (What must be true after the overhaul)

1. **Modern, professional UI**: The app should feel like a high-end, professional personal knowledge tool (Notion-adjacent), not a prototype or early-2000s blog.
2. **Logging is first-class**: The primary UX is *state-first progress updates* (current page/percent + optional note), not granular session logs.
3. **Activity feed**: A Strava/Untappd-style feed shows recent progress updates with notes and context.
4. **Kanban feels confident**: Drag-and-drop should feel reliable, with strong affordances, drop cues, and touch/pointer support.
5. **Notes on updates**: Logging allows notes in the same action. Notes are stored with progress updates.
6. **Future-proof**: The logging UX should support linking books via slash commands in notes (immediate TODO, not necessarily fully implemented in the first pass).

Non-goals (for now):
- Fully replacing existing reading session analytics.
- Designing a multi-user social feed.
- Building advanced analytics.

---

## 2) Approved Visual Direction (From the concept file)

Reference: `frontend/mockups/new-experience-concepts.html`

**Design language**
- Warm, professional, editorial aesthetic.
- Minimal glass effects; clean surfaces with subtle paper texture.
- High-end but restrained; soft shadows; legible typography.

**Typography**
- Headings: `Libre Baskerville` (serif, for premium editorial feel)
- Body/UI: `IBM Plex Sans`

**Palette (approximate tokens used in the concept)**
- Background: #f7f4ef (primary), #f1ede6 (soft)
- Panels: #ffffff (surface), #fbfaf8 (muted surface)
- Text: #2b2418 (primary), #6b6051 (muted)
- Accent: #8b5e34 (bronze), #2f6f6d (teal)
- Success: #2f8f5b
- Danger: #c7514d
- Border: #e3ddd1
- Shadow: 0 18px 40px rgba(40, 32, 20, 0.12)

**Component styling patterns**
- Surfaces: solid (not glass), soft borders, subtle shadows.
- Buttons: primary = bronze accent; secondary = white with border.
- Cards: rounded (10–16px), consistent spacing, minimal gradients.
- Subtle texture in background via light grid or paper feel.

**Actionable Implementation Note**
Update `frontend/styles/tokens.css` to align the global theme with the above direction, then update core components to inherit tokens. Do not keep the previous overly “warm library” brown-on-cream palette if it conflicts with the approved design.

---

## 3) New UX Model (User Flows)

### A. Global “Log Update” (Primary Flow)

**Goal:** User can update a book’s *current state* in seconds.

Entry points:
- Global command / FAB (top-level “Quick Log” button)
- Dashboard: “Log Update” card
- Book detail: “Log Update” action

Form requirements:
- Book selection (searchable select)
- Progress mode toggle: **By page** | **By percent**
- Inputs:
  - By page: current page (not “pages read this session”)
  - By percent: current % (works for audiobooks and unknown page count)
- Optional note field
- Optional “Mark finished” toggle (auto when 100%)
- Live preview of new progress

Behavior rules:
- If current_page changes, calculate percent if page_count available.
- If percent set and page_count exists, optionally compute current_page (rounded).
- Always update `last_read_at` on log.
- If status != reading, do **not** block logging (logging should be allowed and can auto-set status to reading if desired; implement decision explicitly).

Immediate TODO:
- Note input should allow a `/link` command to link another book (parsing can be deferred, but structure should support it).

---

### B. Activity Feed (Secondary, but visible)

**Goal:** Show recent progress updates with context and notes.

Feed item content:
- Book title + author
- Progress change (e.g., “120 → 152 pages (47%)” or “33% → 41%”)
- Timestamp (“6m ago”)
- Optional note block
- Quick actions: Edit / Delete

Placement:
- Dedicated “Activity” view OR prominent section on dashboard.
- Dashboard should show the most recent ~5 updates.

---

### C. Kanban (Pipeline) UX Upgrade

**Goal:** Drag-and-drop is confidence-inspiring and modern.

Required improvements:
- Drag handle or visible affordance on cards
- Ghost placeholder in target column
- Strong drop cues (column highlight + placeholder)
- Consistent animations (drag start, drop, reorder)
- Pointer/touch support for mobile

Do not regress:
- WIP limit behavior for “Reading” must remain.
- Optimistic state update is OK, but must rollback on API error.

Optional enhancements:
- Reordering within columns (if it fits scope)
- Keyboard accessibility (later)

---

## 4) Data Model & API Changes

### A. Introduce `progress_updates` (New Table)

Keep `reading_sessions` for legacy/analytics. Create a new table for state-first updates:

```
progress_updates
- id INTEGER PRIMARY KEY
- user_book_id INTEGER NOT NULL (FK -> user_books)
- input_mode TEXT CHECK(input_mode IN ('page','percent'))
- previous_page INTEGER
- current_page INTEGER
- previous_percent INTEGER
- current_percent INTEGER
- delta_pages INTEGER
- delta_percent INTEGER
- note TEXT
- source TEXT DEFAULT 'manual'
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

Indexes:
- idx_progress_updates_user_book_id
- idx_progress_updates_created_at

### B. API Endpoints (Backend)

1) `POST /api/books/:book_id/progress`
   - Body: { current_page?, progress_percent?, note?, mark_finished? }
   - Creates a progress_update and updates `user_books`.
   - Returns `{ update, book }`.

2) `GET /api/books/:book_id/progress`
   - Returns progress updates for a book (latest first).

3) `PATCH /api/books/:book_id/progress/:update_id`
   - Update note and/or current_page/percent, recalculates current book state.

4) `DELETE /api/books/:book_id/progress/:update_id`
   - Deletes the update and recalculates book state if needed.

5) `GET /api/activity`
   - Returns recent progress updates across books (join with library_view).
   - Params: `limit`, `offset`, `status`, `date_range` (optional).

### C. Update Logic (Rules)

When logging a progress update:
- Compute deltas and persist the update.
- Update `user_books.current_page`, `progress_percent`.
- Set `last_read_at = CURRENT_TIMESTAMP`.
- If progress hits 100% or `mark_finished`, set status to finished and set finished_reading_at.
- If status is not reading and progress update occurs, decide:
  - Option A: Auto-set status to `reading`.
  - Option B: Keep status and allow progress logs anyway.
  - Pick one and document it in code.

### D. Migration / Backfill

Optional (but recommended):
- Backfill progress_updates from reading_sessions by cumulative sum over time.
- If sessions don’t exist, leave feed empty.

---

## 5) Frontend Implementation (Concrete File-Level Plan)

### A. New Components

Create:
- `frontend/src/components/updates/bt-log-update.js`
  - Encapsulates log update form and logic.
- `frontend/src/components/updates/bt-activity-feed.js`
  - Renders recent updates list.
- `frontend/src/components/updates/bt-activity-item.js` (optional)

### B. Updated Components

1) `frontend/src/components/books/bt-book-detail.js`
   - Replace check-in modal with new log update component.
   - Keep reading history if desired, but label it as “Legacy Reading Sessions”.

2) `frontend/src/views/bt-dashboard-view.js`
   - Add “Log Update” card + embed activity feed section.

3) `frontend/src/views/bt-pipeline-view.js`
   - Apply new Kanban styles, drag affordances, drop placeholder.
   - Add pointer/touch handlers for drag.

4) `frontend/src/services/api-client.js`
   - Add new API methods: `logProgress`, `getActivity`, `getProgressUpdates`, `updateProgressUpdate`, `deleteProgressUpdate`.

5) `frontend/styles/tokens.css` (and/or base styles)
   - Align global tokens to the new palette and typography.

---

## 6) Backend Implementation Steps

1) Update `backend/schema.sql` with `progress_updates`.
2) Add migration script (e.g., `backend/migrate_progress_updates.py`).
3) Implement the new API endpoints in `backend/app.py`.
4) Ensure `library_view` includes updated current_page/progress_percent from user_books.
5) Validate progress update logic against edge cases:
   - No page_count
   - Audiobooks (percent only)
   - Progress regression (allow or block?)

---

## 7) Kanban UX Requirements (Detailed)

- Add drag handle to the pipeline card (right side “grip” icon).
- On drag, card becomes raised and moves with a placeholder in the column.
- Drop target column highlights strongly (border + background tone shift).
- Placeholder shows where card will land.
- Ensure drag works on touch devices (pointer events + manual drag positions).
- Maintain WIP constraint logic.

---

## 8) Implementation Phases (Execution Order)

1) **Theme + Tokens**
   - Update tokens, base styles, and common components.

2) **Data/API**
   - Add `progress_updates` table + endpoints.

3) **Core Logging UI**
   - Implement log update component + wire into dashboard + book detail.

4) **Activity Feed**
   - Implement feed view and dashboard feed section.

5) **Kanban UX**
   - Apply new visuals + drag improvements.

6) **QA + Polish**
   - Verify logging speed + correctness; drag reliability; layout responsiveness.

---

## 9) Definition of Done

- “Log Update” is obvious, accessible, and fast.
- Logging updates create feed items with optional notes.
- Activity feed is populated and editable.
- Kanban drag/drop is visually confident and works on desktop + touch.
- UI aligns with the approved professional concept.

