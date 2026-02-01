# Book Tracker

A personal book tracking application designed for intentional, focused reading.

## Theory of the App

### The Problem

Avid readers face a specific challenge: **book abandonment**. New reading ideas constantly arrive—from recommendations, references in other books, articles, podcasts—creating anxiety about forgetting them. This leads to immediately starting new books before finishing current ones, resulting in a graveyard of half-read books.

### The Solution

Book Tracker is a **trusted capture system** that eliminates idea anxiety. When you encounter a book idea, capture it immediately knowing it won't be lost. This frees you to stay focused on your current reads.

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
| `#dashboard` | `bt-dashboard-view` | Stats, currently reading, paths overview |
| `#pipeline` | `bt-pipeline-view` | Kanban board of all books by status |
| `#library` | `bt-library-view` | Searchable/filterable book list |
| `#paths` | `bt-paths-view` | Learning paths management |
| `#login` | `bt-login-view` | Authentication (if password set) |

---

## API Reference

### Endpoints

All endpoints prefixed with `/api`. Authentication via session cookie.

#### Dashboard & Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard` | GET | Currently reading, queued books, learning paths summary |
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

### Theme: Warm Library

The app uses a **Warm Library** theme — a refined light aesthetic inspired by classic libraries, aged parchment paper, and scholarly warmth. Serif typography (Crimson Pro) evokes traditional book design.

### CSS Custom Properties

All styling uses CSS custom properties defined in `styles/tokens.css`:

```css
/* Background colors - cream/parchment tones */
--color-bg-primary: #FAF7F2;      /* Cream parchment */
--color-bg-secondary: #F5F0E8;    /* Warm cream */
--color-bg-tertiary: #EDE6DB;     /* Slightly darker cream */
--color-surface: #FFFFFF;          /* White cards */

/* Text colors - brown/charcoal */
--color-text-primary: #2C2416;    /* Deep brown */
--color-text-secondary: #5C5244;  /* Medium brown */
--color-text-muted: #8B7E6A;      /* Light brown */

/* Accent - Sienna/Burgundy (classic library feel) */
--color-accent: #8B4513;          /* Sienna */
--color-accent-hover: #A0522D;    /* Lighter sienna */

/* Borders */
--color-border: #D4C9B8;          /* Warm tan */
--color-border-subtle: #E5DED2;   /* Light tan */

/* Status colors */
--color-reading: #8B4513;         /* Sienna */
--color-finished: #2E7D4A;        /* Forest green */
--color-queued: #2E7D4A;          /* Forest green */
--color-interested: #7B5C9E;      /* Dusty purple */

/* Shadows - Brown-tinted, soft */
--shadow-md: 0 4px 6px -1px rgba(44, 36, 22, 0.1),
             0 2px 4px -1px rgba(44, 36, 22, 0.06);

/* Spacing (4px base) */
--space-1: 4px;
--space-2: 8px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;

/* Typography */
--font-display: 'Crimson Pro', Georgia, serif;
--font-mono: 'IBM Plex Mono', monospace;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-xl: 1.375rem;
--text-3xl: 2.25rem;

/* Transitions */
--duration-fast: 150ms;
--duration-normal: 250ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

### Styling Patterns

1. **Always use CSS variables** — Never hardcode colors or spacing
2. **Component styles in Shadow DOM** — Styles in `styles()` are scoped
3. **Fallbacks for warm theme** — `var(--color-accent, #8B4513)`
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

## Current Project Status

Overhauling from proof-of-concept prototype to a quality, polished application. Focus areas:
- Dashboard redesign with stats and visualizations
- Enhanced pipeline/kanban interactions
- Learning paths improvements
- Mobile responsiveness
- Performance optimization
