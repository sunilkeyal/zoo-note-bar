# Rich Text Editor Improvements Design

## Overview

Enhance the TipTap-based rich text editor with additional formatting options: H3 headings, bullet/numbered lists, font size control, toolbar active state synchronization, and reduced line spacing.

## Changes

### 1. Heading Levels

- **File:** `src/components/NoteEditor.tsx`
- Change `StarterKit.configure({ heading: { levels: [1, 2] } })` to `StarterKit.configure({ heading: { levels: [1, 2, 3] } })`
- Add "Heading 3" option to the heading `<Select>` dropdown
- Multiple headings of the same level are already supported by TipTap — no additional config needed

### 2. Bullet & Numbered Lists

- **File:** `src/components/NoteEditor.tsx`
- Add two new toolbar toggle buttons for bullet list and ordered list
- Icons: `FormatListBulletedIcon` and `FormatListNumberedIcon` from `@mui/icons-material`
- StarterKit already includes `bulletList` and `orderedList` extensions — no new extensions needed
- Toggle logic: `editor.chain().focus().toggleBulletList().run()` and `editor.chain().focus().toggleOrderedList().run()`
- Active state: `editor.isActive('bulletList')` and `editor.isActive('orderedList')`
- Place buttons in their own `ToggleButtonGroup` or add them to the existing group separated by a divider

### 3. Font Size

- **File:** `src/components/NoteEditor.tsx`
- Create a custom `FontSize` TipTap extension that extends `TextStyle` and adds `fontSize` as a style attribute on the textStyle mark (or use `@tiptap/extension-font-size` third-party package)
- Add a font size `<Select>` with preset options: 12, 14, 16, 18, 24, 32
- Make the select editable (allow typing a custom value) using MUI's `TextField` with `select` or a custom combo approach
- Apply via: `editor.chain().focus().setFontSize(value).run()`
- Active state: read `editor.getAttributes('textStyle').fontSize` to display current size

### 4. Toolbar Active State Fix

- **File:** `src/components/NoteEditor.tsx`
- Add `onSelectionUpdate` callback to the editor that increments a `useState` counter
- This forces React to re-render when cursor moves, so `editor.isActive(...)` reflects the current position
- Ensures bold/italic/underline/heading/list/font buttons highlight correctly when cursor is on formatted text

### 5. Line Spacing Reduction

- **File:** `src/components/NoteEditor.tsx` — update `<style jsx global>` block
- Reduce paragraph margin from `0 0 0.5rem` to `0 0 0.25rem`
- Reduce heading margins similarly
- Set `line-height: 1.4` on `.ProseMirror`

### 6. Toolbar Layout

Updated toolbar ordering:
```
[B] [I] [U] | [List] [OL] | [Heading ▼] [Font Size ▼] [Font Family ▼]
```