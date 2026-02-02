# Book Tracker Design System

> **Cornerstone Reference Document**
> This document defines the visual language, component patterns, and design principles for the Book Tracker application. All UI development should reference this document to ensure consistency.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Core Card Component](#core-card-component)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Shadows & Depth](#shadows--depth)
7. [Interactive States](#interactive-states)
8. [Component Patterns](#component-patterns)
9. [Implementation Reference](#implementation-reference)

---

## Design Philosophy

### Guiding Principles

1. **Warm Playback** — The UI treats reading like a journey with progress. Inspired by music players and fitness apps, we show where you are, where you're going, and celebrate momentum.

2. **Information Density with Clarity** — Cards display rich data (paths, stats, progress) without feeling cluttered. Strategic use of hierarchy, color, and spacing creates scannable interfaces.

3. **Editorial Warmth** — A refined, premium feel using warm paper tones, bronze accents, and serif typography. The aesthetic evokes a well-curated personal library.

4. **Consistent Patterns** — The card component is the cornerstone UI element. Its patterns (header with gradient, stats strip, playback bar, controls) should inform all other components.

5. **Motivational, Not Naggy** — Stats like streaks and pace encourage progress without guilt. Stale states use amber (attention) rather than red (alarm).

### Visual Personality

| Attribute | Expression |
|-----------|------------|
| **Tone** | Calm, focused, premium |
| **Mood** | Encouraging, warm, professional |
| **Metaphor** | A personal reading studio |
| **Inspiration** | Spotify (playback), Strava (stats), Apple Books (covers) |

---

## Core Card Component

The **Warm Playback Card** is the cornerstone component. Its design patterns should be applied consistently across the application.

### Anatomy

```
┌─────────────────────────────────────────┐
│  HEADER (gradient background)           │
│  ┌───────┐                              │
│  │ Cover │  Title                       │
│  │  56×80│  Author            67%       │
│  └───────┘                   Complete   │
├─────────────────────────────────────────┤
│  BODY (white background)                │
│                                         │
│  [Path Tag] [Path Tag]                  │
│                                         │
│  ┌─────────┬─────────┬─────────┐       │
│  │ Last    │ Est.    │ Started │ Stats │
│  │ Read    │ Left    │         │ Strip │
│  │  2d ago │  28d    │ Jan 5   │       │
│  └─────────┴─────────┴─────────┘       │
│                                         │
│  180 ════════════●══════════ 270       │
│        Playback Progress Bar            │
│                                         │
│     (-10) (-1)  [+]  (+1) (+10)        │
│           Increment Controls            │
└─────────────────────────────────────────┘
```

### Card Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 320px × 320px (fixed) |
| **Border Radius** | 18px (--radius-xl) |
| **Background** | #ffffff (body), gradient (header) |
| **Shadow** | --shadow-lg |
| **Cover Size** | 56px × 80px |

### Header

- **Height**: Auto (fits content, typically ~112px)
- **Background**: Linear gradient at 135° using accent color
- **Default gradient**: `linear-gradient(135deg, #8b5e34 0%, #a06840 100%)`
- **Padding**: 16px 20px
- **Content**: Cover image, title (2 lines max), author, percentage stat

### Stats Strip

The stats strip displays **three key metrics** in a horizontal row:

| Stat | Description | Format |
|------|-------------|--------|
| **Last Read** | Days since last progress update | "2d ago", "Today", "5d ago" |
| **Est. Left** | Estimated days to finish at current pace | "28d", "12d", "3d" |
| **Started** | Date reading began | "Jan 5", "Dec 12" |

**Stats Strip Specifications:**
- Background: White cells with subtle border separators
- Full bleed (extends to card edges with negative margin)
- Each cell: Equal width (1fr), centered text
- Value: Mono font, 0.9rem, semibold, accent color
- Label: 0.55rem, uppercase, muted color

### Learning Path Tags

- **Shape**: Pill (border-radius: 100px)
- **Padding**: 4px 10px
- **Font**: 0.7rem, medium weight
- **Structure**: Color dot (6px) + path name
- **Background**: Path color at 12-15% opacity
- **Text**: Path color at full saturation

Multiple paths display inline with 6px gap.

### Playback Progress Bar

- **Height**: 6px
- **Background**: --color-bg-secondary
- **Fill**: Gradient matching header
- **Border Radius**: 3px
- **Labels**: Page numbers in mono font (current / total)

### Increment Controls

Five circular buttons for precise page logging:

| Button | Action | Style |
|--------|--------|-------|
| -10 | Subtract 10 pages | Secondary (outlined) |
| -1 | Subtract 1 page | Secondary (outlined) |
| + | Open page input | Primary (filled, larger) |
| +1 | Add 1 page | Secondary (outlined) |
| +10 | Add 10 pages | Secondary (outlined) |

**Button Specifications:**
- Secondary: 36px, border: 1px solid --color-border, white bg
- Primary: 48px, --color-accent bg, white text
- Hover: Border/bg color shifts to accent

---

## Color System

### Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | #f7f4ef | Page background |
| `--color-bg-secondary` | #f1ede6 | Subtle sections, progress bar bg |
| `--color-bg-tertiary` | #fbfaf8 | Card sections, elevated areas |
| `--color-surface` | #ffffff | Card backgrounds |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | #2b2418 | Headings, titles |
| `--color-text-secondary` | #6b6051 | Body text |
| `--color-text-muted` | #8a7d6b | Labels, captions |
| `--color-text-inverse` | #ffffff | Text on dark/accent bg |

### Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | #8b5e34 | Primary accent (bronze) |
| `--color-accent-hover` | #9a6a3e | Hover states |
| `--color-accent-muted` | rgba(139, 94, 52, 0.15) | Backgrounds, badges |
| `--color-accent-alt` | #2f6f6d | Secondary accent (teal) |

### Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Active/Reading | #8b5e34 (bronze) | Default accent |
| On Track | #2f8f5b (green) | Healthy progress |
| Stale/Warning | #b07a2f (amber) | Needs attention |
| Error | #c7514d (red) | Critical issues |

### Header Gradient Variations

Cards can use different header gradients based on context:

```css
/* Default (bronze) */
background: linear-gradient(135deg, #8b5e34 0%, #a06840 100%);

/* Teal variant */
background: linear-gradient(135deg, #2f6f6d 0%, #3a8583 100%);

/* Amber/Warning variant */
background: linear-gradient(135deg, #b07a2f 0%, #c98f3a 100%);

/* Purple variant */
background: linear-gradient(135deg, #7b5c9e 0%, #8d6db0 100%);
```

---

## Typography

### Font Stack

| Role | Font | Fallback |
|------|------|----------|
| **Display** | Libre Baskerville | Georgia, serif |
| **Body** | IBM Plex Sans | system-ui, sans-serif |
| **Mono** | IBM Plex Mono | SF Mono, monospace |

### Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 0.75rem | Labels, captions |
| `--text-sm` | 0.875rem | Body small, UI text |
| `--text-base` | 1rem | Body text |
| `--text-lg` | 1.125rem | Emphasis |
| `--text-xl` | 1.375rem | Subheadings |
| `--text-2xl` | 1.75rem | Section headings |
| `--text-3xl` | 2.25rem | Page titles |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis |
| `--font-semibold` | 600 | UI labels, stats |
| `--font-bold` | 700 | Headings |

### Usage Guidelines

- **Titles**: Semibold (600), --text-sm to --text-base
- **Authors**: Normal (400), muted color
- **Stats Values**: Mono font, semibold, accent color
- **Stats Labels**: Uppercase, wide letter-spacing, muted

---

## Spacing & Layout

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 12px | Medium gaps |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Large spacing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Buttons, inputs, small elements |
| `--radius-md` | 10px | Covers, medium elements |
| `--radius-lg` | 14px | Cards (secondary) |
| `--radius-xl` | 18px | Cards (primary) |
| `--radius-full` | 9999px | Pills, circular buttons |

---

## Shadows & Depth

### Shadow Scale

```css
/* Subtle - inputs, small elements */
--shadow-sm: 0 1px 2px rgba(40, 32, 20, 0.04),
             0 2px 4px rgba(40, 32, 20, 0.06);

/* Medium - cards at rest */
--shadow-md: 0 8px 18px rgba(40, 32, 20, 0.08),
             0 2px 6px rgba(40, 32, 20, 0.06);

/* Large - cards, modals */
--shadow-lg: 0 12px 28px rgba(40, 32, 20, 0.1),
             0 6px 12px rgba(40, 32, 20, 0.06);

/* Extra large - elevated elements */
--shadow-xl: 0 18px 40px rgba(40, 32, 20, 0.12),
             0 10px 18px rgba(40, 32, 20, 0.08);
```

### Cover Shadows

Book covers use enhanced shadows for a "lifted" effect:

```css
box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
```

---

## Interactive States

### Hover States

- **Cards**: Subtle lift (translateY: -2px), shadow increase
- **Buttons**: Background/border color shift to accent
- **Links**: Color shift to accent

### Focus States

```css
--focus-ring: 0 0 0 2px var(--color-bg-primary),
              0 0 0 4px var(--color-accent);
```

### Transitions

| Token | Duration | Usage |
|-------|----------|-------|
| `--duration-fast` | 150ms | Hovers, color changes |
| `--duration-normal` | 250ms | Standard transitions |
| `--duration-slow` | 350ms | Complex animations |

**Easing**: `cubic-bezier(0, 0, 0.2, 1)` (ease-out) for most interactions

---

## Component Patterns

### Applying Card Patterns to Other Components

The card's design language should inform other components:

1. **Section Headers**: Use gradient backgrounds for emphasis
2. **Stats Displays**: Use the 3-column strip pattern
3. **Progress Indicators**: Use the playback bar style
4. **Action Buttons**: Use the circular increment button pattern
5. **Tags/Badges**: Use the pill style with color dots

### Modal Dialogs

- Use card-like structure with header gradient
- Apply same border radius and shadow patterns

### List Items

- Simplified card pattern (no gradient header)
- Inline stats instead of strip
- Hover states follow card pattern

### Navigation

- Use accent color for active states
- Follow typography hierarchy

---

## Implementation Reference

The complete implementation of the Warm Playback Card is available in:

**`frontend/design-system/card-reference.html`**

This standalone HTML file contains:
- Full CSS implementation with all tokens
- Multiple card state examples
- Interactive controls (non-functional, for reference)
- Copy-paste ready code

### Quick Reference: Card HTML Structure

```html
<div class="card-warm-playback">
    <div class="header">
        <div class="cover"></div>
        <div class="info">
            <div class="book-title">Book Title</div>
            <div class="book-author">Author Name</div>
        </div>
        <div class="header-stat">
            <div class="header-stat-value">67%</div>
            <div class="header-stat-label">Complete</div>
        </div>
    </div>
    <div class="body">
        <div class="path-tags">
            <span class="path-tag">
                <span class="dot"></span>
                Path Name
            </span>
        </div>
        <div class="stats-strip">
            <div class="strip-stat">
                <div class="strip-stat-value">2d ago</div>
                <div class="strip-stat-label">Last Read</div>
            </div>
            <div class="strip-stat">
                <div class="strip-stat-value">28d</div>
                <div class="strip-stat-label">Est. Left</div>
            </div>
            <div class="strip-stat">
                <div class="strip-stat-value">Jan 5</div>
                <div class="strip-stat-label">Started</div>
            </div>
        </div>
        <div class="playback-bar">
            <span class="time">180</span>
            <div class="bar">
                <div class="bar-fill" style="width: 67%"></div>
            </div>
            <span class="time end">270</span>
        </div>
        <div class="controls">
            <button class="ctrl-btn">-10</button>
            <button class="ctrl-btn">-1</button>
            <button class="ctrl-btn primary">+</button>
            <button class="ctrl-btn">+1</button>
            <button class="ctrl-btn">+10</button>
        </div>
    </div>
</div>
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-02-01 | Initial cornerstone design document |

---

*This document is the authoritative reference for Book Tracker's visual design. All components should align with these patterns.*
