# Workspace Trash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add soft-delete trash functionality with batch restore/permanent delete, auto-purge after 7 days, and cross-user admin view.

**Architecture:** Add `isDeleted`/`deletedAt` fields to existing Note/Folder types. Modify DELETE endpoints to soft-delete instead of hard-delete. Add new API routes for trash listing, batch restore, and batch permanent delete. Use MongoDB TTL indexes for auto-purge. New `TrashTable` component with type-badge visual distinction and smart selection locking.

**Tech Stack:** Next.js 16 App Router, MongoDB 6, TypeScript, shadcn/ui (Base UI), Tailwind CSS v4

---

### Task 1: Update TypeScript types with trash fields

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `isDeleted` and `deletedAt` to Note and Folder interfaces**

Edit `src/types/index.ts` to add optional trash fields:

```typescript
export interface Note {
  _id: string
  title: string
  content: string
  folderId?: string
  userId?: string
  position: number
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  deletedAt?: string
}

export interface Folder {
  _id: string
  name: string
  userId?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  deletedAt?: string
}
```

Also add new types for batch trash operations:

```typescript
export interface TrashRestoreRequest {
  noteIds: string[]
  folderIds: string[]
}

export interface TrashDeleteRequest {
  noteIds: string[]
  folderIds: string[]
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add isDeleted and deletedAt fields to Note and Folder types"
```

---

### Task 2: Add MongoDB TTL and query indexes

**Files:**
- Modify: `src/lib/mongodb.ts`

- [ ] **Step 1: Add index creation calls in `connectToDatabase`**

After the existing `passwordResetTokens` index, add:

```typescript
await db.collection("notes").createIndex(
  { deletedAt: 1 },
  { expireAfterSeconds: 604800, background: true }
).catch(() => {})

await db.collection("folders").createIndex(
  { deletedAt: 1 },
  { expireAfterSeconds: 604800, background: true }
).catch(() => {})

await db.collection("notes").createIndex(
  { userId: 1, isDeleted: 1 },
  { background: true }
).catch(() => {})

await db.collection("folders").createIndex(
  { userId: 1, isDeleted: 1 },
  { background: true }
).catch(() => {})
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mongodb.ts
git commit -m "feat: add TTL and query indexes for trash functionality"
```

---

### Task 3: Soft-delete notes — modify DELETE endpoint

**Files:**
- Modify: `src/app/api/notes/[id]/route.ts`

- [ ] **Step 1: Change DELETE handler from hard-delete to soft-delete**

Replace the current implementation that does `collection.deleteOne()` with:

```typescript
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const result = await collection.updateOne(
    { _id: objectId, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/[id]/route.ts
git commit -m "feat: soft-delete notes instead of hard-delete"
```

---

### Task 4: Soft-delete folders — modify DELETE endpoint

**Files:**
- Modify: `src/app/api/folders/[id]/route.ts`

- [ ] **Step 1: Change DELETE handler to soft-delete folder AND all notes inside**

Replace the current `deleteOne`/`deleteMany` with:

```typescript
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const notesCollection = db.collection("notes")
  const now = new Date()

  const folderResult = await foldersCollection.updateOne(
    { _id: objectId, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: now } }
  )

  if (folderResult.matchedCount === 0) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const notesResult = await notesCollection.updateMany(
    { folderId: id, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: now } }
  )

  return NextResponse.json({
    success: true,
    data: { deletedFolder: id, softDeletedNotesCount: notesResult.modifiedCount },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/folders/[id]/route.ts
git commit -m "feat: soft-delete folders and their notes"
```

---

### Task 5: Add `isDeleted` filter to GET endpoints

**Files:**
- Modify: `src/app/api/notes/route.ts` (GET)
- Modify: `src/app/api/folders/route.ts` (GET)

- [ ] **Step 1: Add `isDeleted: { $ne: true }` to notes GET query**

In `src/app/api/notes/route.ts`, change the `find` filter from:
```typescript
const notes = await collection
  .find({ userId: session.user.id })
```
to:
```typescript
const notes = await collection
  .find({ userId: session.user.id, isDeleted: { $ne: true } })
```

- [ ] **Step 2: Add `isDeleted: { $ne: true }` to folders GET query**

In `src/app/api/folders/route.ts`, change the `find` filter from:
```typescript
const folders = await collection
  .find({ userId: session.user.id })
```
to:
```typescript
const folders = await collection
  .find({ userId: session.user.id, isDeleted: { $ne: true } })
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/route.ts src/app/api/folders/route.ts
git commit -m "feat: exclude soft-deleted items from active queries"
```

---

### Task 6: Create trash listing API

**Files:**
- Create: `src/app/api/trash/route.ts`

- [ ] **Step 1: Create the GET handler that returns current user's trash**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { Note, Folder } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const [deletedNotes, deletedFolders] = await Promise.all([
    notesCollection
      .find({ userId: session.user.id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray(),
    foldersCollection
      .find({ userId: session.user.id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray(),
  ])

  const notes: Note[] = deletedNotes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: n.deletedAt?.toISOString(),
  }))

  const folders: Folder[] = deletedFolders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: f.deletedAt?.toISOString(),
  }))

  return NextResponse.json({ success: true, data: { notes, folders } })
}
```

- [ ] **Step 2: Add DELETE handler for batch permanent delete**

Append to the same file:

```typescript
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { noteIds, folderIds }: { noteIds?: string[]; folderIds?: string[] } = body

  if ((!noteIds || noteIds.length === 0) && (!folderIds || folderIds.length === 0)) {
    return NextResponse.json({ success: false, error: "No items specified" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  let deletedNotes = 0
  let deletedFolders = 0

  if (noteIds && noteIds.length > 0) {
    const noteObjectIds = noteIds.map((id) => new ObjectId(id))
    const result = await notesCollection.deleteMany({
      _id: { $in: noteObjectIds },
      userId: session.user.id,
    })
    deletedNotes = result.deletedCount
  }

  if (folderIds && folderIds.length > 0) {
    const folderObjectIds = folderIds.map((id) => new ObjectId(id))
    const result = await foldersCollection.deleteMany({
      _id: { $in: folderObjectIds },
      userId: session.user.id,
    })
    deletedFolders = result.deletedCount

    // Also hard-delete notes inside these folders
    await notesCollection.deleteMany({
      folderId: { $in: folderIds },
      userId: session.user.id,
    })
  }

  return NextResponse.json({
    success: true,
    data: { deletedNotes, deletedFolders },
  })
}
```

Add import for ObjectId at the top:
```typescript
import { ObjectId } from "mongodb"
```

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trash/route.ts
git commit -m "feat: add trash listing and batch permanent delete API"
```

---

### Task 7: Create restore API

**Files:**
- Create: `src/app/api/trash/restore/route.ts`

- [ ] **Step 1: Create POST handler for batch restore**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { noteIds, folderIds }: { noteIds?: string[]; folderIds?: string[] } = body

  if ((!noteIds || noteIds.length === 0) && (!folderIds || folderIds.length === 0)) {
    return NextResponse.json({ success: false, error: "No items specified" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  let restoredNotes = 0
  let restoredFolders = 0

  if (noteIds && noteIds.length > 0) {
    const noteObjectIds = noteIds.map((id) => new ObjectId(id))
    const result = await notesCollection.updateMany(
      { _id: { $in: noteObjectIds }, userId: session.user.id },
      { $unset: { isDeleted: "", deletedAt: "" } }
    )
    restoredNotes = result.modifiedCount
  }

  if (folderIds && folderIds.length > 0) {
    const folderObjectIds = folderIds.map((id) => new ObjectId(id))
    const result = await foldersCollection.updateMany(
      { _id: { $in: folderObjectIds }, userId: session.user.id },
      { $unset: { isDeleted: "", deletedAt: "" } }
    )
    restoredFolders = result.modifiedCount
  }

  return NextResponse.json({
    success: true,
    data: { restoredNotes, restoredFolders },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/trash/restore/route.ts
git commit -m "feat: add batch restore API"
```

---

### Task 8: Create admin trash API

**Files:**
- Create: `src/app/api/admin/trash/route.ts`

- [ ] **Step 1: Create GET handler for admin trash view**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { Note, Folder } from "@/types"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userIdFilter = searchParams.get("userId")

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const notesQuery: Record<string, unknown> = { isDeleted: true }
  const foldersQuery: Record<string, unknown> = { isDeleted: true }
  if (userIdFilter) {
    notesQuery.userId = userIdFilter
    foldersQuery.userId = userIdFilter
  }

  const [deletedNotes, deletedFolders] = await Promise.all([
    notesCollection.find(notesQuery).sort({ deletedAt: -1 }).toArray(),
    foldersCollection.find(foldersQuery).sort({ deletedAt: -1 }).toArray(),
  ])

  const notes: Note[] = deletedNotes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: n.deletedAt?.toISOString(),
  }))

  const folders: Folder[] = deletedFolders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: f.deletedAt?.toISOString(),
  }))

  return NextResponse.json({ success: true, data: { notes, folders } })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/trash/route.ts
git commit -m "feat: add admin trash listing API"
```

---

### Task 9: Update NoteContext with trash actions

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

- [ ] **Step 1: Read current context file**

Run: `type src/contexts/NoteContext.tsx`

Review the existing state and action patterns.

- [ ] **Step 2: Add trash state and fetch/restore/delete actions**

Add to the existing context:

```typescript
// Types used
interface TrashData {
  notes: Note[]
  folders: Folder[]
}

// State additions
const [trashItems, setTrashItems] = useState<TrashData>({ notes: [], folders: [] })
const [trashLoading, setTrashLoading] = useState(false)
const [trashError, setTrashError] = useState<string | null>(null)

// Actions
const fetchTrash = useCallback(async () => {
  setTrashLoading(true)
  setTrashError(null)
  try {
    const res = await fetch("/api/trash")
    const json = await res.json()
    if (json.success) {
      setTrashItems(json.data)
    } else {
      setTrashError(json.error || "Failed to load trash")
    }
  } catch {
    setTrashError("Failed to load trash")
  } finally {
    setTrashLoading(false)
  }
}, [])

const restoreItems = useCallback(async (noteIds: string[], folderIds: string[]) => {
  const res = await fetch("/api/trash/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteIds, folderIds }),
  })
  const json = await res.json()
  if (json.success) {
    // Remove restored items from local trash state
    setTrashItems((prev) => ({
      notes: prev.notes.filter((n) => !noteIds.includes(n._id)),
      folders: prev.folders.filter((f) => !folderIds.includes(f._id)),
    }))
    // Refresh active notes/folders
    fetchNotes()
    fetchFolders()
  }
  return json
}, [fetchNotes, fetchFolders])

const permanentDeleteItems = useCallback(async (noteIds: string[], folderIds: string[]) => {
  const res = await fetch("/api/trash", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteIds, folderIds }),
  })
  const json = await res.json()
  if (json.success) {
    setTrashItems((prev) => ({
      notes: prev.notes.filter((n) => !noteIds.includes(n._id)),
      folders: prev.folders.filter((f) => !folderIds.includes(f._id)),
    }))
  }
  return json
}, [])

// Update the context value to expose new actions
const value = {
  notes,
  folders,
  trashItems,
  trashLoading,
  trashError,
  loading,
  error,
  activeNoteId,
  expandedFolders,
  setActiveNoteId,
  toggleFolder,
  fetchNotes,
  fetchFolders,
  fetchTrash,
  createNote,
  updateNote,
  deleteNote,
  restoreItems,
  permanentDeleteItems,
  createFolder,
  renameFolder,
  deleteFolder,
}
```

Remove the `deleteNote` and `deleteFolder` actions if they hard-delete — they should work with the API changes (the API now soft-deletes). No changes needed to the frontend calls since the API signature stays the same.

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: add trash state and actions to NoteContext"
```

---

### Task 10: Create TrashTable component

**Files:**
- Create: `src/components/TrashTable.tsx`

- [ ] **Step 1: Create the reusable TrashTable component**

This is the core UI component with:
- Selection logic (auto-select + lock for folder notes)
- Type badge column (amber for folders, blue for notes)
- Bulk action bar
- Per-row restore and delete actions
- Loading, empty, and error states

```typescript
"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Note, Folder } from "@/types"

// Icons (inline SVGs)
function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
  )
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  )
}

interface TrashItem {
  id: string
  title: string
  type: "note" | "folder"
  folderId?: string
  folderName?: string
  userId?: string
  user?: string
  deletedAt: string
  notesCount?: number
}

interface Props {
  items: TrashItem[]
  isAdmin?: boolean
  loading?: boolean
  error?: string | null
  onRestore: (noteIds: string[], folderIds: string[]) => void
  onPermanentDelete: (noteIds: string[], folderIds: string[]) => void
  onRetry?: () => void
}

function Checkbox({
  checked, indeterminate, disabled, onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`size-4 rounded border flex items-center justify-center transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        checked || indeterminate
          ? "bg-primary border-primary text-primary-foreground"
          : "border-input hover:border-ring"
      }`}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      {indeterminate ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      ) : checked ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : null}
    </button>
  )
}

export default function TrashTable({ items, isAdmin, loading, error, onRestore, onPermanentDelete, onRetry }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState<Set<string>>(new Set())

  const notesByFolder = new Map<string, TrashItem[]>()
  for (const item of items) {
    if (item.type === "note" && item.folderId) {
      const list = notesByFolder.get(item.folderId) || []
      list.push(item)
      notesByFolder.set(item.folderId, list)
    }
  }

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const lock = new Set(locked)
      const item = items.find((i) => i.id === id)
      if (!item) return prev

      if (next.has(id)) {
        next.delete(id)
        lock.delete(id)
        if (item.folderId) {
          const others = notesByFolder.get(item.folderId) || []
          const hasOther = others.some((n) => n.id !== id && next.has(n.id))
          if (!hasOther) {
            next.delete(item.folderId)
            lock.delete(item.folderId)
          }
        }
      } else {
        next.add(id)
        if (item.type === "note" && item.folderId) {
          const folder = items.find((i) => i.id === item.folderId)
          if (folder) {
            next.add(item.folderId)
            lock.add(item.folderId)
          }
        }
      }
      setLocked(lock)
      return next
    })
  }, [items, locked, notesByFolder])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = items.filter((i) => !locked.has(i.id))
      const allSel = allCheckable.length > 0 && allCheckable.every((i) => prev.has(i.id))
      if (allSel) {
        const next = new Set(prev)
        for (const i of items) if (!locked.has(i.id)) next.delete(i.id)
        return next
      } else {
        const next = new Set(prev)
        for (const item of items) {
          if (!next.has(item.id)) {
            next.add(item.id)
            if (item.type === "note" && item.folderId) {
              const folder = items.find((f) => f.id === item.folderId)
              if (folder) {
                next.add(item.folderId)
                locked.add(item.folderId)
              }
            }
          }
        }
        return next
      }
    })
  }, [items, locked])

  const allCheckable = items.filter((i) => !locked.has(i.id))
  const allSelected = allCheckable.length > 0 && allCheckable.every((i) => selected.has(i.id))

  const selectedNoteIds = items.filter((i) => selected.has(i.id) && i.type === "note").map((i) => i.id)
  const selectedFolderIds = items.filter((i) => selected.has(i.id) && i.type === "folder").map((i) => i.id)

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10" />
              <th className="p-3 w-8" />
              <th className="p-3 font-medium text-left">Name</th>
              <th className="p-3 font-medium text-left">Type</th>
              {isAdmin && <th className="p-3 font-medium text-left">Deleted By</th>}
              <th className="p-3 font-medium text-left">Deleted At</th>
              <th className="p-3 font-medium text-left">Auto-purge</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {[...Array(isAdmin ? 8 : 7)].map((_, j) => (
                  <td key={j} className="p-3"><div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 2 ? "60%" : "80%" }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Trash is empty</p>
      </div>
    )
  }

  function computeDaysLeft(deletedAt: string): string {
    const diff = Date.now() - new Date(deletedAt).getTime()
    const daysLeft = Math.max(0, 7 - Math.floor(diff / 86400000))
    if (daysLeft === 0) return "Expiring today"
    if (daysLeft === 1) return "1 day"
    return `${daysLeft} days`
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground mr-auto">
            {selectedFolderIds.length > 0 && `${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? "s" : ""}`}
            {selectedFolderIds.length > 0 && selectedNoteIds.length > 0 && " + "}
            {selectedNoteIds.length > 0 && `${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? "s" : ""}`}
            {" "}selected
          </span>
          <Button variant="outline" size="sm" onClick={() => onRestore(selectedNoteIds, selectedFolderIds)}>
            Restore Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { onPermanentDelete(selectedNoteIds, selectedFolderIds); setSelected(new Set()); setLocked(new Set()) }}>
            Delete Forever
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="p-3 w-8"><span className="sr-only">Type</span></th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              {isAdmin && <th className="text-left p-3 font-medium">Deleted By</th>}
              <th className="text-left p-3 font-medium">Deleted At</th>
              <th className="text-left p-3 font-medium">Auto-purge</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLocked = locked.has(item.id)
              const isSelected = selected.has(item.id)
              const folderNotes = notesByFolder.get(item.id)
              const isIndet = item.type === "folder" && folderNotes != null &&
                folderNotes.some((n) => selected.has(n.id)) &&
                !folderNotes.every((n) => selected.has(n.id))

              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                    isSelected ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={isSelected}
                        indeterminate={isIndet}
                        disabled={isLocked}
                        onChange={() => toggle(item.id)}
                      />
                      {isLocked && <span className="text-muted-foreground" title="Required — parent folder of a selected note"><LockIcon /></span>}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {item.type === "folder" ? <FolderIcon /> : <FileTextIcon />}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={item.type === "folder" ? "font-medium" : ""}>{item.title}</span>
                      {item.type === "folder" && item.notesCount && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.notesCount} notes</span>
                      )}
                      {item.type === "note" && item.folderName && (
                        <span className="text-xs text-muted-foreground">in {item.folderName}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      item.type === "folder"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}>
                      {item.type === "folder" ? "Folder" : "Note"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-muted-foreground">{item.user || "-"}</td>
                  )}
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{item.deletedAt}</td>
                  <td className="p-3">
                    <span className={`text-xs ${
                      computeDaysLeft(item.deletedAt) === "Expiring today"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {computeDaysLeft(item.deletedAt)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => onRestore(
                        item.type === "note" ? [item.id] : [],
                        item.type === "folder" ? [item.id] : []
                      )}>Restore</Button>
                      <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => onPermanentDelete(
                        item.type === "note" ? [item.id] : [],
                        item.type === "folder" ? [item.id] : []
                      )}>Delete</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrashTable.tsx
git commit -m "feat: add TrashTable component with selection logic and type badges"
```

---

### Task 11: Replace trash page stub with full implementation

**Files:**
- Modify: `src/app/workspace/trash/page.tsx`

- [ ] **Step 1: Replace the placeholder content**

```typescript
"use client"

import { useEffect } from "react"
import TrashTable from "@/components/TrashTable"
import { useNotes } from "@/contexts/NoteContext"

export default function TrashPage() {
  const { trashItems, trashLoading, trashError, fetchTrash, restoreItems, permanentDeleteItems } = useNotes()

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const items = [
    ...trashItems.notes.map((note) => ({
      id: note._id,
      title: note.title,
      type: "note" as const,
      folderId: note.folderId,
      folderName: trashItems.folders.find((f) => f._id === note.folderId)?.name,
      userId: note.userId,
      deletedAt: note.deletedAt || "",
    })),
    ...trashItems.folders.map((folder) => ({
      id: folder._id,
      title: folder.name,
      type: "folder" as const,
      folderId: undefined,
      userId: folder.userId,
      deletedAt: folder.deletedAt || "",
      notesCount: trashItems.notes.filter((n) => n.folderId === folder._id).length,
    })),
  ]

  const handleRestore = async (noteIds: string[], folderIds: string[]) => {
    await restoreItems(noteIds, folderIds)
  }

  const handlePermanentDelete = async (noteIds: string[], folderIds: string[]) => {
    await permanentDeleteItems(noteIds, folderIds)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Trash</h1>
      <p className="text-muted-foreground mb-6">
        Notes and folders you deleted. Items are automatically purged after 7 days.
      </p>
      <TrashTable
        items={items}
        loading={trashLoading}
        error={trashError}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onRetry={fetchTrash}
      />
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build` or `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/workspace/trash/page.tsx
git commit -m "feat: implement trash page with TrashTable component"
```

---

### Task 12: Update delete confirmation dialogs

**Files:**
- Modify: `src/components/DeleteConfirmDialog.tsx`
- Modify: `src/components/DeleteFolderDialog.tsx`

- [ ] **Step 1: Update note delete dialog text**

In `DeleteConfirmDialog.tsx`, change the description from "This action cannot be undone" to "This note will be moved to trash. You can restore it later or it will be permanently deleted after 7 days."

- [ ] **Step 2: Update folder delete dialog text**

In `DeleteFolderDialog.tsx`, change the description to indicate soft-delete: "The folder and all its notes will be moved to trash. You can restore them later."

- [ ] **Step 3: Commit**

```bash
git add src/components/DeleteConfirmDialog.tsx src/components/DeleteFolderDialog.tsx
git commit -m "fix: update delete dialogs to reflect soft-delete behavior"
```

---

### Task 13: Final build check and smoke test

**Files:**
- All modified files

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Successful build with no type errors or lint errors.

- [ ] **Step 2: Smoke test the flow**

Start dev server: `npm run dev`

Test:
1. Log in as a user
2. Delete a note — should disappear from sidebar
3. Navigate to /workspace/trash — should see the deleted note with Type badge
4. Select the note, click "Restore Selected" — note should reappear in sidebar
5. Delete a folder — should disappear from sidebar
6. Go to trash — folder appears with its notes inside shown below
7. Select a note inside the folder — folder auto-selects with lock icon
8. Deselect the note — folder unlocks
9. Select the folder alone — notes stay unselected
10. Click "Delete Forever" — items are hard-deleted
11. Trash page shows empty state

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: final build fix and cleanup"
```

---

### Spec Coverage Checklist

| Spec Requirement | Task |
|-----------------|------|
| isDeleted/deletedAt on Note type | Task 1 |
| isDeleted/deletedAt on Folder type | Task 1 |
| TTL + query indexes | Task 2 |
| Soft-delete notes | Task 3 |
| Soft-delete folders + notes inside | Task 4 |
| Exclude deleted from GET queries | Task 5 |
| Trash listing API | Task 6 |
| Batch permanent delete API | Task 6 |
| Batch restore API | Task 7 |
| Admin trash API (cross-user) | Task 8 |
| NoteContext trash state/actions | Task 9 |
| TrashTable component (type badges, selection logic, bulk bar) | Task 10 |
| Trash page implementation | Task 11 |
| Updated delete dialogs | Task 12 |
