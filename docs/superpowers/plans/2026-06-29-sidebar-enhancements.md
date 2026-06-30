# Sidebar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 sidebar bugs and deliver 2 UX improvements — drag-vs-text-selection conflict, stale rename title, broken context-menu rename, markdown download removal, active-note persistence on refresh, and inline-rename mode for new notes.

**Architecture:** Three files are modified (`NotesSidebar.tsx`, `MainArea.tsx`, `NoteContext.tsx`). No new files or components are created. Item 5 (icon map) is already shipped on `feature/sidebar-enhancements`.

**Tech Stack:** Next.js 15 App Router, TypeScript, React, dnd-kit, Radix UI (shadcn), Vitest + Testing Library

## Global Constraints

- Branch: `feature/sidebar-enhancements` — never commit to `main`
- Run tests with: `npx vitest run` from project root
- No new files, no new components
- All lucide-react icons imported from `lucide-react`

---

### Task 1: Fix DND overriding text selection in rename inputs

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

**Interfaces:**
- Produces: rename `<Input>` elements stop pointer events propagating to dnd-kit sensors

- [ ] **Step 1: Add `onPointerDown` stop-propagation to the note rename Input**

In `renderNoteItem`, find the rename `<Input>`:

```tsx
<Input
  value={renameValue}
  onChange={(e) => setRenameValue(e.target.value)}
  onBlur={() => finishRename(note._id)}
  onKeyDown={(e) => { if (e.key === "Enter") finishRename(note._id); if (e.key === "Escape") cancelRename() }}
  autoFocus
  className={`h-6 text-xs px-1 ${asRootItem ? "" : "mx-2 my-0.5"}`}
  onClick={(e) => e.stopPropagation()}
/>
```

Add `onPointerDown={(e) => e.stopPropagation()}` so it becomes:

```tsx
<Input
  value={renameValue}
  onChange={(e) => setRenameValue(e.target.value)}
  onBlur={() => finishRename(note._id)}
  onKeyDown={(e) => { if (e.key === "Enter") finishRename(note._id); if (e.key === "Escape") cancelRename() }}
  autoFocus
  className={`h-6 text-xs px-1 ${asRootItem ? "" : "mx-2 my-0.5"}`}
  onClick={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
/>
```

- [ ] **Step 2: Add `onPointerDown` stop-propagation to the folder rename Input**

In `renderFolder`, find the rename `<Input>` inside the Collapsible:

```tsx
<Input
  value={renameValue}
  onChange={(e) => setRenameValue(e.target.value)}
  onBlur={() => finishRename(folder._id)}
  onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
  autoFocus
  className="h-6 text-xs px-1"
  onClick={(e) => e.stopPropagation()}
/>
```

Add `onPointerDown={(e) => e.stopPropagation()}`:

```tsx
<Input
  value={renameValue}
  onChange={(e) => setRenameValue(e.target.value)}
  onBlur={() => finishRename(folder._id)}
  onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
  autoFocus
  className="h-6 text-xs px-1"
  onClick={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
/>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Manually verify**

Double-click a note → inline input appears → click-drag inside the input to select text → text is highlighted, no drag occurs. Repeat for a folder name.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "fix: stop DND sensor intercepting pointer events on rename inputs"
```

---

### Task 2: Fix stale note title in detail area after sidebar rename

**Files:**
- Modify: `src/components/MainArea.tsx`

**Interfaces:**
- Produces: `useEffect` that syncs `activeNote.title` to local `title` state now re-runs on title changes as well as ID changes

- [ ] **Step 1: Update the useEffect dependency array**

Find this effect in `MainArea.tsx`:

```ts
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if (activeNote) setTitle(activeNote.title)
}, [activeNote?._id])
```

Change the dependency array to include `activeNote?.title`:

```ts
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if (activeNote) setTitle(activeNote.title)
}, [activeNote?._id, activeNote?.title])
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Manually verify**

Open a note → rename it from the sidebar → the title in the detail area updates immediately without navigating away.

- [ ] **Step 4: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "fix: sync detail title when active note is renamed from sidebar"
```

---

### Task 3: Fix context-menu Rename not working

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

**Interfaces:**
- Produces: `handleRenameFromContextMenu` calls `startRenaming` synchronously

- [ ] **Step 1: Remove the setTimeout wrapper**

Find `handleRenameFromContextMenu`:

```ts
const handleRenameFromContextMenu = (id: string, name: string) => {
  setTimeout(() => startRenaming(id, name), 0)
}
```

Replace with a direct call:

```ts
const handleRenameFromContextMenu = (id: string, name: string) => {
  startRenaming(id, name)
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Manually verify**

Right-click a note → click "Rename" → the inline rename input appears immediately. Repeat for a folder.

- [ ] **Step 4: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "fix: context-menu rename now calls startRenaming synchronously"
```

---

### Task 4: Remove Markdown download, replace sub-menu with direct Download PDF item

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

**Interfaces:**
- Produces: note context menu has a flat "Download PDF" item instead of a Download sub-menu

- [ ] **Step 1: Replace the ContextMenuSub block with a flat ContextMenuItem**

In `renderNoteItem`, find this block:

```tsx
<ContextMenuSub>
  <ContextMenuSubTrigger>
    <Download /> Download
  </ContextMenuSubTrigger>
  <ContextMenuSubContent>
    <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "markdown") }}>
      <FileText /> Markdown
    </ContextMenuItem>
    <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "pdf") }}>
      <File /> PDF
    </ContextMenuItem>
  </ContextMenuSubContent>
</ContextMenuSub>
```

Replace it with:

```tsx
<ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "pdf") }}>
  <File /> Download PDF
</ContextMenuItem>
```

- [ ] **Step 2: Remove unused imports**

Check whether `Download`, `FileText`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger` are used anywhere else in the file. Remove from imports only those that are no longer referenced anywhere.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Manually verify**

Right-click a note → context menu shows "Download PDF" as a direct item (no sub-menu) → clicking it downloads the PDF.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: replace download sub-menu with single Download PDF item"
```

---

### Task 5: Persist active note ID across browser refresh

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

**Interfaces:**
- Produces: `activeNoteId` initialises from `localStorage`, persists on every `setActiveNoteId` call, and clears itself if the stored note no longer exists after notes load

- [ ] **Step 1: Change activeNoteId to initialise from localStorage**

Find:

```ts
const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
```

Replace with a lazy initialiser and a renamed internal setter:

```ts
const [activeNoteId, setActiveNoteIdState] = useState<string | null>(() => {
  try { return localStorage.getItem('activeNoteId') } catch { return null }
});
```

- [ ] **Step 2: Create a wrapped setActiveNoteId that persists to localStorage**

Directly below the state declaration, add:

```ts
const setActiveNoteId = useCallback((id: string | null) => {
  setActiveNoteIdState(id);
  try {
    if (id) localStorage.setItem('activeNoteId', id);
    else localStorage.removeItem('activeNoteId');
  } catch { /* localStorage unavailable */ }
}, []);
```

- [ ] **Step 3: Add a validation effect that clears stale IDs after notes load**

Add this effect after the `fetchNotes` / `fetchFolders` calls, alongside the other `useEffect` hooks:

```ts
useEffect(() => {
  if (!loading && activeNoteId && !notes.find(n => n._id === activeNoteId)) {
    setActiveNoteId(null);
  }
}, [loading, notes, activeNoteId, setActiveNoteId]);
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: all tests pass. The `NoteContext` tests mock `localStorage`; check that `note-context.test.tsx` passes without modification.

- [ ] **Step 5: Manually verify**

Select a note → refresh the browser → the same note is still selected and shown in the detail area. Then delete that note → refresh → no note is selected (cleared gracefully).

- [ ] **Step 6: Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: persist active note ID in localStorage across page refresh"
```

---

### Task 6: New notes start in inline-rename mode

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

**Interfaces:**
- Produces: `handleCreateRootNote` and `handleCreateInFolder` both call `setRenamingId` + `setRenameValue` after note creation, mirroring `handleCreateFolder`

- [ ] **Step 1: Update handleCreateRootNote**

Find:

```ts
const handleCreateRootNote = async () => {
  const rootNotes = notes.filter((n) => !n.folderId).sort((a, b) => a.position - b.position)
  const position = rootNotes.length > 0 ? rootNotes[rootNotes.length - 1].position + 1000 : 0
  const note = await createNote({ title: "Untitled Note", position })
  if (note) {
    setActiveNoteId(note._id)
  }
}
```

Replace with:

```ts
const handleCreateRootNote = async () => {
  const rootNotes = notes.filter((n) => !n.folderId).sort((a, b) => a.position - b.position)
  const position = rootNotes.length > 0 ? rootNotes[rootNotes.length - 1].position + 1000 : 0
  const note = await createNote({ title: "Untitled Note", position })
  if (note) {
    setActiveNoteId(note._id)
    setRenamingId(note._id)
    setRenameValue("Untitled Note")
  }
}
```

- [ ] **Step 2: Update handleCreateInFolder**

Find:

```ts
const handleCreateInFolder = async (folderId: string) => {
  const folderNotes = notes
    .filter((n) => n.folderId === folderId)
    .sort((a, b) => a.position - b.position)
  const position = folderNotes.length > 0
    ? folderNotes[folderNotes.length - 1].position + 1000
    : 0
  const note = await createNote({ title: "Untitled Note", folderId, position })
  if (note) {
    if (!expandedFolders.has(folderId)) {
      toggleFolder(folderId)
    }
    setActiveNoteId(note._id)
  }
}
```

Replace with:

```ts
const handleCreateInFolder = async (folderId: string) => {
  const folderNotes = notes
    .filter((n) => n.folderId === folderId)
    .sort((a, b) => a.position - b.position)
  const position = folderNotes.length > 0
    ? folderNotes[folderNotes.length - 1].position + 1000
    : 0
  const note = await createNote({ title: "Untitled Note", folderId, position })
  if (note) {
    if (!expandedFolders.has(folderId)) {
      toggleFolder(folderId)
    }
    setActiveNoteId(note._id)
    setRenamingId(note._id)
    setRenameValue("Untitled Note")
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Manually verify**

Click the "New note" button in the top bar → new note appears in the sidebar with an editable input pre-filled with "Untitled Note". Right-click a folder → "Create new note" → same inline-rename behaviour.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: new notes start in inline-rename mode"
```

---

## Final verification

- [ ] Run the full test suite: `npx vitest run` — all pass
- [ ] Smoke-test all 6 tasks manually in the browser
- [ ] Confirm you are on `feature/sidebar-enhancements` and NOT on `main`
