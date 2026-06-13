# UI Enhancements Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 11 UI polish items: layout reorder, typography tweaks, new controls, and folder state persistence.

**Architecture:** CSS changes in globals.css, three component edits (MainArea, NoteEditor, NotesSidebar), one context edit (NoteContext). Toolbar moves from NoteEditor into MainArea by lifting the editor instance up; NoteEditor becomes a thin content-rendering wrapper.

**Tech Stack:** Next.js 16, MUI 9, TipTap 3, React 19

---

### Task 1: CSS changes — headings, spacing, width, default font

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Update globals.css**

Overwrite the ProseMirror and heading styles in `src/styles/globals.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ProseMirror {
  outline: none;
  min-height: 200px;
  line-height: 1.5;
  font-size: 15px;
  max-width: 1140px;
  color: inherit;
}
.ProseMirror p { margin: 0 0 0.3rem 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
.ProseMirror li { margin: 0 0 0.15rem 0; }
.ProseMirror h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 0.3rem 0; }
.ProseMirror h2 { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.3rem 0; }
.ProseMirror h3 { font-size: 1.05rem; font-weight: 600; margin: 0 0 0.3rem 0; }
```

Changes from current:
- line-height: 1.7 → 1.5
- max-width: 960px → 1140px
- p margin-bottom: 0.5rem → 0.3rem
- li margin-bottom: 0.25rem → 0.15rem
- h1: 1.5rem → 1.4rem
- h2: 1.25rem → 1.2rem
- h3: 1.1rem → 1.05rem

- [ ] **Verify**

Run: `npm run dev` (or confirm no build errors with `npm run build`). CSS takes effect at runtime.

- [ ] **Commit**

```bash
git add src/styles/globals.css
git commit -m "style: reduce heading sizes, tighten line spacing, widen to 1140px"
```

---

### Task 2: Increase note title size and main area width

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Update title font size and maxWidth**

In `src/components/MainArea.tsx`, find the title `TextField`'s `fontSize`:

```tsx
// Line 49 - change fontSize
fontSize: '1.35rem',
// to:
fontSize: '1.6rem',
```

Find all `maxWidth: 960` values and change to `maxWidth: 1140`. There are two occurrences:

Line 40:
```tsx
<Box sx={{ px: '40px', pt: 3, pb: 0, maxWidth: 960, width: '100%' }}>
// to:
<Box sx={{ px: '40px', pt: 3, pb: 0, maxWidth: 1140, width: '100%' }}>
```

Line 63:
```tsx
<Box sx={{ flex: 1, overflow: 'auto', px: '40px', maxWidth: 960, width: '100%', py: 2 }}>
// to:
<Box sx={{ flex: 1, overflow: 'auto', px: '40px', maxWidth: 1140, width: '100%', py: 2 }}>
```

- [ ] **Verify**

Run `npm run build` or `npx tsc --noEmit` to confirm no type errors.

- [ ] **Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: increase note title to 1.6rem, widen main area to 1140px"
```

---

### Task 3: Move toolbar above the title

**Files:**
- Modify: `src/components/MainArea.tsx`
- Modify: `src/components/NoteEditor.tsx`

**Strategy:** Lift the TipTap editor instance creation from NoteEditor into MainArea. MainArea creates the editor with `useEditor`, renders the toolbar inline above the title, and passes the editor to NoteEditor. NoteEditor becomes a thin wrapper that renders `<EditorContent editor={editor} />` and syncs content when `note._id` changes.

- [ ] **Refactor NoteEditor to accept editor as a prop**

Replace `src/components/NoteEditor.tsx`:

```tsx
import React, { useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { Box } from '@mui/material';
import { Note } from '@/types';

interface Props {
  note: Note;
  editor: import('@tiptap/react').Editor | null;
  onUpdate: (id: string, content: string) => void;
}

export default function NoteEditor({ note, editor, onUpdate }: Props) {
  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || '<p></p>');
    }
  }, [note._id]);

  if (!editor) return null;

  return (
    <Box sx={{ flex: 1 }}>
      <EditorContent editor={editor} />
    </Box>
  );
}
```

- [ ] **Update MainArea to create editor and render toolbar**

In `src/components/MainArea.tsx`, add imports:

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '@/extensions/FontSize';
import { Box, Typography, Divider, TextField, ToggleButtonGroup, ToggleButton, Select, MenuItem } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
```

Add constants after imports:

```tsx
const FONTS = ['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana'];
const FONT_SIZES = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '20', '24'];
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];
```

Inside the `MainArea` component, after `titleDebounceRef`, add editor creation:

```tsx
const [, setSelectionVersion] = useState(0);

const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextStyle,
    FontFamily,
    FontSize,
  ],
  content: activeNote?.content || '<p></p>',
  editorProps: {
    attributes: { class: 'note-editor' },
  },
  onUpdate: ({ editor: ed }) => {
    if (activeNoteId) handleUpdate(activeNoteId, ed.getHTML());
  },
  onSelectionUpdate: () => {
    setSelectionVersion((v) => v + 1);
  },
});
```

Add a useEffect to sync editor content when note changes:

```tsx
useEffect(() => {
  if (editor && activeNote && activeNote.content !== editor.getHTML()) {
    editor.commands.setContent(activeNote.content || '<p></p>');
  }
}, [activeNote?._id]);
```

In the JSX, above the title `<Box>` (line 40), add the toolbar:

```tsx
{editor && activeNote && (
  <Box sx={{ px: '40px', pt: 2 }}>
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.3,
        px: 1.5, py: 0.5, bgcolor: 'background.paper',
        border: 1, borderColor: 'divider', borderRadius: 1,
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
        value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '15'}
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
)}
```

Finally, replace the `<NoteEditor>` usage (line 64) to pass the editor:

```tsx
// Before:
<NoteEditor note={activeNote} onUpdate={handleUpdate} />
// After:
<NoteEditor note={activeNote} editor={editor} onUpdate={handleUpdate} />
```

- [ ] **Verify**

Run `npm run build` or `npx tsc --noEmit`. Then start dev server and visually confirm the toolbar renders above the title, all buttons work (bold, italic, underline, lists, heading select, font size, font family).

- [ ] **Commit**

```bash
git add src/components/MainArea.tsx src/components/NoteEditor.tsx
git commit -m "feat: move toolbar above title, lift editor to MainArea"
```

---

### Task 4: Persist folder expand/collapse state

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

- [ ] **Add localStorage persistence for expandedFolders**

In `src/contexts/NoteContext.tsx`, add a `useEffect` on mount to restore state:

After the `toggleFolder` callback definition (around line 56), add:

```tsx
// Restore expanded folders from localStorage on mount
useEffect(() => {
  try {
    const stored = localStorage.getItem('expandedFolders');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setExpandedFolders(new Set(parsed));
      }
    }
  } catch {}
}, []);

// Persist expanded folders on change
useEffect(() => {
  try {
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(expandedFolders)));
  } catch {}
}, [expandedFolders]);
```

- [ ] **Verify**

Run `npx tsc --noEmit`. Then start dev server, expand/collapse some folders, refresh the page — state should be preserved.

- [ ] **Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: persist folder expand/collapse state to localStorage"
```

---

### Task 5: Add expand/collapse all folder icons

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Add import for UnfoldMore/UnfoldLess icons**

In `src/components/NotesSidebar.tsx`, add these to the existing MUI icon imports:

```tsx
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
```

- [ ] **Add expand/collapse all handlers and icons**

In the sidebar header `<Box>` (around line 241-257), add two new IconButtons before the existing New Note button:

```tsx
<Box
  sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider',
  }}
>
  <Tooltip title="Expand All Folders">
    <IconButton
      size="small"
      onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id); })}
      sx={{ width: 28, height: 28 }}
    >
      <UnfoldMoreIcon fontSize="small" />
    </IconButton>
  </Tooltip>
  <Tooltip title="Collapse All Folders">
    <IconButton
      size="small"
      onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id); })}
      sx={{ width: 28, height: 28 }}
    >
      <UnfoldLessIcon fontSize="small" />
    </IconButton>
  </Tooltip>
  <Tooltip title="New Note">
    <IconButton size="small" onClick={handleCreate} sx={{ width: 28, height: 28 }}>
      <AddIcon fontSize="small" />
    </IconButton>
  </Tooltip>
  <Tooltip title="New Folder">
    <IconButton size="small" onClick={handleCreateFolder} sx={{ width: 28, height: 28 }}>
      <CreateNewFolderIcon fontSize="small" />
    </IconButton>
  </Tooltip>
</Box>
```

- [ ] **Verify**

Run `npx tsc --noEmit`. Then start dev server, confirm two new icons appear, clicking Expand All opens all folders, Collapse All closes all folders.

- [ ] **Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add expand/collapse all folder icons"
```
