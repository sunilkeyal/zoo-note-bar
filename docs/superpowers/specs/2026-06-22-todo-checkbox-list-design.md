# Todo Checkbox List — Design Spec

## Summary

Add a task/checkbox list feature to the TipTap rich text editor in the note-taking app, using TipTap's built-in TaskList and TaskItem extensions with shadcn/ui styling.

## Visual Style

- Uses the **Standard (Radix)** shadcn checkbox styling: `h-4 w-4` (16×16px), `grid place-content-center`, `rounded-sm`, `border border-primary`, `shadow`.
- Unchecked: transparent background, 1px `border-primary`.
- Checked: `bg-primary` (filled), `text-primary-foreground` white checkmark, border stays `primary`.
- Checkmark: SVG polyline checkmark matching lucide `Check` icon at 16px (`h-4 w-4`), always rendered in DOM, visibility toggled via CSS `display: none/block` based on `data-checked="true"`.
- No strikethrough or muted text on checked items.

## Implementation

### Dependencies

Install:
- `@tiptap/extension-task-list` (^3.27.1)
- `@tiptap/extension-task-item` (^3.27.1)

### Extensions

Add to the `useEditor` extensions array in `MainArea.tsx`:

```ts
import TaskList from "@tiptap/extension-task-list"
import { CustomTaskItem } from "@/extensions/TaskItem"
```

```ts
TaskList,
CustomTaskItem.configure({ nested: true }),
```

### Custom TaskItem Extension

Located at `src/extensions/TaskItem.ts`. Extends `@tiptap/extension-task-item` with two overrides:

**`renderHTML`** — serializes the node to HTML for `getHTML()` output:

```ts
renderHTML({ node, HTMLAttributes }) {
  const checked = node.attrs.checked as boolean;
  const svgContent = checked ? [['svg', { xmlns, viewBox, fill, stroke, class: 'h-4 w-4' }, ['polyline', ...]]] : [];
  return [
    'li',
    { ...HTMLAttributes, 'data-type': 'taskItem' },
    ['label', ['span', { class: 'task-checkbox', 'data-checked': checked ? 'true' : undefined }, ...svgContent]],
    ['div', { class: 'task-content' }, 0],
  ];
}
```

**`addNodeView`** — renders the in-editor DOM. Creates the SVG once during init; visibility toggled via CSS, not DOM mutations:

- SVG created once, appended to `.task-checkbox` span.
- `updateCheckbox(checked)` sets/removes `data-checked` attribute on span (no innerHTML changes).
- Click handler reads `listItem.dataset.checked` (not captured `node.attrs`) to avoid stale closures.
- Uses `editor.chain().focus().command(({ tr }) => tr.setNodeMarkup(...))` for toggle.
- `update()` method syncs `data-checked` on both the li and span, plus attribute reconciliation via `getRenderedAttributes`.
- `contentEditable = 'false'` on the label wrapper prevents cursor from entering the checkbox.
- Prevents default on `mousedown` to avoid selection changes.

### Toolbar Button

- **Location:** Between the ordered list button and the next separator in the toolbar.
- **Icon:** `ListChecks` from `lucide-react`
- **Command:** `editor.chain().focus().toggleTaskList().run()`
- **Active state:** `editor.isActive("taskList")`
- **Tooltip text:** "Todo list"
- Follows the exact same `<Tooltip>` + `<TooltipTrigger>` + `<ToggleGroupItem>` pattern as the existing list buttons.

### CSS (`globals.css`)

```css
/* Task list reset */
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

/* Task item flex layout */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 4px 0;
}

/* Checkbox label (non-editable click target) */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] > label {
  flex-shrink: 0;
  cursor: pointer;
  margin-top: 1px;
}

/* Content area */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] > .task-content {
  flex: 1;
  min-width: 0;
}

/* Checkbox span — matches standard shadcn (Radix) */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-checkbox {
  display: grid;
  place-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: calc(var(--radius) - 4px);
  border: 1px solid;
  border-color: var(--primary);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  background: transparent;
  cursor: pointer;
  transition: background-color 150ms, border-color 150ms, color 150ms;
}

/* Checked state */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-checkbox[data-checked="true"] {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

/* SVG checkmark visibility */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-checkbox svg {
  display: none;
}
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-checkbox[data-checked="true"] svg {
  display: block;
}

/* Content paragraph margin reset */
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-content p {
  margin: 0;
}
.ProseMirror ul[data-type="taskList"] li[data-type="taskItem"] .task-content p[style] {
  margin: 0 !important;
}
```

Key notes:
- Color variables (`--primary`, `--primary-foreground`) use OKLCH values — referenced directly as `var(--primary)`, not wrapped in `hsl()`, to avoid invalid CSS.
- `border` shorthand is split (`border: 1px solid; border-color: var(--primary)`) to work with OKLCH custom properties.
- The `!important` override on `p[style]` prevents ParagraphSpacing extension inline styles from affecting task item layout.

### Data Format

Content is stored as TipTap JSON/HTML — the TaskList extension handles serialization automatically. No database schema changes needed.

## Bug Fixes (discovered during implementation)

| Bug | Fix |
|---|---|
| `renderSpec` error (`null` child in DOMOutputSpec) | Use spread empty array `[]` instead of `null` for unchecked state |
| Stale closure in click handler | Read `listItem.dataset.checked` instead of captured `node.attrs.checked` |
| `data-checked` always present on span | Use `setAttribute('data-checked', 'true')` / `removeAttribute('data-checked')` — `dataset.checked = undefined` sets the string `"undefined"` |
| Spacing change when toggling | CSS-only SVG visibility (create SVG once, `display: none/block`) instead of DOM mutations (innerHTML) |

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `@tiptap/extension-task-list`, `@tiptap/extension-task-item` |
| `src/extensions/TaskItem.ts` | New file — custom TaskItem extension with renderHTML + addNodeView |
| `src/components/MainArea.tsx` | Add extensions, import, and toolbar button |
| `src/app/globals.css` | Add task list CSS rules |
