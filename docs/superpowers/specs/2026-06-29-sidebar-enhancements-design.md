# Sidebar Enhancements — Design Spec

**Date:** 2026-06-29
**Status:** Approved

---

## Overview

Seven targeted improvements to the notes sidebar: five bug fixes, one UX removal, and one behavioral enhancement. All changes are confined to three existing files — `NotesSidebar.tsx`, `MainArea.tsx`, and `NoteContext.tsx`. No new files or components are created.

Item 5 (folder icon map expansion) is already shipped.

---

## 1. DND Overrides Text Selection in Rename Input

**Problem:** Double-clicking a note or folder enters inline-rename mode. When the user then tries to select text by click-dragging the mouse, dnd-kit's `PointerSensor` intercepts the `pointerdown` event and starts a drag instead of a text selection. Keyboard selection (Shift+Arrow) works correctly.

**Fix:** Add `onPointerDown={(e) => e.stopPropagation()}` to every rename `<Input>` element in `NotesSidebar.tsx`. This stops the pointer event from reaching the DND sensor so the browser handles text selection normally. Three `<Input>` elements are affected: one in `renderNoteItem` (root items), one in `renderNoteItem` (sub-items share the same render), and one in `renderFolder`.

---

## 2. Stale Note Title in Detail Area After Sidebar Rename

**Problem:** After renaming a note from the sidebar, the title shown in `MainArea.tsx` does not update until the user navigates away and back. The sync `useEffect` in `MainArea.tsx` only re-runs when `activeNote?._id` changes, not when `activeNote?.title` changes.

**Fix:** Add `activeNote?.title` to the `useEffect` dependency array:

```ts
// Before
useEffect(() => {
  if (activeNote) setTitle(activeNote.title)
}, [activeNote?._id])

// After
useEffect(() => {
  if (activeNote) setTitle(activeNote.title)
}, [activeNote?._id, activeNote?.title])
```

No loop risk: `MainArea` holds its own local `title` state for typing. When the user is typing in the editor, the debounced `updateNote` call updates `activeNote.title` in context to the same value the user just typed — the effect re-runs but sets the same string.

---

## 3. Context-Menu Rename Does Not Work

**Problem:** Right-clicking a note and selecting "Rename" does nothing. The handler wraps `startRenaming` in `setTimeout(..., 0)`, which introduces a race with Radix UI's post-menu focus-return animation. By the time the callback fires, a focus event may have triggered a re-render that clears the rename state before it renders.

**Fix:** Remove `setTimeout` and call `startRenaming` directly:

```ts
// Before
const handleRenameFromContextMenu = (id: string, name: string) => {
  setTimeout(() => startRenaming(id, name), 0)
}

// After
const handleRenameFromContextMenu = (id: string, name: string) => {
  startRenaming(id, name)
}
```

Radix ContextMenu does not re-fire the trigger's `onClick` after a menu item is selected, so no guard is needed.

---

## 4. Remove Markdown Download, Simplify to PDF Only

**Problem:** The note context menu has a "Download" sub-menu with two options: Markdown and PDF. A sub-menu with a single item after removing Markdown is poor UX.

**Fix:** Remove the `ContextMenuSub` / `ContextMenuSubTrigger` / `ContextMenuSubContent` structure entirely and replace it with a single flat `ContextMenuItem` that downloads PDF directly:

```tsx
<ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "pdf") }}>
  <File /> Download PDF
</ContextMenuItem>
```

The `handleExportNote` function and the Markdown export API route are left in place (the API may be used elsewhere or in future).

---

## 5. Folder Icon Map Expansion

Already shipped. Keywords added: `auto/car/vehicle/garage → Car`, `learning/reading/books/… → BookOpen`, `information/info/… → Info`, `meetings/meeting/… → Users`. Health/fitness/sports consolidated under `HeartPulse`. Full map documented in `NotesSidebar.tsx`.

---

## 6. Persist Active Note Across Browser Refresh

**Problem:** `activeNoteId` in `NoteContext.tsx` is pure in-memory state. Refreshing the browser always opens with no note selected.

**Fix:** Three changes to `NoteContext.tsx`:

1. **Init from localStorage:**
   ```ts
   const [activeNoteId, setActiveNoteIdState] = useState<string | null>(() => {
     try { return localStorage.getItem('activeNoteId') } catch { return null }
   })
   ```

2. **Persist on change** — wrap `setActiveNoteId` to also write to localStorage:
   ```ts
   const setActiveNoteId = useCallback((id: string | null) => {
     setActiveNoteIdState(id)
     try {
       if (id) localStorage.setItem('activeNoteId', id)
       else localStorage.removeItem('activeNoteId')
     } catch { /* unavailable */ }
   }, [])
   ```

3. **Validate after notes load** — if the stored ID no longer exists (note was deleted), clear it:
   ```ts
   useEffect(() => {
     if (!loading && activeNoteId && !notes.find(n => n._id === activeNoteId)) {
       setActiveNoteId(null)
     }
   }, [loading, notes])
   ```

---

## 7. New Note Starts in Inline-Rename Mode

**Problem:** When a new note is created (via the top-bar "New note" button or right-click → "Create new note" on a folder), it is created with the title "Untitled Note" but no prompt to rename it. Folder creation already enters inline-rename mode immediately.

**Fix:** In `handleCreateRootNote` and `handleCreateInFolder`, after `createNote` returns, add:
```ts
setRenamingId(note._id)
setRenameValue("Untitled Note")
```

This mirrors the existing behavior of `handleCreateFolder`. The user sees an editable input pre-filled with "Untitled Note", ready to type over.

---

## Affected Files

| File | Changes |
|---|---|
| `src/components/NotesSidebar.tsx` | Items 1, 3, 4, 7 |
| `src/components/MainArea.tsx` | Item 2 |
| `src/contexts/NoteContext.tsx` | Item 6 |

## Testing

- Manually verify all 7 behaviors in the browser.
- Run `npx vitest run` — no new tests required; existing tests for `NoteContext` and `MainArea` should continue to pass without modification.
