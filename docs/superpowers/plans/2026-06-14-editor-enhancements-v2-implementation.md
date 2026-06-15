# Rich Text Editor Enhancements v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strikethrough, text color, highlight color, paragraph spacing segment control (5 presets), and font family dropdown to the TipTap editor toolbar.

**Architecture:** All toolbar changes go in `MainArea.tsx` (toolbar + editor setup already there). Two new TipTap packages (`@tiptap/extension-color`, `@tiptap/extension-highlight`) and one custom extension (`ParagraphSpacing`). Font family extension is already installed but unused. Color and spacing use shadcn/ui Popover components.

**Toolbar Layout:** Bold, Italic, Underline, Strike | Bullet List, Ordered List | Text Color, Highlight Color, Paragraph Spacing | Heading Selection, Font Family, Font Size

**Tech Stack:** TipTap v3, shadcn/ui (Popover), lucide-react (icons), React 19

---

### Task 1: Install new packages and shadcn/ui components

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

Run:
```powershell
npm install @tiptap/extension-color @tiptap/extension-highlight
```

- [ ] **Step 2: Add shadcn/ui components**

Run:
```powershell
npx shadcn@latest add popover
```

- [ ] **Step 3: Verify everything compiled**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "chore: add color, highlight packages and shadcn popover/slider" }`

---

### Task 2: Create ParagraphSpacing extension

**Files:**
- Create: `src/extensions/ParagraphSpacing.ts`

- [ ] **Step 1: Create ParagraphSpacing extension**

Create `src/extensions/ParagraphSpacing.ts`:

```ts
import { Extension } from '@tiptap/core';

export interface ParagraphSpacingOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

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
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => element.style.marginBottom?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {};
              return { style: `margin-bottom: ${attributes.paragraphSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { paragraphSpacing: spacing }).run(),
      unsetParagraphSpacing:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { paragraphSpacing: null }).removeEmptyTextStyle().run(),
    };
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 3: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add custom ParagraphSpacing TipTap extension" }`

---

### Task 3: Add imports and register new extensions

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Read current MainArea.tsx**

Read `C:\Users\sunil\Projects\note\src\components\MainArea.tsx` to confirm current content.

- [ ] **Step 2: Add imports for new extensions and UI components**

Add to the import block:
```tsx
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import FontFamily from "@tiptap/extension-font-family"
import { ParagraphSpacing } from "@/extensions/ParagraphSpacing"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import {
  Strikethrough,
  Palette,
  Highlighter,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react"
```

- [ ] **Step 3: Add new extensions to useEditor**

Change the extensions array from:
```tsx
extensions: [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  TextStyle,
  FontSize,
],
```
to:
```tsx
extensions: [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  FontFamily,
  FontSize,
  ParagraphSpacing,
],
```

- [ ] **Step 4: Add FONTS constant**

Add after `FONT_SIZES` and `HEADINGS`:
```tsx
const FONTS = [
  "Arial",
  "Comic Sans MS",
  "Consolas",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Merriweather",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
]
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 6: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: register color, highlight, font-family, and paragraph-spacing extensions" }`

---

### Task 4: Add strikethrough and reorganize toolbar layout

**Files:**
- Modify: `src/components/MainArea.tsx`

**Toolbar Order:** Bold, Italic, Underline, Strike | Bullet List, Ordered List | Text Color, Highlight Color, Paragraph Spacing | Heading Selection, Font Family, Font Size

- [ ] **Step 1: Add strikethrough toggle button**

In the existing ToggleGroup (after the underline button), add:
```tsx
              <ToggleGroupItem
                value="strike"
                pressed={editor.isActive("strike")}
                onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                className="h-8 w-8"
              >
                <Strikethrough className="h-4 w-4" />
              </ToggleGroupItem>
```

- [ ] **Step 2: Add font family dropdown after heading selection**

After the heading selection `<Select>` block, add:
```tsx
            <Select
              value={editor.getAttributes("textStyle").fontFamily || "default"}
              onValueChange={(val) => {
                if (val === "default") editor.chain().focus().unsetFontFamily().run()
                else editor.chain().focus().setFontFamily(val).run()
              }}
            >
              <SelectTrigger className="h-7 w-[130px] text-sm" style={{ fontFamily: editor.getAttributes("textStyle").fontFamily || "inherit" }}>
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="text-sm">Default</SelectItem>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f} className="text-sm" style={{ fontFamily: f }}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
```

**Key Details:**
- `value` defaults to `"default"` instead of empty string so the dropdown correctly reflects "Default" when no font is set
- `SelectTrigger` includes `style={{ fontFamily: editor.getAttributes("textStyle").fontFamily || "inherit" }}` to display the selected font in that font

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add font family dropdown with visual preview" }`

---

### Task 5: Add text color picker popover

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Add TEXT_COLORS constant**

Add after `FONTS`:
```tsx
const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
  "#c62828", "#e53935", "#ef5350", "#e57373", "#ef9a9a", "#e65100", "#ef6c00", "#f57c00",
  "#ff9800", "#f9a825", "#fdd835", "#ffe082", "#fff9c4", "#2e7d32", "#43a047", "#66bb6a",
  "#81c784", "#a5d6a7", "#1565c0", "#1e88e5", "#42a5f5", "#64b5f6", "#90caf9",
  "#6a1b9a", "#8e24aa", "#ab47bc", "#ce93d8", "#e1bee7", "#00838f", "#00acc1", "#26c6da", "#80deea",
]
```

- [ ] **Step 2: Add text color popover after the font family dropdown**

After the font family Select block (before the closing `</div>` of the toolbar), add:
```tsx
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent relative"
                  title="Text color"
                >
                  <Palette className="h-4 w-4" />
                  <span
                    className="absolute bottom-1 h-[3px] w-3 rounded-full"
                    style={{ backgroundColor: editor.getAttributes("textStyle").color || "currentColor" }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Text Color</div>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      className="h-7 w-7 rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().setColor(c).run()}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    placeholder="#hex"
                    className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()
                      }
                    }}
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add text color picker popover" }`

---

### Task 6: Add highlight color picker popover

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Add HIGHLIGHT_COLORS constant**

Add after `TEXT_COLORS`:
```tsx
const HIGHLIGHT_COLORS = [
  "#fff9c4", "#fff3e0", "#fce4ec", "#f3e5f5", "#e8eaf6", "#e1f5fe", "#e0f2f1", "#e8f5e9",
  "#fff176", "#ffcc80", "#ef9a9a", "#ce93d8", "#9fa8da", "#81d4fa", "#80cbc4", "#a5d6a7",
  "#ffee58", "#ffab40", "#f48fb1", "#ea80fc",
]
```

- [ ] **Step 2: Add highlight color popover after text color popover**

After the text color Popover block, add:
```tsx
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
                  title="Highlight color"
                >
                  <Highlighter className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Highlight Color</div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c}
                      className="h-8 w-full rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    placeholder="#hex"
                    className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()
                      }
                    }}
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add highlight color picker popover" }`

---

### Task 7: Add paragraph spacing segment control popover

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Add SPACING_PRESETS constant**

Add after `HIGHLIGHT_COLORS`:
```tsx
const SPACING_PRESETS = [
  { label: "Tight", value: "4px" },
  { label: "Compact", value: "8px" },
  { label: "Normal", value: "16px" },
  { label: "Relaxed", value: "24px" },
  { label: "Loose", value: "32px" },
]
```

- [ ] **Step 2: Add paragraph spacing popover after highlight popover**

After the highlight Popover block, add:
```tsx
            <Popover>
              <PopoverTrigger
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
                title="Paragraph spacing"
              >
                <ArrowUpDown className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-3" align="start">
                <div className="text-sm font-medium mb-3">Paragraph Spacing</div>
                <div className="flex flex-col gap-2">
                  {SPACING_PRESETS.map((p) => {
                    const currentSpacing = editor.getAttributes("paragraph").paragraphSpacing
                    const isActive = currentSpacing === p.value || (!currentSpacing && p.value === "16px")
                    return (
                      <button
                        key={p.value}
                        onClick={() => editor.chain().focus().setParagraphSpacing(p.value).run()}
                        className={`px-3 py-2 text-sm rounded-md font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {p.label} <span className="text-xs opacity-75">({p.value})</span>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
```

**Why segment control over slider?**
- Eliminates performance issues from real-time slider updates
- 5 preset buttons cover most common spacing needs
- Better UX with clear visual feedback and active state highlighting
- All buttons fit in a compact popover without scrolling

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 4: Commit**

Run: `git add -A; if ($?) { git commit -m "feat: add paragraph spacing segment control with 5 presets" }`

---

### Task 8: Add highlight mark CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add highlight mark styles**

Add at the end of `globals.css`:
```css
.ProseMirror mark {
  border-radius: 2px;
  padding: 0 2px;
}
```

- [ ] **Step 2: Commit**

Run: `git add -A; if ($?) { git commit -m "style: add highlight mark styles for ProseMirror" }`

---

### Task 9: Build verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "error"`
Expected: no errors

- [ ] **Step 2: Run lint**

Run: `npx next lint`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `npx next build 2>&1 | Select-String -Pattern "error"`
Expected: no build errors

- [ ] **Step 4: Commit any fixes**

If lint or build fixes were needed, commit them:
```bash
git add -A; if ($?) { git commit -m "chore: fix lint/build issues" }
```
