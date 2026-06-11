# Rich Text Editor Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the TipTap editor with H3, bullet/numbered lists, font size control, active state sync, and tighter spacing.

**Architecture:** All changes are in `src/components/NoteEditor.tsx` except a new custom `FontSize` TipTap extension. The editor already uses StarterKit (which includes bulletList/orderedList), Underline, TextStyle, and FontFamily extensions — we add H3 to StarterKit's heading config, add list toolbar buttons, create a FontSize extension, fix re-rendering for active states, and adjust CSS.

**Tech Stack:** TipTap v3, MUI v9, React 19

---

### Task 1: Create custom FontSize extension

**Files:**
- Create: `src/extensions/FontSize.ts`

- [ ] **Step 1: Create FontSize extension**

Create `src/extensions/FontSize.ts`:

```ts
import { Extension } from '@tiptap/core';

export interface FontSizeOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 3: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add custom FontSize TipTap extension" }`

---

### Task 2: Add H3, bullet list, numbered list to editor

**Files:**
- Modify: `src/components/NoteEditor.tsx`

- [ ] **Step 1: Read current NoteEditor.tsx**

Read `C:\Users\sunil\Projects\note\src\components\NoteEditor.tsx` to confirm current content.

- [ ] **Step 2: Update heading config and add list extensions**

Change `StarterKit.configure({ heading: { levels: [1, 2] } })` to `StarterKit.configure({ heading: { levels: [1, 2, 3] } })`

- [ ] **Step 3: Add list icons to imports**

Add to imports:
```tsx
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
```

- [ ] **Step 4: Add "Heading 3" to HEADINGS constant**

Change:
```tsx
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
];
```
to:
```tsx
const HEADINGS = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];
```

- [ ] **Step 5: Add list toggle buttons to toolbar**

After the underline ToggleButton (before the closing `</ToggleButtonGroup>`), add:

```tsx
          <ToggleButton
            value="bulletList"
            selected={editor.isActive('bulletList')}
            onChange={() => editor.chain().focus().toggleBulletList().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="orderedList"
            selected={editor.isActive('orderedList')}
            onChange={() => editor.chain().focus().toggleOrderedList().run()}
            sx={{ border: 1, borderColor: 'divider', p: 0.5, minWidth: 32 }}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
```

- [ ] **Step 6: Update heading Select value logic**

Change the heading value logic to include h3:
```tsx
value={
  editor.isActive('heading', { level: 1 }) ? 'h1' :
  editor.isActive('heading', { level: 2 }) ? 'h2' :
  editor.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph'
}
```

And onChange:
```tsx
onChange={(e) => {
  const val = e.target.value;
  editor.chain().focus().setParagraph().run();
  if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
  if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
  if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
}}
```

- [ ] **Step 7: Verify the app builds**

Run: `npx next build 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 8: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add H3, bullet list, and numbered list support" }`

---

### Task 3: Add font size dropdown to toolbar

**Files:**
- Modify: `src/components/NoteEditor.tsx`

- [ ] **Step 1: Import FontSize extension**

Add import:
```tsx
import { FontSize } from '@/extensions/FontSize';
```

- [ ] **Step 2: Add FontSize to extensions array**

```tsx
extensions: [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  TextStyle,
  FontFamily,
  FontSize,
],
```

- [ ] **Step 3: Add FONT_SIZES constant**

Add after `FONTS`:
```tsx
const FONT_SIZES = ['12', '14', '16', '18', '24', '32'];
```

- [ ] **Step 4: Add font size Select to toolbar**

After the heading `<Select>`, add:
```tsx
        <Select
          size="small"
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value + 'px').run()}
          sx={{ minWidth: 80, height: 32, fontSize: '0.85rem' }}
        >
          {FONT_SIZES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
```

- [ ] **Step 5: Verify the app builds**

Run: `npx next build 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 6: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add font size control to editor toolbar" }`

---

### Task 4: Fix toolbar active state synchronization

**Files:**
- Modify: `src/components/NoteEditor.tsx`

- [ ] **Step 1: Add selection update re-render trigger**

Add `useState` import (already imported, just add to existing React import):
```tsx
import React, { useEffect, useRef, useState } from 'react';
```

Add state variable in the component:
```tsx
const [selectionVersion, setSelectionVersion] = useState(0);
```

Add `onSelectionUpdate` to the editor config:
```tsx
onSelectionUpdate: () => {
  setSelectionVersion((v) => v + 1);
},
```

The complete editor config becomes:
```tsx
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextStyle,
    FontFamily,
    FontSize,
  ],
  content: note.content || '<p></p>',
  editorProps: {
    attributes: { class: 'note-editor' },
  },
  onUpdate: ({ editor: ed }) => {
    onUpdate(noteIdRef.current, ed.getHTML());
  },
  onSelectionUpdate: () => {
    setSelectionVersion((v) => v + 1);
  },
});
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 3: Commit**

Run: `git add -A; if ($?) { git commit -m "fix: sync toolbar active state with cursor position" }`

---

### Task 5: Reduce line spacing in ProseMirror

**Files:**
- Modify: `src/components/NoteEditor.tsx`

- [ ] **Step 1: Update CSS to tighten spacing**

Change the `<style jsx global>` block:
```tsx
<style jsx global>{`
  .ProseMirror { outline: none; min-height: 200px; line-height: 1.4; }
  .ProseMirror p { margin: 0 0 0.25rem 0; }
  .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
  .ProseMirror li { margin: 0 0 0.15rem 0; }
  .ProseMirror h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem 0; }
  .ProseMirror h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.25rem 0; }
  .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem 0; }
`}</style>
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 3: Run lint**

Run: `npx next lint`

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "fix: reduce line spacing and add H3 styles" }`
