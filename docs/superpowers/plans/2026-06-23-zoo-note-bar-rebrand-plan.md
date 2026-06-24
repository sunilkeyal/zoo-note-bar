# ZooNoteBar Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the application from VertexNote to ZooNoteBar across all source files, and remove all Docker infrastructure.

**Architecture:** Pure string replacement across 7 source files + 4 file deletions. No logic changes, no build configuration changes, no database migrations. Feature branch off main.

**Tech Stack:** Node.js, Next.js, TypeScript, MongoDB

---

### Task 1: Create feature branch

**Files:** none

- [ ] **Step 1: Create and switch to feature branch**

Run:
```powershell
git checkout -b rebrand-to-zoo-note-bar
```

Expected: `Switched to a new branch 'rebrand-to-zoo-note-bar'`

### Task 2: Update package.json name

**Files:**
- Modify: `package.json:2`

- [ ] **Step 1: Change name field**

Edit `package.json` line 2: replace `"name": "vertexnote"` with `"name": "zoo-note-bar"`.

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern '"name"' package.json`
Expected: `"name": "zoo-note-bar"`

### Task 3: Update root layout metadata

**Files:**
- Modify: `src/app/layout.tsx:10-12`

- [ ] **Step 1: Replace title, description, icon path**

Edit `src/app/layout.tsx`:
- Change `title: "VertexNote"` → `title: "ZooNoteBar"`
- Change `description: "VertexNote — your personal notes workspace"` → `description: "ZooNoteBar — your personal notes workspace"`
- Change `icon: '/vertexnote.png'` → `icon: '/ZooNoteBar.png'`

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'VertexNote|vertexnote' src/app/layout.tsx`
Expected: No matches

### Task 4: Update sidebar header

**Files:**
- Modify: `src/components/NotesSidebar.tsx:460-461`

- [ ] **Step 1: Replace logo src, alt text, and display name**

Edit `src/components/NotesSidebar.tsx`:
- Change `src="/vertexnote.png"` → `src="/ZooNoteBar.png"`
- Change `alt="VertexNote"` → `alt="ZooNoteBar"`
- Change `<span class="...">VertexNote</span>` → `<span class="...">ZooNoteBar</span>`

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'VertexNote|vertexnote' src/components/NotesSidebar.tsx`
Expected: No matches

### Task 5: Update login page logo

**Files:**
- Modify: `src/app/login/page.tsx:41`

- [ ] **Step 1: Replace logo alt and src**

Edit `src/app/login/page.tsx`:
- Change `src="/vertexnote.png"` → `src="/ZooNoteBar.png"`
- Change `alt="VertexNote"` → `alt="ZooNoteBar"`

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'VertexNote|vertexnote' src/app/login/page.tsx`
Expected: No matches

### Task 6: Update signup page logo

**Files:**
- Modify: `src/app/signup/page.tsx:46`

- [ ] **Step 1: Replace logo alt and src**

Edit `src/app/signup/page.tsx`:
- Change `src="/vertexnote.png"` → `src="/ZooNoteBar.png"`
- Change `alt="VertexNote"` → `alt="ZooNoteBar"`

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'VertexNote|vertexnote' src/app/signup/page.tsx`
Expected: No matches

### Task 7: Update admin settings display name

**Files:**
- Modify: `src/app/admin/settings/page.tsx:10`

- [ ] **Step 1: Replace application name**

Edit `src/app/admin/settings/page.tsx`:
- Change `VertexNote` → `ZooNoteBar` (the value in the display div)

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'VertexNote|vertexnote' src/app/admin/settings/page.tsx`
Expected: No matches

### Task 8: Update MongoDB default URI

**Files:**
- Modify: `src/lib/mongodb.ts:3`

- [ ] **Step 1: Replace database name in default URI**

Edit `src/lib/mongodb.ts`:
- Change `mongodb://localhost:27017/notes-app` → `mongodb://localhost:27017/zoo-note-bar`

- [ ] **Step 2: Verify**

Run: `Select-String -Pattern 'notes-app' src/lib/mongodb.ts`
Expected: No matches

### Task 9: Delete Docker infrastructure and old logo

**Files:**
- Delete: `Dockerfile`
- Delete: `docker-compose.yml`
- Delete: `.dockerignore`
- Delete: `public/vertexnote.png`

- [ ] **Step 1: Remove files**

Run:
```powershell
Remove-Item -LiteralPath "Dockerfile" -ErrorAction Stop
Remove-Item -LiteralPath "docker-compose.yml" -ErrorAction Stop
Remove-Item -LiteralPath ".dockerignore" -ErrorAction Stop
Remove-Item -LiteralPath "public/vertexnote.png" -ErrorAction Stop
```

- [ ] **Step 2: Verify deletions**

Run: `Test-Path "Dockerfile"; Test-Path "docker-compose.yml"; Test-Path ".dockerignore"; Test-Path "public/vertexnote.png"`
Expected: All return `False`

### Task 10: Refresh lockfile and verify build

**Files:** none

- [ ] **Step 1: Run npm install to sync lockfile with renamed package**

Run: `npm install`
Expected: No errors. `package-lock.json` auto-updates.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

### Task 11: Commit

**Files:** none

- [ ] **Step 1: Stage and commit**

Run:
```powershell
git add -A
git commit -m "feat: rebrand VertexNote to ZooNoteBar, remove Docker infrastructure"
```

Expected: Commit created on `rebrand-to-zoo-note-bar` branch.

### Task 12: Final verification

- [ ] **Step 1: Confirm no stale references remain**

Run: `rg -i "vertexnote|notes-app" --glob '!docs/**' --glob '!node_modules/**' --glob '!.git/**' --glob '!package-lock.json'`
Expected: No matches
