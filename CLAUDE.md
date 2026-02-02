# Book Tracker

A personal book tracking application designed for intentional, focused reading.

## Current Project Status

Overhauling from proof-of-concept functioning prototype to a quality, modern, polished application.

## Cornerstone Design References

> **IMPORTANT**: All UI development must reference these authoritative design documents:

| Document | Location | Purpose |
|----------|----------|---------|
| **Design System Spec** | [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Complete design language, tokens, patterns |
| **Card Reference** | [`frontend/design-system/card-reference.html`](frontend/design-system/card-reference.html) | Interactive implementation with copy-paste code |

### The Warm Playback Card

The **Warm Playback Card** (320x320px) is the cornerstone UI component. Its design patterns should inform all other components:

- Gradient headers for emphasis
- Stats strip pattern (3-column horizontal)
- Playback-style progress bars
- Circular increment button controls
- Learning path pills with color dots

When building or modifying components, ensure visual consistency with the card's established patterns.

## Theory of the App

### The Problem

Avid readers face a specific challenge: **book abandonment**. New reading ideas constantly arrive—from recommendations, references in other books, articles, podcasts—creating anxiety about forgetting them. This leads to immediately starting new books before finishing current ones, resulting in a graveyard of half-read books.

### The Solution

Book Tracker is a **trusted capture system** that eliminates idea anxiety. When you encounter a book idea, capture it immediately knowing it won't be lost. This frees you to stay focused on your current reads.

**Homepage Insight (Aha)**
- The homepage is a *Now Reading Shelf*, not a management dashboard.
- It exists to remind, encourage, and enable quick progress updates on books in progress.
- It should feel calm and neutral (no nagging), with fast inline updates.
- Objectives (learning paths) are also “in progress” and belong here as progress cards, not a separate management task.

The app enforces **intentional friction** through:
- **WIP limits** — Configurable limit on concurrent "reading" books (default: 5)
- **Status pipeline** — Books flow through: `interested → owned → queued → reading → finished`
- **Queue prioritization** — Explicitly decide what's next rather than impulse-starting
- **Learning paths** — Group books by goal/topic to maintain focus on intentional development

### User Model

The target user is a **power reader** who:
- Reads ~1 hour daily and wants that time spent purposefully
- Likes tracking data and seeing progress metrics
- Values efficiency and keyboard-friendly workflows
- Wants reading connected to personal development goals, not just consumption

### Design Philosophy

- **Professional and refined** — Luxury feel, not utilitarian prototype
- **Intentionality over decoration** — Every visual choice serves a purpose
- **Restraint** — Fewer, better elements; no feature sprawl
- **No framework complexity** — Polish comes from design discipline, not heavy tooling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Views     │  │ Components  │  │   Core      │         │
│  │ (pages)     │  │ (reusable)  │  │ (framework) │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    BaseComponent                            │
│                    (Shadow DOM)                             │
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│      Router           Store           Events                │
│   (hash-based)    (reactive)      (pub/sub)                │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    API Client                               │
│                   (with cache)                              │
└──────────────────────────┼──────────────────────────────────┘
                           │
                      HTTP/REST
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      Backend                                 │
│                          │                                  │
│                    Flask API                                │
│                          │                                  │
│                    SQLite DB                                │
│              (via library_view)                             │
└─────────────────────────────────────────────────────────────┘
```

**Key principle**: The frontend uses vanilla Web Components with Shadow DOM encapsulation. No React, no Vue, no build step. Just ES modules served directly.

---

## Component System

### BaseComponent API

All components extend `BaseComponent` which provides:

```javascript
import { BaseComponent, defineComponent } from '../core/base-component.js';

class MyComponent extends BaseComponent {
    constructor() {
        super();
        this.setState({ count: 0 });  // Initialize state
    }

    // Define scoped CSS (Shadow DOM isolated)
    styles() {
        return `
            :host { display: block; }
            .counter { color: var(--color-accent); }
        `;
    }

    // Define HTML template (re-renders on state change)
    template() {
        return `
            <div class="counter">${this.state.count}</div>
            <button ref="incrementBtn">+1</button>
        `;
    }

    // Called after each render - set up event listeners here
    afterRender() {
        this.ref('incrementBtn').addEventListener('click', () => {
            this.setState({ count: this.state.count + 1 });
        });
    }

    // Called when component mounts to DOM
    async onConnect() {
        await this.loadData();
    }

    // Called when component unmounts
    onDisconnect() {
        // Cleanup subscriptions
    }
}

defineComponent('my-component', MyComponent);
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `this.setState(obj)` | Merge state and trigger re-render |
| `this.state` | Current state object |
| `this.ref(name)` | Get element with `ref="name"` attribute |
| `this.$(selector)` | querySelector in shadow DOM |
| `this.$$(selector)` | querySelectorAll in shadow DOM |
| `this.emit(name, detail)` | Dispatch bubbling custom event |
| `this.escapeHtml(str)` | Sanitize user content for XSS prevention |

### Lifecycle Hooks

| Hook | When Called |
|------|-------------|
| `onConnect()` | Component added to DOM (fetch data here) |
| `onDisconnect()` | Component removed from DOM (cleanup here) |
| `afterRender()` | After each render (attach listeners here) |
| `onStateChange(old, new)` | State changed (rarely needed) |
| `onAttributeChange(name, old, new)` | Observed attribute changed |

### Component Naming

- **Views**: `bt-{name}-view` (e.g., `bt-dashboard-view`, `bt-library-view`)
- **Shared components**: `bt-{name}` (e.g., `bt-book-card`, `bt-modal`)
- **Layout components**: `bt-{name}` (e.g., `bt-app-shell`, `bt-nav`)

---

## State Management

### Store

Centralized reactive store with subscription support:

```javascript
import { store } from '../core/store.js';

// Get value
const books = store.get('books');
const page = store.get('pagination.page');  // Dot notation supported

// Set value (notifies subscribers)
store.set('selectedBook', book);
store.set('filters.status', 'reading');

// Update multiple values
store.update({
    'filters.status': 'reading',
    'pagination.page': 1
});

// Subscribe to changes
const unsubscribe = store.subscribe('books', (newValue, oldValue) => {
    console.log('Books changed:', newValue);
});
```

### Store Shape

```javascript
{
    // Auth
    authenticated: false,
    passwordRequired: true,

    // Routing
    currentRoute: 'dashboard',
    routeParams: {},

    // Data (cached from API)
    books: [],
    dashboard: null,
    pipeline: null,
    paths: [],
    stats: null,
    settings: { wip_limit: 5 },

    // Pagination
    pagination: { page: 1, perPage: 50, total: 0, pages: 1 },

    // Filters
    filters: { status: '', search: '', sort: 'date_added', order: 'desc' },

    // UI state
    selectedBook: null,
    selectedPath: null,
    modalOpen: false,
    isOnline: true
}
```

### Events

Global pub/sub for cross-component communication:

```javascript
import { events, EVENT_NAMES } from '../core/events.js';

// Subscribe
const unsubscribe = events.on(EVENT_NAMES.BOOK_UPDATED, (book) => {
    console.log('Book updated:', book);
});

// Emit
events.emit(EVENT_NAMES.TOAST_SHOW, { message: 'Book saved!', type: 'success' });

// Common events
EVENT_NAMES.BOOK_CREATED    // New book added
EVENT_NAMES.BOOK_UPDATED    // Book modified
EVENT_NAMES.ROUTE_CHANGE    // Navigation occurred
EVENT_NAMES.TOAST_SHOW      // Show notification
EVENT_NAMES.MODAL_OPEN      // Open modal
EVENT_NAMES.MODAL_CLOSE     // Close modal
```

---

## Routing

Hash-based routing with query parameter support:

```javascript
import { router } from '../core/router.js';

// Navigate
router.navigate('library');
router.navigate('library', { status: 'reading', page: 2 });

// Get current route
const { name, params, config } = router.getCurrentRoute();

// Update params without full navigation
router.updateParams({ page: 3 });

// Get specific param
const status = router.getParam('status', 'all');
```

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `#dashboard` | `bt-dashboard-view` | Now Reading Shelf (in‑progress books + objective progress) |
| `#pipeline` | `bt-pipeline-view` | Kanban board of all books by status |
| `#library` | `bt-library-view` | Searchable/filterable book list |
| `#paths` | `bt-paths-view` | Objectives (learning paths) management |
| `#login` | `bt-login-view` | Authentication (if password set) |

---

## API Reference

### Endpoints

All endpoints prefixed with `/api`. Authentication via session cookie.

#### Dashboard & Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/home` | GET | Home shelf data (currently reading + objectives summary) |
| `/dashboard` | GET | Legacy dashboard data |
| `/stats` | GET | Aggregate statistics (totals, by year, top authors) |
| `/pipeline` | GET | All books grouped by status |

#### Books

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/books` | GET | Paginated book list with filters |
| `/books` | POST | Create new book |
| `/books/:id` | GET | Single book with full details |
| `/books/:id` | PATCH | Update book (status, progress, rating) |
| `/books/:id/enrich` | POST | Fetch metadata from Open Library |

#### Learning Paths

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/paths` | GET | All paths with book counts |
| `/paths` | POST | Create path |
| `/paths/:id` | GET | Path with books |
| `/paths/:id` | PATCH | Update path |
| `/paths/:id` | DELETE | Delete path |
| `/paths/:id/books` | POST | Add book to path |
| `/paths/:id/books/:bookId` | DELETE | Remove book from path |

### Data Shapes

#### Book (from library_view)

```javascript
{
    book_id: 123,
    user_book_id: 456,
    title: "The Design of Everyday Things",
    author: "Don Norman",
    status: "reading",           // interested|owned|queued|reading|finished|abandoned
    progress_percent: 45,
    current_page: 150,
    page_count: 368,
    my_rating: 4,                // 0-5, null if unrated
    priority: 2,                 // Queue ordering (higher = more important)
    last_read_at: "2024-01-15",
    started_reading_at: "2024-01-01",
    finished_reading_at: null,
    cover_image_url: "https://...",
    why_reading: "Recommended by colleague for UX work",
    owns_kindle: true,
    owns_audible: false,
    owns_hardcopy: true,
    idea_source: "Podcast: Design Matters",
    paths: [{ id: 1, name: "UX Fundamentals", color: "#58a6ff" }]
}
```

#### Stats

```javascript
{
    total_books: 569,
    by_status: { interested: 256, owned: 45, queued: 12, reading: 5, finished: 248, abandoned: 3 },
    books_by_year: { "2024": 12, "2023": 45, "2022": 52 },
    avg_days_to_read: 34.5,
    total_pages_read: 45230,
    top_authors: [{ author: "Brandon Sanderson", count: 8 }, ...],
    top_tags: [{ tag: "fiction", count: 120 }, ...]
}
```

#### Learning Path

```javascript
{
    id: 1,
    name: "System Design",
    description: "Foundational books for distributed systems",
    objective: "Prepare for staff engineer interviews",
    color: "#58a6ff",
    total_books: 5,
    completed_books: 2,
    next_book: "Designing Data-Intensive Applications",
    books: [/* array of book objects with position */]
}
```

---

## Database Schema

### Core Tables

- **books** — Immutable reference data (title, author, ISBN, page count)
- **user_books** — User's relationship with books (status, progress, rating, ownership)
- **learning_paths** — Named reading lists with objectives
- **learning_path_books** — Many-to-many with position ordering
- **notes** — Markdown notes attached to books
- **tags** — User-defined labels
- **user_settings** — Key-value config store

### Status Pipeline

```
interested → owned → queued → reading → finished
                                    ↘ abandoned
```

- **interested**: Want to read someday
- **owned**: Have acquired but not committed to reading
- **queued**: Committed to read, prioritized
- **reading**: Currently in progress (WIP limit applies)
- **finished**: Completed
- **abandoned**: DNF (Did Not Finish)

### Key View

`library_view` joins books + user_books for easy querying. All API responses use this view.

---

## Design System

> **Full specification**: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
> **Interactive reference**: [`frontend/design-system/card-reference.html`](frontend/design-system/card-reference.html)

### Theme: Warm Playback

The app uses a **Warm Playback** design language — a refined editorial aesthetic with bronze accents, warm paper tones, and reading-as-journey metaphors inspired by Spotify, Strava, and Apple Books.

### Key Design Tokens

```css
/* Core Colors */
--color-bg-primary: #f7f4ef;       /* Warm paper */
--color-surface: #ffffff;           /* Card backgrounds */
--color-text-primary: #2b2418;     /* Dark brown ink */
--color-accent: #8b5e34;           /* Bronze (primary) */
--color-accent-alt: #2f6f6d;       /* Teal (secondary) */
--color-warning: #b07a2f;          /* Amber (stale states) */

/* Typography */
--font-display: 'Libre Baskerville', Georgia, serif;
--font-body: 'IBM Plex Sans', system-ui, sans-serif;
--font-mono: 'IBM Plex Mono', monospace;

/* Card Dimensions */
Card size: 320px × 320px (fixed)
Border radius: 18px (--radius-xl)
```

### Styling Patterns

1. **Always use CSS variables** — Never hardcode colors or spacing
2. **Component styles in Shadow DOM** — Styles in `styles()` are scoped
3. **Follow card patterns** — Headers use gradients, stats use strips, progress uses playback bars
4. **Responsive with media queries** — Mobile-first, breakpoints at 600px, 900px, 1200px
5. **Soft shadows** — Use brown-tinted rgba shadows for warm aesthetic

---

## Local Development

### Prerequisites

- Python 3.x (Flask installed automatically)

### Running Locally

```bash
./dev.sh
```

This will:
1. Create Python virtual environment (if needed)
2. Install dependencies
3. Start Flask dev server

Access at:
- **Frontend**: http://localhost:5001
- **API**: http://localhost:5001/api

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `APP_PASSWORD` | Require auth if set | None (open access) |
| `SECRET_KEY` | Flask session secret | Dev key |
| `RAILWAY_VOLUME_MOUNT_PATH` | Production DB path | Local `backend/books.db` |

---

## Git Workflow

### Branching Strategy

```
main (production)
  │
  └── dev (integration branch)
        │
        ├── feature/dashboard-redesign
        ├── feature/mobile-nav
        └── fix/api-caching
```

- **main** — Production-ready code. Only updated via pull requests from `dev`.
- **dev** — Active development branch. All new work starts here.
- **feature/\*** or **fix/\*** — Short-lived branches for individual features or fixes.

### Development Rules

1. **All new development happens on the `dev` branch** — Never commit directly to `main`.
2. **Create feature branches from `dev`** — For non-trivial work, branch off `dev` (e.g., `git checkout -b feature/my-feature dev`).
3. **Merge back to `dev` when complete** — Once a feature is done and tested, merge it into `dev` and delete the feature branch.
4. **Claude Code can commit and push directly to `dev`** — No PR required for `dev` branch updates.
5. **Use pull requests to update `main`** — When `dev` is stable and ready for release, create a PR from `dev` to `main`.

### Typical Workflow

```bash
# Start new feature
git checkout dev
git pull origin dev
git checkout -b feature/my-feature

# Work on feature...
git add .
git commit -m "Add my feature"

# Merge back to dev
git checkout dev
git merge feature/my-feature
git push origin dev

# Cleanup
git branch -d feature/my-feature
```

---

## File Structure

```
book-tracker/
├── backend/
│   ├── app.py              # Flask API (all routes)
│   ├── schema.sql          # Database schema
│   ├── requirements.txt    # Python dependencies
│   └── books.db            # SQLite database
├── frontend/
│   ├── index.html          # Entry point
│   ├── src/
│   │   ├── core/           # Framework code
│   │   │   ├── base-component.js   # Component base class
│   │   │   ├── store.js            # Reactive state
│   │   │   ├── events.js           # Pub/sub bus
│   │   │   └── router.js           # Hash router
│   │   ├── components/
│   │   │   ├── shared/     # Reusable (bt-modal, bt-book-card, etc.)
│   │   │   ├── layout/     # App shell, nav, fab
│   │   │   └── books/      # Book-specific (detail, form)
│   │   ├── views/          # Page components (bt-*-view)
│   │   └── services/
│   │       ├── api-client.js       # HTTP client with caching
│   │       └── cache-manager.js    # IndexedDB cache
│   └── styles/
│       ├── tokens.css      # Design system variables
│       ├── base.css        # Reset and base styles
│       ├── components.css  # Global component styles
│       └── animations.css  # Keyframe animations
├── dev.sh                  # Development server script
└── CLAUDE.md               # This file
```

---

## Common Patterns

### Fetching Data in Components

```javascript
async onConnect() {
    await this._loadData();

    // Subscribe to refresh on external updates
    this._unsubscribe = events.on(EVENT_NAMES.BOOK_UPDATED, () => {
        this._loadData();
    });
}

onDisconnect() {
    if (this._unsubscribe) this._unsubscribe();
}

async _loadData() {
    this.setState({ loading: true, error: null });
    try {
        const data = await api.getDashboard();
        this.setState({ loading: false, data });
    } catch (error) {
        this.setState({ loading: false, error: error.message });
    }
}
```

### Emitting Events to Parent

```javascript
// In child component
this.emit('book-click', { book: this.book });

// In parent template
<bt-book-card data-book-id="${book.id}"></bt-book-card>

// In parent afterRender()
this.$$('bt-book-card').forEach(card => {
    card.addEventListener('book-click', (e) => {
        this.handleBookClick(e.detail.book);
    });
});
```

### Setting Data on Child Components

```javascript
// After render, set complex data via property (not attribute)
afterRender() {
    const card = this.$('bt-book-card');
    card.book = this.state.book;  // Pass object directly
}
```

### Parallel API Calls

```javascript
const [dashboard, stats] = await Promise.all([
    api.getDashboard(),
    api.getStats()
]);
```

---

