# Todo Checkbox List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shadcn-styled todo checkbox list to the TipTap editor with a toolbar button next to the ordered list button.

**Architecture:** Install `@tiptap/extension-task-list` and `@tiptap/extension-task-item`, create a custom `TaskItem` extension override for shadcn checkbox rendering, add to the editor extensions array, insert a toolbar button between ordered list and the next separator, add CSS for the task list layout.

**Tech Stack:** TipTap v3, shadcn/ui, lucide-react, Next.js 16, Tailwind v4

**Note:** Work on a feature branch — do NOT commit to main.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [x] **Install `@tiptap/extension-task-list` and `@tiptap/extension-task-item`**

```bash
npm install @tiptap/extension-task-list@^3.27.1 @tiptap/extension-task-item@^3.27.1 --legacy-peer-deps
```

- [x] **Create feature branch**

```bash
git checkout -b feature/todo-checkbox-list
```

---

### Task 2: Create Custom TaskItem Extension

**Files:**
- Create: `src/extensions/TaskItem.ts`

- [x] **Write the custom TaskItem extension**

Overrides `renderHTML` for serialized output and `addNodeView` for in-editor DOM:

```ts
import { getRenderedAttributes } from '@tiptap/core';
import { TaskItem } from '@tiptap/extension-task-item';

export const CustomTaskItem = TaskItem.extend({
  renderHTML({ node, HTMLAttributes }) { /* ... */ },
  addNodeView() { /* ... */ },
});
```

**Key design decisions:**
- SVG created once during node view init; visibility toggled via CSS (`display: none/block` on `data-checked`).
- Click handler reads `listItem.dataset.checked` (avoids stale closure).
- Uses `tr.setNodeMarkup(position, ...)` for toggle instead of `toggleTaskList`.
- Attribute reconciliation in `update()` preserves static HTMLAttributes.

---

### Task 3: Add Extensions to Editor

**Files:**
- Modify: `src/components/MainArea.tsx`

- [x] **Add imports for TaskList and CustomTaskItem**

```ts
import TaskList from "@tiptap/extension-task-list"
import { CustomTaskItem } from "@/extensions/TaskItem"
```

- [x] **Add TaskList and CustomTaskItem to the extensions array**

```ts
TaskList,
CustomTaskItem.configure({ nested: true }),
```

---

### Task 4: Add Toolbar Button

**Files:**
- Modify: `src/components/MainArea.tsx`

- [x] **Import ListChecks icon**

Add `ListChecks` to the lucide-react import.

- [x] **Add toolbar button after ordered list button**

Between ordered list Tooltip and the closing `</ToggleGroup>`, insert:

```tsx
<Tooltip>
  <TooltipTrigger render={<ToggleGroupItem value="taskList" pressed={editor.isActive("taskList")} onPressedChange={() => editor.chain().focus().toggleTaskList().run()} className="h-8 w-8" />}>
    <ListChecks className="h-4 w-4" />
  </TooltipTrigger>
  <TooltipContent>Todo list</TooltipContent>
</Tooltip>
```

---

### Task 5: Add CSS for Task List

**Files:**
- Modify: `src/app/globals.css`

- [x] **Add task list CSS rules**

See design spec for full CSS. Key rules:
- Flex layout for task items (label + content).
- Checkbox: 16×16px, `grid place-content-center`, 1px `border-primary`, shadow.
- Checked: `bg-primary`, `text-primary-foreground`, border stays primary.
- SVG visibility toggled via `display: none/block` on `[data-checked="true"]`.
- `!important` override for ParagraphSpacing inline styles.
- Color variables used directly as `var(--primary)` (not `hsl()` wrapper).

---

### Task 6: Verify

- [x] **Start the dev server and test**

1. Create/open a note
2. Click the new todo list button (ListChecks icon) in the toolbar
3. Type items, press Enter to add more
4. Click checkboxes to toggle state
5. Verify unchecked items have empty bordered square (primary border, transparent bg)
6. Verify checked items show filled primary background with white checkmark
7. Verify Tab/Shift+Tab indentation works for nested items
8. Verify no console errors
9. Verify build passes (`npm run build`)

### Bugs Found & Fixed

- [x] **renderSpec error**: `null` in DOMOutputSpec → use `[]` instead.
- [x] **Stale closure**: captured `node.attrs.checked` → read `listItem.dataset.checked`.
- [x] **Spacing change on toggle**: `innerHTML` DOM mutations → CSS-only SVG visibility.
- [x] **data-checked always present**: `dataset.checked = undefined` → `setAttribute`/`removeAttribute`.
- [x] **Invalid color function**: `hsl(var(--primary))` with OKLCH values → `var(--primary)` directly.
