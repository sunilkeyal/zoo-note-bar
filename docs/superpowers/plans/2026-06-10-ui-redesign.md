# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tab-based navigation and apply a cohesive visual refresh (Modern & Structured direction).

**Architecture:** Remove TabContext and TabBar component entirely. Move `activeNoteId` state into NoteContext. Sidebar gains search, previews, timestamps. Header slimmed to 40px with frosted glass. Editor toolbar becomes a floating pill. All animations via CSS transitions.

**Tech Stack:** Next.js, MUI v9, TipTap, Emotion

---

### Task 1: Simplify State — Remove TabContext, Add activeNoteId to NoteContext

**Files:**
- Modify: `src/contexts/TabContext.tsx` — DELETE entire file
- Modify: `src/contexts/NoteContext.tsx` — add activeNoteId state

- [ ] **Step 1: Delete TabContext.tsx**

Delete `src/contexts/TabContext.tsx` entirely.

- [ ] **Step 2: Add activeNoteId to NoteContext.tsx**

Add `activeNoteId`, `setActiveNoteId`, and a derived `activeNote` to NoteContext:

```typescript
// Add to NoteContextValue interface:
interface NoteContextValue {
  notes: Note[];
  loading: boolean;
  error: string | null;
  activeNoteId: string | null;
  activeNote: Note | null;
  setActiveNoteId: (id: string | null) => void;
  fetchNotes: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note | null>;
  updateNote: (id: string, update: NoteUpdate) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
}

// Inside NoteProvider component, add state:
const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

// Derived value:
const activeNote = notes.find((n) => n._id === activeNoteId) ?? null;

// In the provider value:
const value = {
  notes, loading, error,
  activeNoteId, activeNote, setActiveNoteId,
  fetchNotes, createNote, updateNote, deleteNote,
};
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: replace TabContext with activeNoteId in NoteContext"
```

---

### Task 2: Update Pages — Remove TabProvider Wrapper

**Files:**
- Modify: `src/pages/_app.tsx`
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Update _app.tsx**

Remove `TabProvider` import and its wrapper `<TabProvider>` / `</TabProvider>`. Keep the rest unchanged:

```tsx
import React, { useMemo } from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '@/styles/globals.css';
import { NoteProvider } from '@/contexts/NoteContext';
import { ThemeContextProvider, useTheme } from '@/contexts/ThemeContext';

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1976d2' },
            background: { default: '#fff', paper: '#fafafa' },
          }
        : {
            primary: { main: '#90caf9' },
            background: { default: '#121212', paper: '#1e1e1e' },
            text: { primary: '#e0e0e0', secondary: '#a0a0a0' },
          }),
    },
  }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeContextProvider>
      <ThemedApp>
        <NoteProvider>
          <Component {...pageProps} />
        </NoteProvider>
      </ThemedApp>
    </ThemeContextProvider>
  );
}
```

- [ ] **Step 2: Update index.tsx**

Keep as-is (no changes needed, already doesn't import TabProvider). The layout should remain:

```tsx
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

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove TabProvider from page wrappers"
```

---

### Task 3: Update Sidebar — Search, Previews, Timestamps, Restyling

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Read current NotesSidebar.tsx**

Read the file to understand current structure before editing.

- [ ] **Step 2: Replace NotesSidebar with new implementation**

```tsx
import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useNotes } from '@/contexts/NoteContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';

const DRAWER_WIDTH = 280;

export default function NotesSidebar() {
  const { notes, createNote, deleteNote, activeNoteId, setActiveNoteId } = useNotes();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = async () => {
    const note = await createNote({ title: 'Untitled Note' });
    if (note) setActiveNoteId(note._id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget);
    if (activeNoteId === deleteTarget) setActiveNoteId(null);
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
            top: ['40px', '40px', '40px'],
            height: 'auto',
            bottom: 0,
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.85rem', borderRadius: 2, bgcolor: 'action.hover' },
              },
            }}
          />
        </Box>

        <List dense sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {filtered.map((note) => (
            <ListItem
              key={note._id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(note._id); }}
                  sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={activeNoteId === note._id}
                onClick={() => setActiveNoteId(note._id)}
                sx={{
                  borderRadius: 1.5,
                  mx: 0.5,
                  borderLeft: 3,
                  borderColor: activeNoteId === note._id ? 'primary.main' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                    opacity: 0.4,
                  },
                }}
              >
                <ListItemText
                  primary={note.title}
                  secondary={
                    <Typography variant="caption" color="text.secondary" noWrap component="span">
                      {note.content?.replace(/<[^>]*>/g, '').slice(0, 80) || 'Empty note'}
                    </Typography>
                  }
                  slotProps={{
                    primary: {
                      noWrap: true,
                      sx: {
                        fontSize: '0.85rem',
                        fontWeight: activeNoteId === note._id ? 600 : 400,
                      },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Tooltip title="New Note">
            <IconButton size="small" onClick={handleCreate} sx={{ width: '100%', borderRadius: 1 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
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

Key changes from current:
- Search bar with TextField and SearchIcon
- Note preview (strip HTML tags, first 80 chars)
- Active note has blue left border (3px)
- Delete icon hidden until hover on item
- Sidebar top offset matches 40px header
- New note button at bottom of drawer
- `setActiveNoteId` replaces `openTab` / `closeTab`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: redesign sidebar with search, previews, timestamps"
```

---

### Task 4: Slim Header with Frosted Glass

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Read current AppHeader.tsx**

Read the file first.

- [ ] **Step 2: Update AppHeader to 40px frosted glass**

```tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppHeader() {
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

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: slim frosted-glass header at 40px"
```

---

### Task 5: Update MainArea — Remove TabBar, New Layout

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Read current MainArea.tsx**

Read the file first.

- [ ] **Step 2: Rewrite MainArea to use NoteContext directly**

```tsx
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, Typography, Divider, TextField } from '@mui/material';
import { useNotes } from '@/contexts/NoteContext';
import NoteEditor from './NoteEditor';

export default function MainArea() {
  const { activeNote, activeNoteId, updateNote } = useNotes();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (activeNote) setTitle(activeNote.title);
  }, [activeNote?._id]);

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

  const handleTitleChange = useCallback((id: string, value: string) => {
    setTitle(value);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateNote(id, { title: value });
    }, 600);
  }, [updateNote]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
      {activeNote ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: '40px', pt: 3, pb: 0, maxWidth: 720, mx: 'auto', width: '100%' }}>
            <TextField
              fullWidth
              variant="standard"
              value={title}
              onChange={(e) => handleTitleChange(activeNote._id, e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    '&:before': { borderBottom: 'none' },
                    '&:hover:not(.Mui-disabled, .Mui-error):before': { borderBottom: 'none' },
                    '&:after': { borderBottom: '2px solid' },
                  },
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
            </Typography>
            <Divider sx={{ mt: 1, mb: 0 }} />
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', px: '40px', maxWidth: 720, mx: 'auto', width: '100%', py: 2 }}>
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

Key changes:
- No `TabBar` import or usage
- Uses `activeNote` / `activeNoteId` from `useNotes()` instead of `useTabs()`
- Editor content area has max-width 720px centered with `mx: 'auto'`
- Title styling: 1.35rem / 700 weight

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update MainArea to single-note view with centered layout"
```

---

### Task 6: Floating Toolbar in NoteEditor

**Files:**
- Modify: `src/components/NoteEditor.tsx`

- [ ] **Step 1: Read current NoteEditor.tsx**

Read the file first.

- [ ] **Step 2: Convert toolbar to floating pill at bottom-center**

Replace the toolbar section (the Box with `sx={{ p: 1, borderBottom: 1, ... }}`) with a floating pill at the bottom of the editor container:

```tsx
// Replace the toolbar Box at top with this floating pill at bottom:

<Box
  sx={{
    position: 'sticky',
    bottom: 16,
    alignSelf: 'center',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.3,
    px: 1.5,
    py: 0.5,
    bgcolor: 'background.paper',
    border: 1,
    borderColor: 'divider',
    borderRadius: 3,
    boxShadow: 2,
    mx: 'auto',
    zIndex: 10,
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  }}
>
  {/* same toolbar content: ToggleButtonGroup for bold/italic/underline */}
  {/* same toolbar content: ToggleButtonGroup for lists */}
  {/* same toolbar content: Select for headings, font size, font family */}
</Box>
```

The editor container needs `display: 'flex', flexDirection: 'column'` so the sticky toolbar works. Wrap the `EditorContent` in a flex-grow box and put the toolbar after it.

The full component structure should be:

```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
  <Box sx={{ flex: 1 }}>
    <EditorContent editor={editor} />
  </Box>

  {/* Floating Toolbar */}
  <Box
    sx={{
      position: 'sticky',
      bottom: 16,
      alignSelf: 'center',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.3,
      px: 1.5,
      py: 0.5,
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      boxShadow: (theme) => `0 2px 12px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}`,
      mx: 'auto',
      zIndex: 10,
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    }}
  >
    <ToggleButtonGroup size="small" exclusive={false}>
      <ToggleButton
        value="bold"
        selected={editor.isActive('bold')}
        onChange={() => editor.chain().focus().toggleBold().run()}
        sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
      >
        <FormatBoldIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton
        value="italic"
        selected={editor.isActive('italic')}
        onChange={() => editor.chain().focus().toggleItalic().run()}
        sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
      >
        <FormatItalicIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton
        value="underline"
        selected={editor.isActive('underline')}
        onChange={() => editor.chain().focus().toggleUnderline().run()}
        sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
      >
        <FormatUnderlinedIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>

    <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />

    <ToggleButtonGroup size="small" exclusive={false}>
      <ToggleButton
        value="bulletList"
        selected={editor.isActive('bulletList')}
        onChange={() => editor.chain().focus().toggleBulletList().run()}
        sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
      >
        <FormatListBulletedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton
        value="orderedList"
        selected={editor.isActive('orderedList')}
        onChange={() => editor.chain().focus().toggleOrderedList().run()}
        sx={{ border: 0, p: 0.5, minWidth: 30, borderRadius: 1 }}
      >
        <FormatListNumberedIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>

    <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />

    <Select
      size="small"
      value={
        editor.isActive('heading', { level: 1 }) ? 'h1' :
        editor.isActive('heading', { level: 2 }) ? 'h2' :
        editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'
      }
      onChange={(e) => {
        const val = e.target.value;
        const chain = editor.chain().focus().setParagraph();
        if (val === 'h1') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 1 });
        else if (val === 'h2') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 2 });
        else if (val === 'h3') chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 3 });
        chain.run();
      }}
      sx={{ minWidth: 100, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
    >
      {HEADINGS.map((h) => (
        <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
      ))}
    </Select>

    <Select
      size="small"
      disabled={editor.isActive('heading')}
      value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
      onChange={(e) => editor.chain().focus().setFontSize(e.target.value + 'px').run()}
      sx={{ minWidth: 70, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
    >
      {FONT_SIZES.map((s) => (
        <MenuItem key={s} value={s}>{s}</MenuItem>
      ))}
    </Select>

    <Select
      size="small"
      value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
      onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
      sx={{ minWidth: 100, height: 30, fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.3 } }}
    >
      {FONTS.map((f) => (
        <MenuItem key={f} value={f} style={{ fontFamily: f }}>{f}</MenuItem>
      ))}
    </Select>
  </Box>
</Box>
```

Note: Remove `pb: 2` or `pl: 4` from the outer editor content box — MainArea now handles the padding.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: floating pill toolbar at bottom of editor"
```

---

### Task 7: Update globals.css — Transitions and Max-Width

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Read current globals.css**

Read the file first.

- [ ] **Step 2: Add transition and editor styles**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ProseMirror {
  outline: none;
  min-height: 200px;
  line-height: 1.7;
  font-size: 15px;
  max-width: 720px;
  color: inherit;
}
.ProseMirror p { margin: 0 0 0.5rem 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
.ProseMirror li { margin: 0 0 0.25rem 0; }
.ProseMirror h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0; }
.ProseMirror h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }
.ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0; }

/* Transitions */
.MuiListItemButton-root {
  transition: background-color 0.15s ease !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: update globals.css with transitions and editor max-width"
```

---

### Task 8: Delete TabBar.tsx

**Files:**
- Delete: `src/components/TabBar.tsx`

- [ ] **Step 1: Delete the file**

Delete `src/components/TabBar.tsx` using the file system.

- [ ] **Step 2: Verify no remaining references to TabBar**

Search for `TabBar` and `useTabs` across the project to ensure no remaining references.

```bash
# Run from project root
rg "TabBar|useTabs" src/ --type ts --type tsx
```

Expected output: no matches (all should have been removed in prior tasks).

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove TabBar component"
```

---

### Task 9: Verify and Test

- [ ] **Step 1: Run the app**

```bash
npm run dev
```

Verify:
- App loads without errors
- Sidebar shows notes with search, previews, timestamps
- Clicking a note opens it in the editor (no TabBar)
- Header is slim (40px) with frosted glass
- Editor has max-width 720px centered layout
- Toolbar appears as floating pill at bottom
- Dark mode toggle works
- Creating/deleting notes works

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.
