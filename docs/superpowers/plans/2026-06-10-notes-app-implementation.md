# Notes App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page note-taking app with rich text editing, tabbed interface, MongoDB storage, and Docker deployment.

**Architecture:** Next.js Pages Router with API routes handling CRUD against MongoDB. Frontend uses MUI for layout/components and TipTap for rich text editing. React Context for state management. Docker Compose orchestrates app + MongoDB containers.

**Tech Stack:** Next.js 14, TypeScript, MUI 5, TipTap 2.x, MongoDB (native driver), Docker/Docker Compose

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Next.js project and install dependencies**

Run:
```powershell
cd C:\Users\sunil\Projects\note
npx create-next-app@latest . --typescript --eslint --no-tailwind --src-dir --app false --import-alias "@/*"
```

After scaffolding, install additional dependencies:
```powershell
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/pm
npm install mongodb
```

- [ ] **Step 2: Create `.env.local`**

Create `.env.local` with MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/notes-app
```

- [ ] **Step 3: Configure `next.config.js`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = nextConfig
```

- [ ] **Step 4: Verify project builds**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Set up the project directory structure**

Create empty directories:
```powershell
New-Item -ItemType Directory -Path components, contexts, lib, types, "pages/api/notes" -Force
```

---

### Task 2: Type Definitions and MongoDB Client

**Files:**
- Create: `types/index.ts`
- Create: `lib/mongodb.ts`

- [ ] **Step 1: Create `types/index.ts`**

```typescript
import { ObjectId } from 'mongodb';

export interface Note {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content?: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

- [ ] **Step 2: Create `lib/mongodb.ts`**

```typescript
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db();

  return cachedDb;
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
```

---

### Task 3: API Routes — Create and List Notes

**Files:**
- Create: `pages/api/notes.ts`

- [ ] **Step 1: Implement `pages/api/notes.ts`**

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
      .project({ title: 1, createdAt: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .toArray();

    const mapped: Note[] = notes.map((n) => ({
      _id: n._id.toString(),
      title: n.title,
      content: n.content || '',
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return res.status(200).json({ success: true, data: mapped });
  }

  if (req.method === 'POST') {
    const { title } = req.body as NoteInput;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const now = new Date();
    const result = await collection.insertOne({
      title: title.trim(),
      content: '',
      createdAt: now,
      updatedAt: now,
    });

    const note: Note = {
      _id: result.insertedId.toString(),
      title: title.trim(),
      content: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return res.status(201).json({ success: true, data: note });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 4: API Routes — Update and Delete Note

**Files:**
- Create: `pages/api/notes/[id].ts`
- Create: `pages/api/notes/[[...id]].ts` is not needed; use `pages/api/notes/[id].ts`

- [ ] **Step 1: Create directory and implement `pages/api/notes/[id].ts`**

```powershell
New-Item -ItemType Directory -Path "pages/api/notes" -Force
```

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
    const { title, content } = req.body as NoteUpdate;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content;

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

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 5: Contexts — NoteContext and TabContext

**Files:**
- Create: `contexts/NoteContext.tsx`
- Create: `contexts/TabContext.tsx`

- [ ] **Step 1: Create `contexts/NoteContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Note, NoteInput, NoteUpdate, ApiResponse } from '@/types';

interface NoteContextValue {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note | null>;
  updateNote: (id: string, update: NoteUpdate) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
}

const NoteContext = createContext<NoteContextValue | undefined>(undefined);

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const json: ApiResponse<Note[]> = await res.json();
      if (json.success && json.data) {
        setNotes(json.data);
      } else {
        setError(json.error || 'Failed to fetch notes');
      }
    } catch {
      setError('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (input: NoteInput): Promise<Note | null> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => [json.data!, ...prev]);
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id: string, update: NoteUpdate): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => prev.map((n) => (n._id === id ? json.data! : n)));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const json: ApiResponse<void> = await res.json();
      if (json.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  return (
    <NoteContext.Provider value={{ notes, loading, error, fetchNotes, createNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNotes must be used within NoteProvider');
  return ctx;
}
```

- [ ] **Step 2: Create `contexts/TabContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Note } from '@/types';

interface Tab {
  noteId: string;
  title: string;
}

interface TabContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (note: Note) => void;
  closeTab: (noteId: string) => void;
  setActiveTab: (noteId: string) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((note: Note) => {
    setTabs((prev) => {
      if (prev.some((t) => t.noteId === note._id)) return prev;
      return [...prev, { noteId: note._id, title: note.title }];
    });
    setActiveTabId(note._id);
  }, []);

  const closeTab = useCallback((noteId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.noteId === noteId);
      const updated = prev.filter((t) => t.noteId !== noteId);
      if (activeTabId === noteId && updated.length > 0) {
        const newIdx = Math.min(idx, updated.length - 1);
        setActiveTabId(updated[newIdx].noteId);
      } else if (updated.length === 0) {
        setActiveTabId(null);
      }
      return updated;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((noteId: string) => {
    setActiveTabId(noteId);
  }, []);

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabs must be used within TabProvider');
  return ctx;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 6: AppHeader Component

**Files:**
- Create: `components/AppHeader.tsx`

- [ ] **Step 1: Create `components/AppHeader.tsx`**

```typescript
import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';

export default function AppHeader() {
  return (
    <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NoteAltIcon />
          <Typography variant="h6" component="h1" noWrap>
            Notes
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
```

---

### Task 7: NotesSidebar Component

**Files:**
- Create: `components/NotesSidebar.tsx`

- [ ] **Step 1: Create `components/NotesSidebar.tsx`**

```typescript
import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNotes } from '@/contexts/NoteContext';
import { useTabs } from '@/contexts/TabContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';

const DRAWER_WIDTH = 260;

export default function NotesSidebar() {
  const { notes, createNote, deleteNote } = useNotes();
  const { openTab, activeTabId, closeTab } = useTabs();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = async () => {
    const note = await createNote({ title: 'Untitled Note' });
    if (note) openTab(note);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const note = notes.find((n) => n._id === deleteTarget);
    if (note && activeTabId === deleteTarget) {
      closeTab(deleteTarget);
    }
    await deleteNote(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: ['48px', '56px', '64px'],
            height: 'auto',
            bottom: 0,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">My Notes</Typography>
          <Tooltip title="New Note">
            <IconButton size="small" onClick={handleCreate}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <List dense sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {notes.map((note) => (
            <ListItem
              key={note._id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(note._id); }}
                  sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={activeTabId === note._id}
                onClick={() => openTab(note)}
              >
                <ListItemText
                  primary={note.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.9rem',
                    fontWeight: activeTabId === note._id ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
```

---

### Task 8: DeleteConfirmDialog Component

**Files:**
- Create: `components/DeleteConfirmDialog.tsx`

- [ ] **Step 1: Create `components/DeleteConfirmDialog.tsx`**

```typescript
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog({ open, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Note</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this note? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

### Task 9: TabBar Component

**Files:**
- Create: `components/TabBar.tsx`

- [ ] **Step 1: Create `components/TabBar.tsx`**

```typescript
import React from 'react';
import { Tabs, Tab, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTabs } from '@/contexts/TabContext';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
      <Tabs
        value={activeTabId || false}
        onChange={(_, value) => setActiveTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.noteId}
            value={tab.noteId}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{tab.title}</span>
                <IconButton
                  component="span"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.noteId);
                  }}
                  sx={{ ml: 0.5, p: 0.2 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 36 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
```

---

### Task 10: NoteEditor Component (TipTap)

**Files:**
- Create: `components/NoteEditor.tsx`

- [ ] **Step 1: Create `components/NoteEditor.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Box, ToggleButtonGroup, ToggleButton, Select, MenuItem, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import { Note } from '@/types';

interface Props {
  note: Note;
  onUpdate: (id: string, content: string) => void;
}

const FONTS = ['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
];

export default function NoteEditor({ note, onUpdate }: Props) {
  const noteIdRef = useRef(note._id);
  noteIdRef.current = note._id;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      TextStyle,
      FontFamily,
    ],
    content: note.content || '<p></p>',
    editorProps: {
      attributes: { class: 'note-editor' },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate(noteIdRef.current, ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || '<p></p>');
    }
  }, [note._id]);

  if (!editor) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: '#fafafa' }}>
        <ToggleButtonGroup size="small" exclusive={false}>
          <ToggleButton
            value="bold"
            selected={editor.isActive('bold')}
            onChange={() => editor.chain().focus().toggleBold().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            selected={editor.isActive('italic')}
            onChange={() => editor.chain().focus().toggleItalic().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="underline"
            selected={editor.isActive('underline')}
            onChange={() => editor.chain().focus().toggleUnderline().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Select
          size="small"
          value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : 'paragraph'}
          onChange={(e) => {
            const val = e.target.value;
            editor.chain().focus().setParagraph().run();
            if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
          sx={{ minWidth: 110, height: 32, fontSize: '0.85rem' }}
        >
          {HEADINGS.map((h) => (
            <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          sx={{ minWidth: 120, height: 32, fontSize: '0.85rem' }}
        >
          {FONTS.map((f) => (
            <MenuItem key={f} value={f} style={{ fontFamily: f }}>{f}</MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <EditorContent editor={editor} />
      </Box>

      <style jsx global>{`
        .note-editor {
          outline: none;
          min-height: 200px;
        }
        .note-editor p {
          margin: 0 0 0.5rem 0;
        }
        .note-editor ul, .note-editor ol {
          padding-left: 1.5rem;
        }
        .note-editor h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0; }
        .note-editor h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }
        .ProseMirror { outline: none; min-height: 200px; }
      `}</style>
    </Box>
  );
}
```

---

### Task 11: MainArea Component

**Files:**
- Create: `components/MainArea.tsx`

- [ ] **Step 1: Create `components/MainArea.tsx`**

```typescript
import React, { useCallback, useRef } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { useNotes } from '@/contexts/NoteContext';
import { useTabs } from '@/contexts/TabContext';
import TabBar from './TabBar';
import NoteEditor from './NoteEditor';

export default function MainArea() {
  const { notes, updateNote } = useNotes();
  const { activeTabId } = useTabs();
  const activeNote = notes.find((n) => n._id === activeTabId);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null);

  const handleUpdate = useCallback((id: string, content: string) => {
    pendingUpdate.current = { id, content };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingUpdate.current) {
        updateNote(pendingUpdate.current.id, { content: pendingUpdate.current.content });
        pendingUpdate.current = null;
      }
    }, 1000);
  }, [updateNote]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TabBar />
      {activeNote ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 2, pb: 0 }}>
            <Typography variant="h5" fontWeight={600}>
              {activeNote.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
            </Typography>
            <Divider sx={{ mt: 1, mb: 0 }} />
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <NoteEditor note={activeNote} onUpdate={handleUpdate} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Select a note or create a new one
          </Typography>
        </Box>
      )}
    </Box>
  );
}
```

---

### Task 12: Main Page — index.tsx, _app.tsx, _document.tsx

**Files:**
- Modify: `pages/index.tsx`
- Modify: `pages/_app.tsx`
- Modify: `pages/_document.tsx`

- [ ] **Step 1: Replace `pages/_app.tsx`**

```typescript
import React from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { NoteProvider } from '@/contexts/NoteContext';
import { TabProvider } from '@/contexts/TabContext';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NoteProvider>
        <TabProvider>
          <Component {...pageProps} />
        </TabProvider>
      </NoteProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Replace `pages/_document.tsx`**

Next.js scaffold creates a basic `_document.tsx`. Replace it with this version that handles MUI v5 SSR via Emotion:

```typescript
import React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

MyDocument.getInitialProps = async (ctx) => {
  const initialProps = await Document.getInitialProps(ctx);
  return {
    ...initialProps,
    styles: React.Children.toArray(initialProps.styles),
  };
};
```

Note: For production SSR with proper MUI CSS extraction (avoiding FOUC), install `@emotion/cache` and `@emotion/server` and implement the full emotion SSR pattern. The above works for development with minimal MUI FOUC.

- [ ] **Step 3: Replace `pages/index.tsx`**

```typescript
import React from 'react';
import { Box } from '@mui/material';
import AppHeader from '@/components/AppHeader';
import NotesSidebar from '@/components/NotesSidebar';
import MainArea from '@/components/MainArea';

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NotesSidebar />
        <MainArea />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds without errors.

---

### Task 13: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
.next
.env.local
.git
.superpowers
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  mongo:
    image: mongo:7
    container_name: notes-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  app:
    build: .
    container_name: notes-app
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/notes-app
    depends_on:
      - mongo
    restart: unless-stopped

volumes:
  mongo-data:
```

- [ ] **Step 4: Verify Docker build**

Run: `docker-compose build`
Expected: Build succeeds.

- [ ] **Step 5: Add startup script for development convenience**

Create `dev.ps1`:
```powershell
# Start MongoDB only (for local dev without Docker)
# docker run -d -p 27017:27017 --name notes-mongo mongo:7
npm run dev
```

---

### Task 14: Final Verification

- [ ] **Step 1: Start MongoDB**

Make sure MongoDB is running (either through Docker or local).

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 3: Test full flow**

1. Open http://localhost:3000 — should show empty UI with "Select a note or create a new one"
2. Click "+" in sidebar — creates "Untitled Note", opens in tab
3. Type content in TipTap editor — should auto-save after 1s debounce
4. Try Bold/Italic/Underline buttons — text styling works
5. Change heading level and font — styling applies
6. Create a second note — new tab appears
7. Switch between tabs — content loads correctly
8. Hover over note in sidebar — delete icon appears
9. Click delete icon — confirmation dialog shows
10. Confirm delete — note deleted, tab closes
