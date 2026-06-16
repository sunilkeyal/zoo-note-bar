# Editor Typography Scale Reduction

## Overview

Reduce font sizes in the ProseMirror editor to create a more compact, readable experience. All other components (sidebar, login, buttons, cards, toolbar, etc.) remain unchanged.

## Changes

### ProseMirror Container (`src/app/globals.css`)

| Property | Before | After |
|----------|--------|-------|
| `font-size` | `16px` | `14px` |
| `line-height` | `1.8` | `1.6` |

### Headings

| Element | Before | After | Weight | Line Height |
|---------|--------|-------|--------|-------------|
| `h1` | `1.875rem` (~30px) | `20px` | `600` | `1.25` |
| `h2` | `1.5rem` (~24px) | `18px` | `600` | `1.25` |
| `h3` | `1.25rem` (~20px) | `16px` | `600` | `1.25` |

Remove `letter-spacing: -0.025em` from all headings.

### Paragraphs

| Property | Before | After |
|----------|--------|-------|
| `font-size` | `16px` (inherited) | `14px` (inherited) |
| `line-height` | `1.8` (inherited) | `1.6` (inherited) |

### Note Title (`src/components/MainArea.tsx`)

| Property | Before | After |
|----------|--------|-------|
| Font size | `1.875rem` / `text-3xl` (~30px) | `21px` |
| Font weight | `font-semibold` (600) | `font-semibold` (600) |
| Line height | `leading-tight` (1.25) | `leading-tight` (1.25) |
| Letter spacing | `tracking-tight` (-0.025em) | remove |

### Last Updated & Timestamp

Unchanged at 12px.

### Other Properties

- Margins, padding, and all other spacing preserved as-is (to be revisited separately).
- List styles (`ul`/`ol`/`li`) unchanged.
- Sidebar unaffected.
- Login page unaffected.
- All UI components (buttons, cards, dialogs, toolbar) unaffected.

## Files to Modify

1. `src/app/globals.css` — update ProseMirror rules (container font-size, line-height, h1/h2/h3 sizes, heading letter-spacing)
2. `src/components/MainArea.tsx` — update note title input classes

## Implementation Plan

1. Update `globals.css` ProseMirror styles
2. Update `MainArea.tsx` note title and toolbar font-size references
3. Verify build passes
