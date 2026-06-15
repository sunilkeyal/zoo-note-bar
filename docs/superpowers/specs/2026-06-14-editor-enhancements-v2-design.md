# Rich Text Editor Enhancements v2 Design

## Overview

Add strikethrough, text color, highlight color, paragraph spacing control, and font family selection to the TipTap-based rich text editor.

## Toolbar Layout

```
[B] [I] [U] [S]  |  [•] [1.]  |  [Text Color A] [Highlight A] [Spacing ⇅]  |  [Heading ▼] [Font ▼] [Size ▼]
```

**Layout Order (Left to Right):**
1. **Text Formatting Group:** Bold, Italic, Underline, Strike (toggle buttons)
2. **List Group:** Bullet List, Ordered List (toggle buttons)
3. **Styling Group:** Text Color (popover), Highlight Color (popover), Paragraph Spacing (popover)
4. **Document Structure Group:** Heading Selection (dropdown), Font Family (dropdown), Font Size (dropdown)

## Feature Details

### 1. Strikethrough
- **Extension:** Included in `@tiptap/starter-kit` — no new package needed
- **UI:** Toggle button with `S` icon (text-decoration: line-through), placed after Underline in the B/I/U group
- **Command:** `editor.chain().focus().toggleStrike().run()`
- **Active state:** `editor.isActive('strike')`

### 2. Text Color
- **Extension:** `@tiptap/extension-color` (new package, works with TextStyle mark)
- **UI:** Toolbar button (letter A with colored underline indicating current color) opens a popover
- **Popover content:** 40 preset color swatches in an 8x5 grid, hex input field, Apply button, Clear button
- **Colors:** 5 grays (black→light), 4 reds, 4 oranges, 3 yellows, 4 greens, 4 blues, 4 purples, 2 teals. Full palette defined in the implementation plan.
- **Command:** `editor.chain().focus().setColor(hex).run()`
- **Unset:** `editor.chain().focus().unsetColor().run()`
- **Active state:** `editor.getAttributes('textStyle').color`

### 3. Highlight (Background Color)
- **Extension:** `@tiptap/extension-highlight` (new package)
- **UI:** Toolbar button (letter A with colored background) opens a popover
- **Popover content:** 20 soft background color swatches in a 4x5 grid, hex input field, Apply button, Clear button
- **Colors:** Pastel/pastel-adjacent shades across yellow, orange, red, purple, blue, teal, green spectrum
- **Command:** `editor.chain().focus().toggleHighlight({ color: hex }).run()`
- **Unset:** `editor.chain().focus().unsetHighlight().run()`
- **Active state:** `editor.isActive('highlight')`

### 4. Paragraph Spacing
- **Extension:** Custom `ParagraphSpacing` TipTap extension (similar to FontSize pattern — adds `marginBottom` as a textStyle attribute)
- **UI:** Toolbar button (vertical arrows icon ⇅) opens a popover
- **Popover Content:** 5 preset buttons in a vertical stack: Tight(4px), Compact(8px), Normal(16px), Relaxed(24px), Loose(32px)
- **Default:** 16px (Normal)
- **Scope:** Paragraphs only (not headings)
- **Command:** `editor.chain().focus().setParagraphSpacing(px).run()`
- **Active state:** `editor.getAttributes('textStyle').paragraphSpacing`
- **Implementation:** Segment control approach with full-width buttons for better usability and no performance issues

### 5. Font Family Selection
- **Extension:** `@tiptap/extension-font-family` (already in package.json, currently unused)
- **UI:** Dropdown with 10 system fonts
- **Fonts:** Georgia, Times New Roman, Merriweather, Arial, Helvetica, Verdana, Trebuchet MS, Courier New, Consolas, Comic Sans MS
- **Font Display:** Dropdown trigger shows the selected font styled in that font (e.g., "Georgia" appears in Georgia font)
- **Default:** "Default" (no explicit font) when no font is set on the selection
- **Command:** `editor.chain().focus().setFontFamily(font).run()`
- **Unset:** `editor.chain().focus().unsetFontFamily().run()`
- **Active state:** `editor.getAttributes('textStyle').fontFamily`

## Popover Implementation
- Use shadcn/ui `Popover` + `PopoverContent` for all popover-based controls (text color, highlight, spacing presets)
- Popovers should `matchTriggerWidth` or use a fixed width (~280px for color pickers, ~260px for spacing)
- Close popover on selection or Apply click
- **Paragraph Spacing:** Use segment control with 5 preset buttons in a vertical stack for better UX and performance
- **Text/Highlight Colors:** Use color grid UI for preset selection with hex input fallback

## New Dependencies
- `@tiptap/extension-color` — for text color
- `@tiptap/extension-highlight` — for background highlight

## CSS
- Add ProseMirror highlight styles in globals.css: `.ProseMirror mark { border-radius: 2px; padding: 0 2px; }`
- Color extension works via inline styles, no additional CSS needed
- Font family works via inline styles, no additional CSS needed
- Paragraph spacing works via `margin-bottom` inline styles, no additional CSS needed

## Files Changed
| File | Change |
|------|--------|
| `src/components/MainArea.tsx` | Add new toolbar buttons, popovers, dropdown |
| `src/extensions/FontSize.ts` | No change |
| `src/extensions/ParagraphSpacing.ts` | Create new custom extension |
| `src/app/globals.css` | Add highlight mark styles |
| `package.json` | Add `@tiptap/extension-color`, `@tiptap/extension-highlight` |
