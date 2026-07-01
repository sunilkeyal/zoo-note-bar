# Recent Page — Design Spec

**Date:** 2026-06-30  
**Branch:** feature/recent-page  
**Status:** Approved

---

## Overview

Replace the "Coming soon" stub at `/recent` with a fully functional page that shows all of the authenticated user's notes sorted by last-edited date descending. The "View all" link on the home page's "Recent Notes" section already navigates to `/recent`, so no routing changes are needed.

---

## Layout — Magazine / Hero (4B)

### Page Header

- Violet clock icon in a rounded avatar + "Recent" heading (h1)
- Subtitle: "Your most recently edited notes"
- Filter input (desktop only, hidden on mobile) — filters the displayed list by note title

### Hero Card (most recently edited note)

- Larger featured card with a violet accent border (`border-violet-200 / dark:border-violet-800`) and a tinted background
- Shows: title (semibold, base size), 2-line content preview (plain text, HTML stripped)
- Bottom metadata row separated by a subtle divider:
  - Left: folder icon + folder name (omitted if note has no folder)
  - Right: relative timestamp (e.g. "5m ago", "2d ago")
- Clicking opens the note in the editor

### Grid (remaining notes)

- 2-column grid on `sm` and above; single column on mobile
- Each card contains:
  - Top row: file icon + title + relative timestamp (right-aligned)
  - Content preview line (truncated, plain text)
  - Bottom metadata row: folder icon + folder name / timestamp
    - Same footer-row pattern as the hero card (folder left, time right)
    - Folder omitted if note has no folder
- Clicking opens the note in the editor

### Empty State

- When no notes exist at all: "No notes yet. Create your first note to see it here."
- When a filter is active but matches nothing: "No notes match your search."
- Both are centered, muted text

---

## Data

- Source: `notes` and `folders` arrays from `NoteContext` (already fetched on mount)
- Sort: descending by `updatedAt`
- Folder names are derived at render time by building a `Map<folderId, name>` from the `folders` array — the regular notes API does **not** populate `note.folderName`
- No new API endpoints, database fields, or schema changes required
- Content previews strip HTML tags via a local `stripHtml` helper

---

## Interaction

| Action | Behaviour |
|--------|----------|
| Click hero card or grid card | `setActiveNoteId(note._id)` + `router.push("/")` — navigates to the home page where the editor renders; expands the note's folder in the sidebar if collapsed |
| Type in filter input | Client-side filter on `note.title` (case-insensitive); updates displayed list immediately |
| Loading state | Inherits the existing loading/error handling from `NoteContext` |
| Right-click any card | Context menu with: **Rename**, **Download PDF**, **Move to trash** |

---

## Context Menu Actions

All three actions are available on both the hero card and every grid card via right-click:

| Action | Behaviour |
|--------|----------|
| **Rename** | Opens a modal dialog pre-filled with the current title; saves via `updateNote`; Enter key confirms, Escape cancels |
| **Download PDF** | Calls `GET /api/notes/:id/export?format=pdf`, triggers a browser download |
| **Move to trash** | Opens `DeleteConfirmDialog`; on confirm calls `deleteNote(id)` |

---

## Components

| Component | Location | Notes |
|-----------|----------|-------|
| `RecentPage` | `src/app/recent/page.tsx` | Replaces current stub; self-contained client component |

No new shared components are needed. The page is small enough to keep self-contained.

---

## What Is Not In Scope

- Tracking when a note was *viewed* (as opposed to edited) — future work
- Pagination or infinite scroll — all notes are shown (consistent with other pages)
- Sorting controls — always sorted by `updatedAt` descending

---

## Testing

- Renders all notes sorted by `updatedAt` descending
- Hero card displays the most recently edited note
- Clicking a card calls `setActiveNoteId` with the correct id and navigates to `/`
- Note's folder is expanded in the sidebar if it was collapsed
- Filter input narrows the list (case-insensitive title match)
- No-match empty state renders when filter finds nothing
- No-notes empty state renders when `notes` is empty
- Loading and error states render correctly (error state has a Retry button)
- Folder names are resolved from the `folders` context array, not from `note.folderName`
