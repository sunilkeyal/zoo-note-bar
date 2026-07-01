# Home Page — Design Spec

**Date:** 2026-06-30
**Status:** Approved

---

## Overview

Replace the editor's empty state (currently "Select a note or create a new one") with a rich home page that shows a welcome message, a Create New Note button, recent notes, and favorite notes. The home page appears when no note is selected and is also shown when the user clicks "Home" in the sidebar.

Design chosen: **#9 Centered + Search (Stacked Mobile)** — centered welcome with a search bar, notes sections stacked vertically on mobile and side-by-side on desktop.

---

## Layout (Mobile)

```
┌──────────────────────┐
│                      │
│    [ZooNote Logo]    │
│                      │
│  Welcome Back, Sunil │
│                      │
│ Ready to capture your│
│      ideas?          │
│                      │
│ [Create New Note btn] │
│                      │
│ ┌─ Search notes ───┐ │
│ │ 🔍 Search...     │ │
│ └──────────────────┘ │
│                      │
│ 🕐 Recent Notes  View│
│ ┌── Note card ────┐  │
│ │ 📄 Meeting Notes │  │
│ │ 2h ago          │  │
│ └─────────────────┘  │
│ ┌── Note card ────┐  │
│ │ 📄 Project Ideas │  │
│ │ Yesterday       │  │
│ └─────────────────┘  │
│ ┌── Note card ────┐  │
│ │ 📄 Shopping List │  │
│ │ 2 days ago      │  │
│ └─────────────────┘  │
│                      │
│ ⭐ Favorite Notes View│
│ ┌── Note card ────┐  │
│ │ ⭐ Weekly Journal│  │
│ │ 1 week ago      │  │
│ └─────────────────┘  │
│ ┌── Note card ────┐  │
│ │ ⭐ API Design   │  │
│ │ 5 days ago      │  │
│ └─────────────────┘  │
│ ┌── Note card ────┐  │
│ │ ⭐ Personal Goals│  │
│ │ 2 weeks ago     │  │
│ └─────────────────┘  │
└──────────────────────┘
```

---

## Layout (Desktop)

```
┌──────────────────────────────────────────────┐
│ ┌────────────────────┐  ┌──────────────────┐ │
│ │                    │  │  [ZooNote Logo]  │ │
│ │  Welcome Back,     │  │                  │ │
│ │  Sunil             │  │ Ready to capture │ │
│ │                    │  │ your ideas?      │ │
│ │                    │  │                  │ │
│ │ [Create New Note]  │  │ [Create New Note]│ │
│ └────────────────────┘  └──────────────────┘ │
│                                              │
│        ┌── Search notes ───────────┐         │
│        │ 🔍 Search your notes...   │         │
│        └───────────────────────────┘         │
│                                              │
│ 🕐 Recent Notes    View all  ⭐ Favorites View│
│ ┌── Note card ──┐  ┌── Note card ──┐         │
│ │ 📄 Meeting... │  │ ⭐ Weekly... │         │
│ │ 2h ago       │  │ 1 week ago   │         │
│ └───────────────┘  └──────────────┘         │
│ ┌── Note card ──┐  ┌── Note card ──┐         │
│ │ 📄 Project... │  │ ⭐ API Design│         │
│ │ Yesterday    │  │ 5 days ago   │         │
│ └───────────────┘  └──────────────┘         │
│ ┌── Note card ──┐  ┌── Note card ──┐         │
│ │ 📄 Shopping..│  │ ⭐ Personal..│         │
│ │ 2 days ago   │  │ 2 weeks ago  │         │
│ └───────────────┘  └──────────────┘         │
│ ...more...         ...more...                │
└──────────────────────────────────────────────┘
```

---

## Behaviors

### State: No note selected (default)
- Home page renders in the main content area (replaces current "Select a note or create a new one" text)
- Shows welcome hero, search bar, recent notes, and favorite notes

### State: Note selected
- Home page hides, note editor renders as today
- Clicking the "Home" sidebar link with a note selected deselects the note and shows the home page

### Create New Note button
- Calls `createNote()` from NoteContext with default title
- Sets the new note as `activeNoteId`, which hides the home page and shows the editor
- Equivalent to clicking "New Note" in the sidebar

### Search bar
- Filters notes across Recent and Favorites sections
- As the user types, both sections filter to matching notes
- Clears the filter when search is empty

### Note cards (Recent & Favorites)
- Each card shows: icon (FileText for recent, Star for favorites), title, preview snippet, timestamp
- Clicking a note card sets it as `activeNoteId`, hiding the home page and opening the editor
- "View all" link navigates to `/recent` or `/favorites` routes respectively

### Scrolling
- Notes sections show the most recent notes first
- Maximum shown: Recent (5+), Favorites (4+)
- If more notes exist, the "View all" link provides access to the full list

---

## Components

All new code goes into a single new file:

### `HomePage.tsx` (new component)
- **Location:** `src/components/HomePage.tsx`
- **Renders:** Full home page with hero, search, recent/favorites sections
- **Consumes:** `useNotes()` from NoteContext for notes list, folders (for folder context), and CRUD operations
- **Note icon:** FileText icon for recent, Star icon for favorites
- **States:** loading (skeleton placeholders), empty (no recent/favorites messages), error (error state)

### `page.tsx` changes
- Replace the "no activeNote" empty state in `MainArea.tsx` with `<HomePage />`
- Actually, since the home page replaces MainArea, modify `page.tsx` to render `<HomePage />` when no active note is present, and `<MainArea />` when a note is active

### NoteContext integration
- No new context methods needed — existing `notes`, `activeNoteId`, `setActiveNoteId`, `createNote` suffice

---

## Responsive Breakpoints

| Breakpoint | Sections Layout | Search Bar | Notes Shown |
|-----------|----------------|------------|-------------|
| < 768px (mobile) | Stacked vertically | Full width | 3 per section |
| >= 768px (tablet) | Side by side 2-col | Narrow (max-w-md), centered | 4-5 per section with grid |

---

## Edge Cases

### No notes exist
- Recent section shows: "No recent notes yet. Create your first note above!"
- Favorites section shows: "No favorite notes yet. Star a note to see it here."
- Both messages include an inline link/button to create a new note

### Loading state
- Skeleton placeholders for note cards while notes are fetching
- Title skeleton, preview skeleton, timestamp skeleton per card

### Error state
- If notes fail to load, show: "Could not load your notes. [Retry]"
- Retry button calls `fetchNotes()` from context

### Very long note lists
- Cap visible notes: Recent shows 5 on desktop / 3 on mobile, Favorites shows 4 / 3
- "View all" link navigates to dedicated `/recent` or `/favorites` pages
- These pages already have placeholder routes — they will be enhanced separately

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/HomePage.tsx` | **New** — home page component |
| `src/components/MainArea.tsx` | Replace no-activeNote empty state with HomePage render or remove empty state from MainArea |
| `src/app/page.tsx` | Conditional render: HomePage when no activeNote, MainArea when note selected |

No schema changes, no API changes, no new dependencies.
