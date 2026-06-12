# Folder Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folder grouping in the sidebar so notes can be organized into named folders with create/rename/delete/move.

**Architecture:** New `folders` MongoDB collection, Notes get an optional `folderId` field. Sidebar restructured with expandable folder rows, notes nested inside. Responsive: permanent drawer on desktop, collapsible on tablet, overlay on mobile.

**Tech Stack:** Next.js 16 (pages router), MongoDB, MUI v9, TipTap editor

---

### Task 1: Update types — add Folder interface and folderId to Note

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add Folder interface and update Note**

```typescript
import { ObjectId } from 'mongodb';

export interface Folder {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content?: string;
  folderId?: string;
  position?: number;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  folderId?: string;
  position?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Folder type, folderId to Note type"
```

---

### Task 2: Create folders API — list + create

**Files:**
- Create: `src/pages/api/folders.ts`

- [ ] **Step 1: Create the folders route handler**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { Folder } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const collection = db.collection('folders');

  if (req.method === 'GET') {
    const folders = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const mapped: Folder[] = folders.map((f) => ({
      _id: f._id.toString(),
      name: f.name,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return res.status(200).json({ success: true, data: mapped });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required' });
    }

    const now = new Date();
    const result = await collection.insertOne({
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    });

    const folder: Folder = {
      _id: result.insertedId.toString(),
      name: name.trim(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return res.status(201).json({ success: true, data: folder });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/folders.ts
git commit -m "feat: add folders API (list + create)"
```

---

### Task 3: Create folders/[id] API — rename + delete cascade

**Files:**
- Create: `src/pages/api/folders/[id].ts`

- [ ] **Step 1: Create the single-folder route handler**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Folder } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid folder ID' });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid folder ID format' });
  }

  const db = await connectToDatabase();
  const foldersCollection = db.collection('folders');
  const notesCollection = db.collection('notes');

  if (req.method === 'PUT') {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required' });
    }

    const result = await foldersCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: { name: name.trim(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const folder: Folder = {
      _id: result._id.toString(),
      name: result.name,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return res.status(200).json({ success: true, data: folder });
  }

  if (req.method === 'DELETE') {
    const deleteResult = await foldersCollection.deleteOne({ _id: objectId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const notesDelete = await notesCollection.deleteMany({ folderId: id });

    return res.status(200).json({
      success: true,
      data: {
        deletedFolder: id,
        deletedNotesCount: notesDelete.deletedCount,
      },
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/folders/\[id\].ts
git commit -m "feat: add folder rename + delete cascade API"
```

---

### Task 4: Update notes API with folderId support

**Files:**
- Modify: `src/pages/api/notes.ts`
- Modify: `src/pages/api/notes/[id].ts`

- [ ] **Step 1: Update notes.ts to handle folderId and position**

Edit `src/pages/api/notes.ts`:
- In GET handler, sort by `position` (ascending)
- In POST handler, accept `folderId` and `position` from `req.body`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { Note, NoteInput } from '@/types';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const collection = db.collection('notes');

  if (req.method === 'GET') {
    const notes = await collection
      .find({})
      .project({ title: 1, content: 1, folderId: 1, position: 1, createdAt: 1, updatedAt: 1 })
      .sort({ position: 1 })
      .toArray();

    const mapped: Note[] = notes.map((n) => ({
      _id: n._id.toString(),
      title: n.title,
      content: n.content || '',
      folderId: n.folderId || undefined,
      position: n.position ?? 0,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return res.status(200).json({ success: true, data: mapped });
  }

  if (req.method === 'POST') {
    const { title, folderId, position } = req.body as NoteInput;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const now = new Date();
    const doc: Record<string, unknown> = {
      title: title.trim(),
      content: '',
      position: position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    if (folderId) doc.folderId = folderId;

    const result = await collection.insertOne(doc);

    const note: Note = {
      _id: result.insertedId.toString(),
      title: title.trim(),
      content: '',
      folderId: folderId || undefined,
      position: position ?? 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return res.status(201).json({ success: true, data: note });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
```

- [ ] **Step 2: Update [id].ts to handle folderId and position in PUT**

Edit `src/pages/api/notes/[id].ts`:
- In PUT handler, accept `folderId` and `position` from `req.body`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { NoteUpdate } from '@/types';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid note ID' });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid note ID format' });
  }

  const db = await connectToDatabase();
  const collection = db.collection('notes');

  if (req.method === 'PUT') {
    const { title, content, folderId, position } = req.body as NoteUpdate;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content;
    if (folderId !== undefined) update.folderId = folderId || null;
    if (position !== undefined) update.position = position;

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const note = {
      _id: result._id.toString(),
      title: result.title,
      content: result.content || '',
      folderId: result.folderId || undefined,
      position: result.position ?? 0,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return res.status(200).json({ success: true, data: note });
  }

  if (req.method === 'DELETE') {
    const result = await collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/notes.ts src/pages/api/notes/\[id\].ts
git commit -m "feat: add folderId support to notes API"
```

---

### Task 5: Update NoteContext with folders state and actions

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

- [ ] **Step 1: Add folders state, fetch, and CRUD actions**

Read current `NoteContext.tsx` first to understand existing structure, then add:

```typescript
// Inside the NoteContext state
const [folders, setFolders] = useState<Folder[]>([]);
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

// Helper: sort notes by position
const sortByPosition = (notes: Note[]) => [...notes].sort((a, b) => a.position - b.position);

// Toggle folder expansion
const toggleFolder = (folderId: string) => {
  setExpandedFolders((prev) => {
    const next = new Set(prev);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    return next;
  });
};

// Fetch folders
const fetchFolders = useCallback(async () => {
  try {
    const res = await fetch('/api/folders');
    const json: ApiResponse<Folder[]> = await res.json();
    if (json.success && json.data) {
      setFolders(json.data);
    }
  } catch (err) {
    console.error('Failed to fetch folders', err);
  }
}, []);

// Create folder
const createFolder = useCallback(async (name: string) => {
  const res = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json: ApiResponse<Folder> = await res.json();
  if (json.success && json.data) {
    setFolders((prev) => [...prev, json.data!]);
    return json.data;
  }
  return null;
}, []);

// Rename folder
const renameFolder = useCallback(async (id: string, name: string) => {
  const res = await fetch(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json: ApiResponse<Folder> = await res.json();
  if (json.success && json.data) {
    setFolders((prev) => prev.map((f) => (f._id === id ? json.data! : f)));
    return json.data;
  }
  return null;
}, []);

// Delete folder
const deleteFolder = useCallback(async (id: string) => {
  const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.success) {
    setFolders((prev) => prev.filter((f) => f._id !== id));
    setNotes((prev) => prev.filter((n) => n.folderId !== id));
    return json.data;
  }
  return null;
}, []);

// Move note to folder (with optional position)
const moveNote = useCallback(async (noteId: string, folderId: string | null, position?: number) => {
  const body: Record<string, unknown> = {};
  if (folderId !== null) {
    body.folderId = folderId;
  } else {
    body.folderId = null;
  }
  if (position !== undefined) body.position = position;
  const res = await fetch(`/api/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Note> = await res.json();
  if (json.success && json.data) {
    setNotes((prev) => sortByPosition(prev.map((n) => (n._id === noteId ? json.data! : n))));
    return json.data;
  }
  return null;
}, []);

// Also sort notes on every mutation (createNote, updateNote, deleteNote, etc.)

// Include in context value
const value = useMemo(() => ({
  notes,
  folders,
  expandedFolders,
  loading,
  activeNoteId,
  setActiveNoteId,
  fetchNotes,
  fetchFolders,
  createNote,
  updateNote,
  deleteNote,
  createFolder,
  renameFolder,
  deleteFolder,
  moveNote,
  toggleFolder,
}), [...]); // update deps array
```

Make sure to:
1. Import `Folder` and `ApiResponse` from `@/types`
2. Add `fetchFolders()` call in the `useEffect` that runs on mount (alongside `fetchNotes()`)
3. Export all new functions in the context type
4. Add `folderId` and `position` fields to the `createNote` function (accept `folderId` and `position` in the input, pass to API)

- [ ] **Step 2: Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: add folders state and CRUD actions to NoteContext"
```

---

### Task 6: Create DeleteFolderDialog component

**Files:**
- Create: `src/components/DeleteFolderDialog.tsx`

- [ ] **Step 1: Create the folder delete confirmation dialog**

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface DeleteFolderDialogProps {
  open: boolean;
  folderName: string;
  notesCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteFolderDialog({
  open,
  folderName,
  notesCount,
  onClose,
  onConfirm,
}: DeleteFolderDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete folder?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete the folder <strong>"{folderName}"</strong>
          {notesCount > 0 && (
            <> and all <strong>{notesCount}</strong> notes inside it</>
          )}.
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeleteFolderDialog.tsx
git commit -m "feat: add DeleteFolderDialog component with warning"
```

---

### Task 7: Restructure NotesSidebar with expandable folders

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Restructure sidebar with folder rows, nested notes, inline rename, context menus, drag-and-drop indicators**

This is the largest change. Read the current `NotesSidebar.tsx` first, then restructure to:

1. Add imports: `Menu, MenuItem, TextField, Chip` from MUI, `DragEvent` from React
2. Filter notes into two groups: those with a folderId (nested under their folder) and those without ("Quick Notes")
3. Render folders as expandable sections:
   - Each folder row is clickable to expand/collapse + setActiveFolderId
   - Shows folder icon, bold folder name (1rem, 600 weight), count chip
   - Selected folder uses MUI default `selected` (no custom accent bar)
4. "Quick Notes" section always present (always rendered, not conditional)
   - Same bold styling as folders: icon, 1rem/600 name, count chip
5. Inline rename on double-click (input replaces text)
6. Right-click context menu for folders: "Rename", "Delete"
7. Right-click context menu for notes: "Move to folder" (lists Quick Notes + all folders), "Delete"
8. Drag-and-drop with position calculation and drop indicators:
   - `dragActive` state set on dragStart, cleared on dragEnd/drop
   - `dropTarget` state tracks folderId + noteIndex for indicator position
   - `handleNoteDragOver` per note: sets dropTarget based on cursor Y (top half = before, bottom half = after)
   - Drop indicators: 3px primary-colored bars, `position: absolute` (no layout shift)
   - Empty folders show drop zone via `folderNotes.length === 0 && dragActive`
   - Stale indicator cleared via `setDropTarget((prev) => prev?.folderId === folder._id ? prev : null)` on folder Box entry
   - Position interpolation on drop (gap-based: +/-1000 at edges, average between siblings)
9. New note creation inserts below selected note in same folder with interpolated position

Key sections of the restructured component:

```typescript
import React, { useState, DragEvent } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment,
  Menu, MenuItem, Collapse, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import { useNotes } from '@/contexts/NoteContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import { Folder, Note } from '@/types';
```

Full implementation details for the sidebar:

**Folder section rendering:**
```tsx
{/* Map through folders */}
{folders.map((folder) => {
  const folderNotes = filtered.filter((n) => n.folderId === folder._id);
  const isExpanded = expandedFolders.has(folder._id);
  return (
    <Box key={folder._id} onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === folder._id ? prev : null); }} onDrop={(e) => handleDrop(e, folder._id)}>
      <ListItem
        disablePadding
        secondaryAction={
          <Chip label={folderNotes.length} size="small" sx={{ height: 18, fontSize: '0.7rem', mr: 0.5 }} />
        }
      >
        <ListItemButton
          onClick={() => { toggleFolder(folder._id); setActiveFolderId(folder._id); }}
          onContextMenu={(e) => { e.preventDefault(); openFolderMenu(e, folder); }}
          onDoubleClick={() => startRenaming(folder._id, folder.name)}
          sx={{ borderRadius: 1.5, mx: 0.5 }}
        >
          {isExpanded ? <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> : <FolderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
          {renamingId === folder._id ? (
            <TextField
              size="small"
              variant="standard"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => finishRename(folder._id)}
              onKeyDown={(e) => { if (e.key === 'Enter') finishRename(folder._id); if (e.key === 'Escape') cancelRename(); }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              slotProps={{ input: { sx: { fontSize: '1rem', fontWeight: 600 } } }}
            />
          ) : (
            <ListItemText
              primary={folder.name}
              slotProps={{ primary: { noWrap: true, sx: { fontSize: '1rem', fontWeight: 600 } } }}
            />
          )}
        </ListItemButton>
      </ListItem>
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <List dense disablePadding sx={{ position: 'relative' }}>
          {folderNotes.length === 0 && dragActive && (
            <Box sx={{ height: 0, position: 'relative', mx: 3 }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
          )}
          {folderNotes.map((note, noteIndex) => (
            <NoteListItem
              key={note._id}
              note={note}
              noteIndex={noteIndex}
              folderId={folder._id}
              // ... handlers
            />
          ))}
          {dropTarget?.folderId === folder._id && dropTarget.noteIndex === folderNotes.length && folderNotes.length > 0 && (
            <Box sx={{ height: 0, position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
            </Box>
          )}
        </List>
      </Collapse>
    </Box>
  );
})}
```

**Quick Notes section:**
```tsx
{/* Quick Notes — always visible, cannot be deleted */}
<Box>
  <ListItem
    dense
    sx={{ px: 2, py: 0.5, cursor: 'pointer', borderRadius: 1.5, mx: 0.5 }}
    onClick={() => setActiveFolderId(null)}
    secondaryAction={
      <Chip label={quickNotes.length} size="small" sx={{ height: 18, fontSize: '0.7rem', mr: 0.5 }} />
    }
  >
    <FolderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
    <ListItemText
      primary="Quick Notes"
      slotProps={{ primary: { sx: { fontSize: '1rem', fontWeight: 600 } } }}
    />
  </ListItem>
  {/* Empty folder drop zone (always visible during drag) */}
  {quickNotes.length === 0 && dragActive && (
    <Box sx={{ height: 0, position: 'relative', mx: 3 }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main', borderRadius: 0.5 }} />
    </Box>
  )}
  {quickNotes.map((note, noteIndex) => (
    <NoteListItem key={note._id} note={note} noteIndex={noteIndex} ... />
  ))}
  {/* Trailing drop indicator */}
  {dropTarget?.folderId === null && dropTarget.noteIndex === quickNotes.length && quickNotes.length > 0 && (
    <Box sx={{ height: 0, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
    </Box>
  )}
</Box>
```

**Note list item:**
```tsx
function NoteListItem({ note, noteIndex, folderId, activeNoteId, setActiveNoteId, deleteNote, onContextMenu, onDragStart, handleNoteDragOver, renamingId, renameValue, dropTarget, ... }) {
  return (
    <React.Fragment>
      <ListItem
        disablePadding
        draggable
        onDragStart={(e) => onDragStart(e, note._id)}
        onDragEnd={handleDragEnd}
        secondaryAction={
          <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); deleteNote(note._id); }}
            sx={{ opacity: 0, '&:hover': { opacity: 1 } }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        }
      >
        {dropTarget?.folderId === folderId && dropTarget.noteIndex === noteIndex && (
          <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
        )}
        <ListItemButton
          selected={activeNoteId === note._id}
          onClick={() => setActiveNoteId(note._id)}
          onContextMenu={(e) => onContextMenu(e, note)}
          onDoubleClick={() => startRenaming(note._id, note.title)}
          onDragOver={(e) => handleNoteDragOver(e, noteIndex, folderId)}
          sx={{ borderRadius: 1.5, ml: 3, mr: 0.5 }}
        >
          {renamingId === note._id ? (
            <TextField
              size="small" variant="standard" value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => finishRename(note._id)}
              onKeyDown={(e) => { if (e.key === 'Enter') finishRename(note._id); if (e.key === 'Escape') cancelRename(); }}
              autoFocus onClick={(e) => e.stopPropagation()}
              slotProps={{ input: { sx: { fontSize: '0.85rem' } } }}
            />
          ) : (
            <ListItemText
              primary={note.title}
              slotProps={{ primary: { noWrap: true, sx: { fontSize: '0.85rem' } } }}
            />
          )}
        </ListItemButton>
      </ListItem>
    </React.Fragment>
  );
}
```

**Drag and drop with position interpolation and drop indicators:**

```tsx
// State
const [dragActive, setDragActive] = useState(false);
const [dropTarget, setDropTarget] = useState<{ folderId: string | null; noteIndex: number } | null>(null);

// Start dragging
const handleDragStart = (e: DragEvent, noteId: string) => {
  e.dataTransfer.setData('text/plain', noteId);
  e.dataTransfer.effectAllowed = 'move';
  setDragActive(true);
};

// Allow drop on container
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

// Per-note drag-over — sets drop target with position
const handleNoteDragOver = (e: DragEvent, noteIndex: number, parentFolderId: string | null) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const relativeY = e.clientY - rect.top;
  const index = relativeY < rect.height / 2 ? noteIndex : noteIndex + 1;
  setDropTarget({ folderId: parentFolderId, noteIndex: index });
};

// Drop — calculate position via interpolation
const handleDrop = async (e: DragEvent, targetFolderId: string | null) => {
  e.preventDefault();
  const noteId = e.dataTransfer.getData('text/plain');
  if (noteId && dropTarget && dropTarget.folderId === targetFolderId) {
    const targetNotes = notes
      .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
      .sort((a, b) => a.position - b.position);
    const { noteIndex } = dropTarget;
    let position: number;
    if (targetNotes.length === 0) {
      position = 0;
    } else if (noteIndex <= 0) {
      position = targetNotes[0].position - 1000;
    } else if (noteIndex >= targetNotes.length) {
      position = targetNotes[targetNotes.length - 1].position + 1000;
    } else {
      position = (targetNotes[noteIndex - 1].position + targetNotes[noteIndex].position) / 2;
    }
    await moveNote(noteId, targetFolderId, position);
  } else if (noteId) {
    await moveNote(noteId, targetFolderId);
  }
  setDropTarget(null);
  setDragActive(false);
};

const handleDragEnd = () => {
  setDropTarget(null);
  setDragActive(false);
};

// On folder Box:
// onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === folder._id ? prev : null); }}
// onDrop={(e) => handleDrop(e, folder._id)}

// On note ListItemButton:
// onDragOver={(e) => handleNoteDragOver(e, noteIndex, folderId)}]
```

**Context menu:**
```tsx
const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; type: 'folder' | 'note'; target: Folder | Note } | null>(null);
const [moveNoteTarget, setMoveNoteTarget] = useState<Note | null>(null);
const [moveMenuPosition, setMoveMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

// Save move menu position before clearing contextMenu
const handleContextMoveNote = () => {
  if (contextMenu?.type === 'note') {
    setMoveMenuPosition({ mouseX: contextMenu.mouseX, mouseY: contextMenu.mouseY });
    setMoveNoteTarget(contextMenu.target as Note);
    setContextMenu(null);
  }
};

<Menu
  open={contextMenu !== null}
  onClose={() => setContextMenu(null)}
  anchorReference="anchorPosition"
  anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
>
  {contextMenu?.type === 'folder' && [
    <MenuItem key="rename" onClick={() => { startRenaming((contextMenu.target as Folder)._id, (contextMenu.target as Folder).name); setContextMenu(null); }}>
      <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Rename
    </MenuItem>,
    <MenuItem key="delete" onClick={() => { setDeleteFolderTarget(contextMenu.target as Folder); setContextMenu(null); }}>
      <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
    </MenuItem>,
  ]}
  {contextMenu?.type === 'note' && [
    <MenuItem key="move" onClick={handleContextMoveNote}>
      Move to folder
    </MenuItem>,
    <MenuItem key="delete" onClick={() => { setDeleteNoteTarget((contextMenu.target as Note)._id); setContextMenu(null); }}>
      <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
    </MenuItem>,
  ]}
</Menu>

{/* Move to folder submenu */}
<Menu
  open={Boolean(moveNoteTarget)}
  onClose={() => { setMoveNoteTarget(null); setMoveMenuPosition(null); }}
  anchorReference="anchorPosition"
  anchorPosition={moveMenuPosition ? { top: moveMenuPosition.mouseY, left: moveMenuPosition.mouseX } : undefined}
>
  <MenuItem onClick={async () => { if (moveNoteTarget) { await moveNote(moveNoteTarget._id, null); setMoveNoteTarget(null); } }}>
    Quick Notes
  </MenuItem>
  {folders.map((f) => (
    <MenuItem key={f._id} onClick={async () => { if (moveNoteTarget) { await moveNote(moveNoteTarget._id, f._id); setMoveNoteTarget(null); } }}>
      {f.name}
    </MenuItem>
  ))}
</Menu>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: restructure sidebar with expandable folders, inline rename, context menus, drag-drop"
```

---

### Task 8: Update AppHeader with responsive hamburger toggle

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Add hamburger menu button for tablet/mobile**

```typescript
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@/contexts/ThemeContext';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export default function AppHeader({ onToggleSidebar, showMenuButton }: AppHeaderProps) {
  const { mode, toggleTheme } = useTheme();

  return (
    <AppBar
      position="static"
      color="default"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        boxShadow: 'none',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'light'
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: '40px !important', px: 2 }}>
        {showMenuButton && (
          <IconButton color="inherit" size="small" onClick={onToggleSidebar} sx={{ mr: 1 }}>
            <MenuIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <NoteAltIcon fontSize="small" />
          <Typography variant="h6" component="h1" noWrap sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
            Notes
          </Typography>
        </Box>
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton color="inherit" size="small" onClick={toggleTheme}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add hamburger menu button and responsive props to AppHeader"
```

---

### Task 9: Update index.tsx with responsive sidebar logic

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Add responsive sidebar state, breakpoint detection, mobile/tablet drawer toggle**

```typescript
import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import AppHeader from '@/components/AppHeader';
import NotesSidebar from '@/components/NotesSidebar';
import MainArea from '@/components/MainArea';

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));    // <600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-900px
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  React.useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const showMenuButton = isMobile || isTablet;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        showMenuButton={showMenuButton}
      />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            display: { xs: sidebarOpen ? 'block' : 'none', md: 'block' },
            width: { xs: '100%', sm: 280 },
            flexShrink: 0,
            position: { xs: 'absolute', sm: 'relative' },
            zIndex: { xs: 1200, sm: 'auto' },
            height: '100%',
            ...(isMobile && sidebarOpen ? { position: 'fixed', left: 0, top: 40, width: '100%', bgcolor: 'background.default' } : {}),
          }}
        >
          <NotesSidebar />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: { xs: sidebarOpen ? 'none' : 'block', md: 'block' },
          }}
          onClick={() => { if (isMobile && sidebarOpen) setSidebarOpen(false); }}
        >
          <MainArea />
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat: add responsive sidebar with mobile/tablet drawer toggle"
```

---

### Task 10: Build verification

- [ ] **Step 1: Build and verify no errors**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Run dev server and verify folder CRUD**

Run: `npm run dev`
Expected: App starts. Sidebar shows folder icon. Clicking it creates a new folder. Double-click folder name renames it. Right-click context menu shows Rename/Delete. Delete shows warning with note count. Drag-and-drop notes between folders shows position-based drop indicators. New notes created below selected note with correct position. Drop into empty folders shows indicator. Quick Notes always visible, matching folder styling. Responsive: hamburger shows on narrow viewport.
