# Editor Typography Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce font sizes in the ProseMirror editor (container 16px→14px, h1 30px→20px, h2 24px→18px, h3 20px→16px, note title 30px→21px, line-height 1.8→1.6)

**Architecture:** Two files — `globals.css` contains all ProseMirror typography rules; `MainArea.tsx` has the note title input styling.

**Tech Stack:** CSS, Tailwind, Next.js

---

### Task 1: Update ProseMirror typography in globals.css

**Files:**
- Modify: `src/app/globals.css:130-150`

- [ ] **Step 1: Update container and heading styles**

Change:
```css
.ProseMirror {
  outline: none;
  min-height: 200px;
  line-height: 1.8;
  font-size: 16px;
  max-width: 1140px;
  color: inherit;
  font-family: inherit;
}
.ProseMirror h1 { font-size: 1.875rem; font-weight: 600; letter-spacing: -0.025em; line-height: 1.25; margin: 0 0 0.5rem 0; }
.ProseMirror h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; line-height: 1.25; margin: 0 0 0.4rem 0; }
.ProseMirror h3 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.025em; line-height: 1.25; margin: 0 0 0.3rem 0; }
```

To:
```css
.ProseMirror {
  outline: none;
  min-height: 200px;
  line-height: 1.6;
  font-size: 14px;
  max-width: 1140px;
  color: inherit;
  font-family: inherit;
}
.ProseMirror h1 { font-size: 20px; font-weight: 600; line-height: 1.25; margin: 0 0 0.5rem 0; }
.ProseMirror h2 { font-size: 18px; font-weight: 600; line-height: 1.25; margin: 0 0 0.4rem 0; }
.ProseMirror h3 { font-size: 16px; font-weight: 600; line-height: 1.25; margin: 0 0 0.3rem 0; }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: reduce ProseMirror typography scale (container 14px, h1 20px, h2 18px, h3 16px, line-height 1.6)"
```

### Task 2: Update note title input size

**Files:**
- Modify: `src/components/MainArea.tsx:414`

- [ ] **Step 1: Update note title className**

Change:
```tsx
className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight border-0 shadow-none px-0 h-auto focus-visible:ring-0"
```

To:
```tsx
className="text-[21px] font-semibold leading-tight border-0 shadow-none px-0 h-auto focus-visible:ring-0"
```

- `text-3xl` → `text-[21px]` (21px isn't a standard Tailwind token)
- `tracking-tight` removed (letter-spacing not needed)
- `md:text-3xl` removed (no responsive variant needed)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: reduce note title to 21px, remove tracking-tight"
```
