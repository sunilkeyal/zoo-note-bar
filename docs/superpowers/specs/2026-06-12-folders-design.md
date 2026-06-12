# Folder Grouping for Notes

## Overview
Add folder grouping to organize notes into folders in the sidebar. Users can create, rename, and delete folders, and each note belongs to exactly one folder.

## Data Model

### Folder interface
```
interface Folder {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### Note interface (updated)
```
interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;   // null/undefined = "Quick Notes" concept
  position: number;    // ordering within folder, gap-based (insert at any position)
  createdAt: string;
  updatedAt: string;
}

interface NoteInput {
  title: string;
  content?: string;
  folderId?: string;
  position?: number;
}

interface NoteUpdate {
  title?: string;
  content?: string;
  folderId?: string;
  position?: number;
}
```

### MongoDB
- New `folders` collection storing Folder documents
- Existing `notes` collection — each note gains an optional `folderId` field referencing a Folder `_id`, and a `position` field (number) for ordering
- Notes with no `folderId` are considered "Quick Notes" (the default folder shown in the UI)

## API Endpoints

### Folders
```
GET  /api/folders            → { success: true, data: Folder[] }
POST /api/folders            → body: { name: string } → { success: true, data: Folder }
PUT  /api/folders/[id]       → body: { name: string } → { success: true, data: Folder }
DELETE /api/folders/[id]     → deletes folder + all notes inside
                              → { success: true, data: { deletedFolder: string, deletedNotesCount: number } }
```

### Notes (updated)
```
GET  /api/notes              → returns notes sorted by position (ascending)
POST /api/notes              → body: { title: string, folderId?: string, position?: number }
PUT  /api/notes/[id]         → body: { title?, content?, folderId?, position? }
```

### Delete folder behavior
- Server deletes the folder document from the `folders` collection
- Server deletes all notes with matching `folderId` from the `notes` collection
- Response includes the count of deleted notes so the UI can show confirmation

## UI Components

### NotesSidebar (restructured)
- Sidebar header: icon buttons for "New Note" (`+`) and "New Folder" (`📁`)
- Search bar (unchanged from current)
- Folder rows, each expandable to show notes inside:
  - Folder row shows: folder icon, bold folder name (1rem, 600 weight), note count chip
  - Click folder row → expands/collapses + sets as active folder
  - Selected folder uses MUI default `selected` style (gray background, no custom accent bar)
- Notes listed under their folder with indentation (ml: 3)
  - Selected note uses MUI default `selected` style (no left accent border, no bold)
  - Notes use 0.85rem font size, 400 weight
- "Quick Notes" section always visible (always rendered, not conditional on length)
  - Same styling as folder rows: bold name (1rem, 600), count chip, folder icon
  - Cannot be deleted
- Drag-and-drop with visual feedback:
  - Drop indicators: 3px primary-colored absolutely positioned bars (no layout shift during drag)
  - Each note has drag-over zones (top half = insert before, bottom half = insert after)
  - Empty folders show a 24px drop zone with indicator during drag
  - Stale drop indicators cleared when entering a new folder's zone
- New note creation inserts at interpolated position below the selected note (same folder)
- Right-click context menu on folders: "Rename", "Delete"
- Right-click context menu on notes: "Move to folder" → submenu listing all folders + Quick Notes, "Delete"
- Double-click folder name → inline rename (input replaces text)
- Double-click note title → inline rename

### DeleteFolderDialog (new)
- Warning popup when deleting a folder
- Shows: "Delete folder '[name]' and all [N] notes inside?"
- Confirm/Cancel buttons
- Uses existing MUI `Dialog` component (similar to `DeleteConfirmDialog`)

### AppHeader (updated)
- Hamburger menu icon on tablet/mobile to toggle sidebar visibility
- Sidebar states: permanent (desktop), persistent (tablet), temporary (mobile)

## Drag-and-Drop Position Calculation

```
position = GAP (default 1000) between consecutive notes
Insert at start: targetNotes[0].position - 1000
Insert at end:   targetNotes[last].position + 1000
Insert between:  (targetNotes[i-1].position + targetNotes[i].position) / 2
```

Position is interpolated on drop. Notes are sorted by `position` on every state mutation.

## State Management (NoteContext)

Add to `NoteContext`:
- `folders: Folder[]` — list of folders
- `expandedFolders: Set<string>` — which folders are expanded in the sidebar
- `fetchFolders()` — load folders from API
- `createFolder(name)` — create folder
- `renameFolder(id, name)` — rename folder
- `deleteFolder(id)` — delete folder with cascade
- `moveNote(noteId, folderId, position?)` — move note to folder with optional position
- All notes state sorted by `position` (ascending) after every mutation

## Responsive Breakpoints

| Breakpoint | Sidebar Behavior |
|---|---|
| >900px | Permanent drawer (current) |
| 600-900px | Persistent drawer, hamburger toggle in header |
| <600px | Temporary drawer, overlay, hamburger toggle |

## Implementation Order

1. Add `Folder` type and update `Note` type (add `position`)
2. Create `src/pages/api/folders.ts` and `src/pages/api/folders/[id].ts`
3. Update `src/pages/api/notes.ts` and `src/pages/api/notes/[id].ts` with `folderId` + `position` support
4. Update `NoteContext` with folders state, actions, and position-based sorting
5. Restructure `NotesSidebar` with expandable folders, inline rename, context menus
6. Create `DeleteFolderDialog` component
7. Update `AppHeader` with responsive hamburger toggle
8. Add drag-and-drop with position interpolation and drop indicators
9. Test all CRUD flows and responsive behavior
