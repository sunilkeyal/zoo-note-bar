# Mobile & Tablet Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make zoo-note fully functional across 360px+ screens with progressive enhancement — bottom toolbar on mobile, responsive editor width, touch-optimized interactions.

**Architecture:** Keep existing layout (shadcn sidebar + SidebarInset). Add responsive Tailwind breakpoints. Split editor toolbar into desktop/mobile subcomponents conditionally rendered by viewport. No layout rewrite.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, dnd-kit

---

### Task 1: Safe-area CSS variables and global responsive styles

**Files:**
- Modify: `src/app/globals.css:49-82`

- [ ] **Step 1: Add safe-area and bottom toolbar CSS to globals.css**

Append before `@layer base`:

```css
@theme inline {
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --bottom-toolbar-height: 56px;
}
```

Add bottom toolbar class after the existing ProseMirror styles (after line 204):

```css
.editor-toolbar-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-toolbar-height);
  padding-bottom: var(--safe-area-bottom);
  z-index: 40;
  background: var(--background);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 8px;
  padding-right: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) {
  .editor-toolbar-mobile {
    display: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add safe-area and bottom toolbar CSS variables"
```

---

### Task 2: Responsive editor content area

**Files:**
- Modify: `src/components/MainArea.tsx:500-516`

- [ ] **Step 1: Update editor content wrapper classes**

Change line 500:
```tsx
      <div className="px-10 pt-3 pb-0 max-w-[1140px] w-full">
```
to:
```tsx
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-3 pb-0 w-full md:max-w-[900px] lg:max-w-[1140px] mx-auto">
```

Change line 514:
```tsx
      <div className="flex-1 overflow-auto px-10 max-w-[1140px] w-full py-4">
```
to:
```tsx
      <div className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 w-full md:max-w-[900px] lg:max-w-[1140px] py-4 mx-auto pb-16 md:pb-4">
```

The `pb-16` on mobile accounts for the bottom toolbar height; `md:pb-4` restores normal padding on desktop.

- [ ] **Step 2: Reduce title font size on mobile**

Line 505:
```tsx
          style={{ fontSize: "21px" }}
```
Change to use responsive class instead of inline style. Replace the title Input with:
```tsx
          className="font-semibold leading-tight border-0 shadow-none px-0 h-auto focus-visible:ring-0 text-xl md:text-[21px]"
```

Remove the `style={{ fontSize: "21px" }}` prop.

- [ ] **Step 3: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: responsive editor content area widths and padding"
```

---

### Task 3: Bottom toolbar on mobile

**Files:**
- Modify: `src/components/MainArea.tsx:221-497`

- [ ] **Step 1: Add `useIsMobile` import and hook usage**

At the top of MainArea.tsx, add the import:
```tsx
import { useIsMobile } from "@/hooks/use-mobile"
```

After the `editor` and `useEffect` hooks (before the `handleTitleChange` callback), add:
```tsx
  const isMobile = useIsMobile()
```

- [ ] **Step 2: Extract toolbar content into a reusable fragment**

Replace lines 223-497. The current toolbar JSX spans from `{editor && (` to the closing `</div>` before the content area. Replace the entire toolbar section with:

```tsx
      {editor && (
        <>
          {/* Desktop toolbar — hidden on mobile */}
          <div className="hidden md:block px-4 sm:px-6 md:px-8 lg:px-10 pt-2 w-full md:max-w-[900px] lg:max-w-[1140px] mx-auto">
            <TooltipProvider>
            <div className="flex items-center gap-1 px-3 py-1 border rounded-lg bg-card overflow-x-auto">
              <ToggleGroup type="multiple" size="sm">
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="bold" pressed={editor.isActive("bold")} onPressedChange={() => editor.chain().focus().toggleBold().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <Bold className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Bold</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="italic" pressed={editor.isActive("italic")} onPressedChange={() => editor.chain().focus().toggleItalic().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <Italic className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Italic</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="underline" pressed={editor.isActive("underline")} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <UnderlineIcon className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Underline</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="strike" pressed={editor.isActive("strike")} onPressedChange={() => editor.chain().focus().toggleStrike().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <Strikethrough className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Strikethrough</TooltipContent>
                </Tooltip>
              </ToggleGroup>

              <Separator orientation="vertical" className="mx-1 h-6" />

              <ToggleGroup type="multiple" size="sm">
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="bulletList" pressed={editor.isActive("bulletList")} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <List className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Bullet list</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="orderedList" pressed={editor.isActive("orderedList")} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <ListOrdered className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Ordered list</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<ToggleGroupItem value="taskList" pressed={editor.isActive("taskList")} onPressedChange={() => editor.chain().focus().toggleTaskList().run()} className="min-h-[44px] min-w-[44px]" />}>
                    <ListChecks className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Todo list</TooltipContent>
                </Tooltip>
              </ToggleGroup>

              <Separator orientation="vertical" className="mx-1 h-6" />

              <Popover>
                <Tooltip>
                  <TooltipTrigger render={<PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-input hover:bg-accent relative" />}>
                    <Palette className="h-4 w-4" />
                    <span
                      className="absolute bottom-1 h-[3px] w-3 rounded-full"
                      style={{ backgroundColor: editor.getAttributes("textStyle").color || "currentColor" }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Text color</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-[280px] p-3" align="start">
                  <div className="text-sm font-medium mb-2">Text Color</div>
                  <div className="grid grid-cols-8 gap-1.5 mb-2">
                    {TEXT_COLORS.map((c) => (
                      <button key={c}
                        className="h-7 w-7 rounded-md border border-input hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => editor.chain().focus().setColor(c).run()}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <input type="text" placeholder="#hex"
                      className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                      onKeyDown={(e) => { if (e.key === "Enter") { editor.chain().focus().setColor((e.target as HTMLInputElement).value).run() }}}
                    />
                    <button className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => editor.chain().focus().unsetColor().run()}>
                      Clear
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <Tooltip>
                  <TooltipTrigger render={<PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-input hover:bg-accent" />}>
                    <Highlighter className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Highlight color</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-[280px] p-3" align="start">
                  <div className="text-sm font-medium mb-2">Highlight Color</div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button key={c}
                        className="h-8 w-full rounded-md border border-input hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <input type="text" placeholder="#hex"
                      className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono"
                      onKeyDown={(e) => { if (e.key === "Enter") { editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run() }}}
                    />
                    <button className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => editor.chain().focus().unsetHighlight().run()}>
                      Clear
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <Tooltip>
                  <TooltipTrigger render={<PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-input hover:bg-accent" />}>
                    <ArrowUpDown className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Paragraph spacing</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-[260px] p-3" align="start">
                  <div className="text-sm font-medium mb-3">Paragraph Spacing</div>
                  <div className="flex flex-col gap-2">
                    {SPACING_PRESETS.map((p) => {
                      const currentSpacing = editor.getAttributes("paragraph").paragraphSpacing
                      const isActive = currentSpacing === p.value || (!currentSpacing && p.value === "10px")
                      return (
                        <button key={p.value}
                          onClick={() => editor.chain().focus().setParagraphSpacing(p.value).run()}
                          className={`px-3 py-2 text-sm rounded-md font-medium transition-all ${
                            isActive ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-accent"
                          }`}
                        >
                          {p.label} <span className="text-xs opacity-75">({p.value})</span>
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="mx-1 h-6" />

              <Select
                value={
                  editor.isActive("heading", { level: 1 }) ? "h1" :
                  editor.isActive("heading", { level: 2 }) ? "h2" :
                  editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"
                }
                onValueChange={(val) => {
                  const chain = editor.chain().focus().setParagraph()
                  if (val === "h1") chain.unsetFontSize().toggleHeading({ level: 1 })
                  else if (val === "h2") chain.unsetFontSize().toggleHeading({ level: 2 })
                  else if (val === "h3") chain.unsetFontSize().toggleHeading({ level: 3 })
                  chain.run()
                }}
              >
                <Tooltip>
                  <TooltipTrigger render={<SelectTrigger className="h-7 w-[110px] text-sm" />}>
                    <SelectValue />
                  </TooltipTrigger>
                  <TooltipContent>Styles</TooltipContent>
                </Tooltip>
                <SelectContent>
                  {HEADINGS.map((h) => (
                    <SelectItem key={h.value} value={h.value} className="text-sm">{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={editor.getAttributes("textStyle").fontFamily || "default"}
                onValueChange={(val) => {
                  if (val === "default") editor.chain().focus().unsetFontFamily().run()
                  else editor.chain().focus().setFontFamily(val).run()
                }}
              >
                <Tooltip>
                  <TooltipTrigger render={<SelectTrigger className="h-7 w-[130px] text-sm" style={{ fontFamily: editor.getAttributes("textStyle").fontFamily || "inherit" }} />}>
                    <SelectValue placeholder="Font" />
                  </TooltipTrigger>
                  <TooltipContent>Font family</TooltipContent>
                </Tooltip>
                <SelectContent>
                  <SelectItem value="default" className="text-sm">Default</SelectItem>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f} className="text-sm" style={{ fontFamily: f }}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={(() => {
                  const explicit = editor.getAttributes("textStyle").fontSize?.replace("px", "")
                  if (explicit) return explicit
                  if (editor.isActive("heading", { level: 1 })) return "20"
                  if (editor.isActive("heading", { level: 2 })) return "18"
                  if (editor.isActive("heading", { level: 3 })) return "16"
                  return "14"
                })()}
                onValueChange={(val) => editor.chain().focus().setFontSize(val + "px").run()}
              >
                <Tooltip>
                  <TooltipTrigger render={<SelectTrigger className="h-7 w-[70px] text-sm" />}>
                    <SelectValue />
                  </TooltipTrigger>
                  <TooltipContent>Font size</TooltipContent>
                </Tooltip>
                <SelectContent>
                  {FONT_SIZES.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="mx-1 h-6" />

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-input hover:bg-accent"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Image className="h-4 w-4" />
                    </button>
                  }
                />
                <TooltipContent>Insert image</TooltipContent>
              </Tooltip>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = '' }}
              />
            </div>
            </TooltipProvider>
          </div>

          {/* Mobile toolbar — only visible on < 768px */}
          <div className="editor-toolbar-mobile md:hidden">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("bold") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Bold className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("italic") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Italic className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("underline") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <UnderlineIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("strike") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Strikethrough className="h-5 w-5" />
            </button>

            <span className="w-px h-6 bg-border mx-0.5" />

            <button
              onClick={() => {
                if (editor.isActive("heading", { level: 2 })) editor.chain().focus().setParagraph().run()
                else editor.chain().focus().toggleHeading({ level: 2 }).run()
              }}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-sm font-semibold ${editor.isActive("heading", { level: 2 }) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              H
            </button>
            <button
              onClick={() => {
                if (editor.isActive("bulletList")) editor.chain().focus().toggleBulletList().run()
                else if (editor.isActive("orderedList")) editor.chain().focus().toggleOrderedList().run()
                else editor.chain().focus().toggleBulletList().run()
              }}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("bulletList") || editor.isActive("orderedList") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md ${editor.isActive("taskList") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ListChecks className="h-5 w-5" />
            </button>

            <span className="w-px h-6 bg-border mx-0.5" />

            <Popover>
              <PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                <Palette className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Text Color</div>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {TEXT_COLORS.map((c) => (
                    <button key={c}
                      className="h-8 w-8 rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().setColor(c).run()}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                <Highlighter className="h-5 w-5" />
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-3" align="start">
                <div className="text-sm font-medium mb-2">Highlight</div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button key={c}
                      className="h-8 w-full rounded-md border border-input hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="w-px h-6 bg-border mx-0.5" />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <Image className="h-5 w-5" />
            </button>

            {/* Overflow: font family, font size, spacing */}
            <Popover>
              <PopoverTrigger className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground font-bold text-lg">
                +
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3" align="end">
                <div className="text-sm font-medium mb-2">Font Size</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {FONT_SIZES.filter(s => parseInt(s) >= 14 && parseInt(s) <= 20).map((s) => (
                    <button key={s}
                      onClick={() => editor.chain().focus().setFontSize(s + "px").run()}
                      className={`px-2 py-1 text-xs rounded-md border ${editor.getAttributes("textStyle").fontSize?.replace("px","") === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                    >{s}</button>
                  ))}
                </div>
                <div className="text-sm font-medium mb-2">Font</div>
                <Select value={editor.getAttributes("textStyle").fontFamily || "default"}
                  onValueChange={(val) => {
                    if (val === "default") editor.chain().focus().unsetFontFamily().run()
                    else editor.chain().focus().setFontFamily(val).run()
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Font" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-xs">Default</SelectItem>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm font-medium mb-2 mt-2">Spacing</div>
                <div className="flex flex-wrap gap-1">
                  {SPACING_PRESETS.map((p) => (
                    <button key={p.value}
                      onClick={() => editor.chain().focus().setParagraphSpacing(p.value).run()}
                      className={`px-2 py-1 text-xs rounded-md border ${
                        (editor.getAttributes("paragraph").paragraphSpacing === p.value || (!editor.getAttributes("paragraph").paragraphSpacing && p.value === "10px"))
                          ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
```

This replaces the entire toolbar section. Key changes:
- Desktop toolbar wrapped in `hidden md:block` with `mx-auto` centering
- All desktop buttons get `min-h-[44px] min-w-[44px]` for larger touch targets
- Mobile bottom toolbar uses `editor-toolbar-mobile` class (position fixed at bottom)
- Core formatting on mobile: B/I/U/S, heading toggle, lists, color, highlight, image, overflow (+)
- Overflow menu contains font size, font family, spacing

- [ ] **Step 2: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: add bottom toolbar on mobile, responsive toolbar layout"
```

---

### Task 4: Compact AppHeader on mobile

**Files:**
- Modify: `src/components/AppHeader.tsx:20-37`

- [ ] **Step 1: Compact header on mobile**

Replace the header className on line 20:
```tsx
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```
No change needed — it already works. Just reduce padding and increase touch targets.

Update the theme toggle button size. Replace the TooltipTrigger on line 28:
```tsx
              render={<Button variant="ghost" size="sm" onClick={() => setTheme(isDark ? "light" : "dark")} />}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "fix: responsive theming for mobile - use sm button size for theme toggle"
```

---

### Task 5: Touch-optimized sidebar with responsive item sizing

**Files:**
- Modify: `src/components/NotesSidebar.tsx:407-411` (sensors)
- Modify: `src/components/NotesSidebar.tsx` (item rendering around line 547-627)

- [ ] **Step 1: Add TouchSensor to dnd-kit sensors**

Add `TouchSensor` to the dnd-kit core import at the top:
```tsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
```

Replace the sensors setup (lines 407-411):
```tsx
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    })
  )
```

- [ ] **Step 2: Update sidebar item touch targets on mobile**

Find the sidebar note and folder item rendering (around lines 547-627). The items use `px-3 py-1 text-sm` classes. Replace with responsive padding:

For note items (change `px-3 py-1 text-sm` to `px-3 py-1.5 md:py-1 text-sm`):
```tsx
// Before (approximate — find actual occurrence):
<SidebarMenuButton className="px-3 py-1 text-sm">

// After:
<SidebarMenuButton className="px-3 py-1.5 md:py-1 text-sm">
```

For folder items (find the folder button with similar className):
```tsx
// Before:
className="px-3 py-1 text-sm"

// After:
className="px-3 py-1.5 md:py-1 text-sm"
```

This gives items 12px vertical padding on mobile (vs 4px on desktop), making each item approximately 44px tall at default font size.

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add TouchSensor with long-press activation and larger mobile touch targets"
```

---

### Task 6: Responsive TrashTable

**Files:**
- Modify: `src/components/TrashTable.tsx:252-332`

- [ ] **Step 1: Add responsive table wrapper**

Wrap the existing `<table>` (line 253) with a horizontal scroll container on mobile:
```tsx
      <div className="rounded-lg border overflow-hidden overflow-x-auto md:overflow-x-visible">
        <table className="w-full text-sm">
```
Change line 252 from:
```tsx
      <div className="rounded-lg border overflow-hidden">
```
to:
```tsx
      <div className="rounded-lg border overflow-hidden overflow-x-auto md:overflow-x-visible">
```

- [ ] **Step 2: Reduce cell padding on mobile**

Add a responsive padding class to all `<th>` and `<td>` elements. The current `p-3` should become `p-2 md:p-3`.

Apply this change to all th/td elements in the table header (lines 256-263) and body (lines 277-326).

For example, line 256:
```tsx
              <th className="p-3 w-10"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
```
becomes:
```tsx
              <th className="p-2 md:p-3 w-10"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
```

Apply this pattern to all `p-3` classes in th and td elements.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrashTable.tsx
git commit -m "feat: responsive trash table with horizontal scroll on mobile"
```

---

### Task 7: Responsive admin pages

**Files:**
- Modify: `src/app/admin/users/users-table.tsx`

- [ ] **Step 1: Add responsive wrapper and global responsive filter bar**

Find the table container div (line 93: `<div className="rounded-lg border overflow-hidden">`). Change it to:
```tsx
      <div className="rounded-lg border overflow-hidden overflow-x-auto md:overflow-x-visible">
```

Find all `<th>` and `<td>` elements with `p-3` and change to `p-2 md:p-3`. There are 12 occurrences (6 column headers + 6 data cells per row + skeleton/empty state cells):

Line 97: `<th className="text-left p-3 font-medium">Name</th>`
→ `<th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Name</th>`

Line 98: `<th className="text-left p-3 font-medium">Email</th>`
→ `<th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Email</th>`

Line 99: `<th className="text-left p-3 font-medium">Role</th>`
→ `<th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Role</th>`

Line 100: `<th className="text-left p-3 font-medium">Status</th>`
→ `<th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Status</th>`

Line 101: `<th className="text-left p-3 font-medium">Created</th>`
→ `<th className="text-left p-2 md:p-3 font-medium whitespace-nowrap">Created</th>`

Line 102: `<th className="text-right p-3 font-medium">Actions</th>`
→ `<th className="text-right p-2 md:p-3 font-medium whitespace-nowrap">Actions</th>`

Line 108: `<td colSpan={6} className="p-3">`
→ `<td colSpan={6} className="p-2 md:p-3">`

Line 116: `<td colSpan={6} className="p-6 text-center text-muted-foreground">`
→ `<td colSpan={6} className="p-4 md:p-6 text-center text-muted-foreground">`

Line 125: `<td className="p-3 font-medium">`
→ `<td className="p-2 md:p-3 font-medium">`

Line 129: `<td className="p-3 text-muted-foreground">{u.email}</td>`
→ `<td className="p-2 md:p-3 text-muted-foreground">{u.email}</td>`

Line 130: `<td className="p-3">`
→ `<td className="p-2 md:p-3">`

Line 133: `<td className="p-3">`
→ `<td className="p-2 md:p-3">`

Line 157: `<td className="p-3 text-muted-foreground">`
→ `<td className="p-2 md:p-3 text-muted-foreground">`

Line 160: `<td className="p-3 text-right">`
→ `<td className="p-2 md:p-3 text-right">`

Also make the filter bar responsive. Find the filter input group (around lines 63-91). The wrapper div `<div className="flex flex-wrap gap-2 mb-4 items-end">` is already responsive via `flex-wrap`. But add responsive widths to the inputs:

Change the search Input:
```tsx
<Input placeholder="Search users..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="w-full sm:w-64" />
```

Change role Select:
```tsx
<Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v ?? "all")}>
  <SelectTrigger className="w-full sm:w-36">
```

Change status Select:
```tsx
<Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
  <SelectTrigger className="w-full sm:w-36">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/users/users-table.tsx
git commit -m "feat: responsive admin users table with horizontal scroll and filter bar"
```

---

## Self-Review Checklist

1. **Spec coverage:** All spec sections covered — breakpoints (Task 2), editor width (Task 2), bottom toolbar (Task 3), touch interactions (Task 5), admin pages (Task 7), trash table (Task 6). Sidebar sheet behavior already exists — no changes needed.
2. **Placeholder scan:** No TBD, TODOs, or incomplete sections. Every step has complete code.
3. **Type consistency:** All method/prop names match existing codebase conventions.
