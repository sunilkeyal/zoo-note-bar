# Recent Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Coming soon" stub at `/recent` with a Magazine/Hero layout showing all notes sorted by last-edited date, with a hero card for the most recent note and a 2-column grid for the rest.

**Architecture:** Single self-contained client component in `src/app/recent/page.tsx`. Reads `notes` and context helpers directly from `NoteContext` — no new API endpoints or schema changes. Content previews strip HTML client-side.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, lucide-react, Vitest + React Testing Library

## Global Constraints

- Branch: `feature/recent-page` — do NOT commit to `main`
- Test runner: `npx vitest run` (jsdom environment, setup file `src/__tests__/setup.ts`)
- All tests live in `src/__tests__/`
- Path alias `@/` resolves to `src/`
- Do not add new dependencies
- Do not modify `NoteContext`, the layout file, or any shared component

---

### Task 1: Implement the Recent page

**Files:**
- Modify: `src/app/recent/page.tsx` (replace stub entirely)
- Create: `src/__tests__/recent-page.test.tsx`

**Interfaces:**
- Consumes: `useNotes()` from `@/contexts/NoteContext` — fields used: `notes: Note[]`, `folders: Folder[]`, `loading: boolean`, `error: string | null`, `setActiveNoteId: (id: string | null) => void`, `expandedFolders: Set<string>`, `toggleFolder: (id: string) => void`, `fetchNotes: () => Promise<void>`, `updateNote: (id, update) => Promise<Note | null>`, `deleteNote: (id) => Promise<boolean>`
- Consumes: `Note` type from `@/types` — fields used: `_id`, `title`, `content`, `folderId`, `updatedAt` (note: `folderName` is NOT used — folder names are derived from the `folders` array)
- Produces: nothing consumed by other tasks

**Design — component structure**

The page is one component with five logical sections:

1. **Header** — violet clock avatar, "Recent" h1, subtitle, filter `<Input>` (hidden on mobile via `sm:block`)
2. **Hero card** — most recently edited note (`filteredNotes[0]`), wrapped in `<ContextMenu>`, violet accent border, title, 2-line stripped-content preview, `<NoteFooter>` with folder + timestamp
3. **Grid** — `filteredNotes.slice(1)`, `grid-cols-1 sm:grid-cols-2`, each card wrapped in `<ContextMenu>`, same footer pattern
4. **Rename dialog** — `<Dialog>` with an `<Input>` pre-filled with the current title; saves via `updateNote`
5. **Delete dialog** — `<DeleteConfirmDialog>` confirmation before calling `deleteNote`

**Folder name resolution:** build a `useMemo` map — `new Map(folders.map(f => [f._id, f.name]))` — and look up `note.folderId` at render time. The regular notes API does not populate `note.folderName`.

**Context menu items (same on hero and grid cards):**
- **Rename** — opens rename dialog pre-filled with current title
- **Download PDF** — `GET /api/notes/:id/export?format=pdf`, browser download
- **Move to trash** — opens `DeleteConfirmDialog`, on confirm calls `deleteNote`

**Helper functions (defined inside the file):**

```ts
function stripHtml(html: string): string
// Strips all HTML tags. Returns plain text. Returns "" for falsy input.

function formatRelativeTime(dateStr: string): string
// "just now" < 1min, "Xm ago" < 1hr, "Xh ago" < 24hr,
// "Xd ago" < 14 days, "Xw ago" < 8 weeks, else toLocaleDateString()
```

**Filter behaviour:** `useState<string>("")` for the filter query. `sortedNotes` is all notes sorted `updatedAt` desc. `filteredNotes` is `sortedNotes` filtered by `note.title.toLowerCase().includes(query.toLowerCase())` when query is non-empty. Hero is `filteredNotes[0]`, grid is `filteredNotes.slice(1)`.

**Note click handler:**
```ts
function handleNoteClick(id: string) {
  const note = notes.find(n => n._id === id)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(id)
  router.push("/")  // editor only renders on /
}
```

**Empty state** (when `filteredNotes.length === 0`):
- If `notes.length === 0`: "No notes yet. Create your first note to see it here."
- If filter is active but no matches: "No notes match your search."

**Loading / error states:** mirror the pattern in `HomePage.tsx` — show a centered `<p>` for loading, and a centered error message + "Retry" button that calls `fetchNotes()` for errors.

- [x] **Step 1: Write the failing tests** ✓
- [x] **Step 2: Run tests to confirm they fail** ✓
- [x] **Step 3: Implement `src/app/recent/page.tsx`** ✓ — see file for final implementation including context menus, rename dialog, and delete dialog added in subsequent commits
- [x] **Step 4: Run tests to confirm they pass** ✓ — 12/12
- [x] **Step 5: Run the full test suite to check for regressions** ✓ — 1 pre-existing failure in `note-context.test.tsx` unrelated to this work
- [x] **Step 6: Smoke-test in the browser** ✓
- [x] **Step 7: Commit** ✓
- [x] **Step 8: Push the feature branch** ✓

## Post-Implementation Additions

The following were added after the initial implementation via follow-up commits:

| Commit | Change |
|--------|--------|
| `fix: navigate to / when clicking a note` | Added `router.push("/")` to `handleNoteClick` — editor only renders on `/` |
| `fix: derive folder names from folders context` | `note.folderName` is never set by the notes API; use `folders` from context + a `folderMap` instead |
| `feat: add right-click context menu` | Rename (dialog), Download PDF, Move to trash on all cards |
| `fix: remove asChild from ContextMenuTrigger` | `asChild` not supported in Radix v2; removed from `ContextMenuTrigger` |

> See `src/app/recent/page.tsx` for the complete final implementation.


