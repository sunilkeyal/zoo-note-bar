# UI Redesign: Remove Tabs & Enhance Visual Design

## Overview

Redesign the notes app UI by removing the tab-based navigation and applying a cohesive visual refresh across all components. The new direction is "Modern & Structured" — inspired by Linear/Obsidian — with bolder use of color, subtle glassmorphism, cleaner spacing, and a focus on the writing experience.

## Scope

- Remove TabBar and tab navigation context
- Redesign sidebar with search and cleaner styling
- Slim frosted-glass header
- Top toolbar strip (always visible)
- Improved typography and reading layout
- Subtle animations and micro-interactions

## 1. Layout Architecture

**Before:**
- Header (48-64px) → TabBar → Editor (single note area)
- Sidebar at 260px
- Permanent tab bar with close buttons (browser-like tabs)

**After:**
```
┌─────────────────────────────────────┐
│  Header (40px, frosted glass)       │
├──────────┬──────────────────────────┤
│ Sidebar  │  Editor Area                │
│ 280px    │  [Toolbar Strip]            │
│          │  Title (22px bold)          │
│ Search   │  Timestamp                  │
│          │  Divider                    │
│ Note     │  Content (max 960px)        │
│ list     │  ┌─────────────────────┐    │
│          │  │                     │    │
│          │  │                     │    │
│          │  └─────────────────────┘    │
├──────────┴──────────────────────────┤
│                                     │
└─────────────────────────────────────┘
```

Key changes:
- **TabBar removed entirely** — single note displayed at a time
- **Clicking sidebar note** directly opens it in the editor (no tab concept)
- **Sidebar widened** from 260px to 280px
- **Editor area** has max-width of 960px, left-aligned

## 2. Sidebar

### Search
- Text input at top of sidebar with search icon
- Filters notes by title in real-time as user types
- When search is active, only matching notes shown

### Note Items
- Display: title (13px, 600 weight) only
- Active note: white background, blue left border (3px, #4f6ef7)
- Inactive: transparent background, transparent left border
- Hover state: subtle background shift
- Delete icon: visible on hover (opacity 0.4 → 1 on hover, existing behavior preserved)
- Delete confirmation dialog (existing component, unchanged)

### New Note Button
- Moved to bottom of scrollable sidebar list (user scrolls to see it; was a button at top of sidebar)
- Still triggers creation of "Untitled Note" and opens it

## 3. Header

- Reduced height: 40px (was ~48-64px via Toolbar)
- Frosted glass effect: `background: rgba(255,255,255,0.85); backdrop-filter: blur(10px)`
- Content: app icon + "Notes" title on left, theme toggle on right
- Dark mode adaptation: `rgba(..)` colors adjusted per theme
- No border shadow — only bottom border (1px solid divider)

## 4. Editor Toolbar

### Position
- Strip at top of editor, just below the title/divider (replaces the floating pill design)
- Always visible when a note is open

### Design
- Compact horizontal strip with dividers between groups
- Same formatting options: Bold, Italic, Underline, Bullet List, Numbered List, Heading selector, Font Size selector, Font Family selector

## 5. Typography & Reading

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (system-ui, no external fonts)
- **Body text:** 15px, line-height 1.7
- **Title:** 1.35rem, weight 700
- **Editor max-width:** 960px (left-aligned with 40px padding)
- **Editor padding:** 24px 40px
- **Timestamp:** 12px, secondary color, between title and content divider
- **Content divider:** 1px solid `#eee` (light) / appropriate dark value

## 6. Animations & Micro-interactions

All animations use CSS transitions only (no animation library):

| Element | Transition | Duration | Easing |
|---------|-----------|----------|--------|
| Sidebar note hover | background-color | 0.15s | ease |
| Active note border-left | opacity | 0.2s | ease |
| Note content open | opacity | 0.2s | ease |
| Delete icon opacity | opacity | 0.15s | ease |
| Theme toggle icon | transform (rotate) | 0.3s | ease |

## Dark Mode

- All frosted glass / rgba backgrounds adjust for dark palette
- Sidebar background: darker surface color
- Active note: darker highlight
- Accent color (#4f6ef7) adapts by adjusting contrast

## Files to Change

| File | Changes |
|------|---------|
| `src/components/TabBar.tsx` | **Remove** entire file |
| `src/components/MainArea.tsx` | Remove TabBar import and usage; remove tab context usage; update layout styles |
| `src/components/NotesSidebar.tsx` | Add search input, preview lines, timestamps; restyle items; move new note button; remove TabContext usage |
| `src/components/AppHeader.tsx` | Reduce height to 40px, add frosted glass effect |
| `src/components/NoteEditor.tsx` | Convert toolbar to top strip component |
| `src/contexts/TabContext.tsx` | **Remove** entire file — move `activeNoteId` state into `NoteContext` |
| `src/contexts/NoteContext.tsx` | Add `activeNoteId` state + `setActiveNoteId` + `activeNote` derived value |
| `src/pages/index.tsx` | Remove TabProvider wrapper, simplify to NoteProvider + ThemeProvider |
| `src/pages/_app.tsx` | Remove TabProvider import and wrapper |
| `src/styles/globals.css` | Add editor max-width, transition classes, tooltip styles |

## Out of Scope

- No changes to the backend API
- No changes to NoteContext (data layer)
- No changes to TipTap extensions or editor engine
- No new dependencies or packages
- No changes to dark mode mechanism (only visual adaptation)
