# Image Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to insert, resize, and reorder images in Tiptap notes. Images are compressed to ~100 KB and stored in MongoDB GridFS.

**Architecture:** `@tiptap/extension-image` wrapped in a custom Node with a React NodeView for resize/drag handles. Upload via `POST /api/upload` using sharp compression. Serve via `GET /api/images/[id]`. Paste, drag-drop, and toolbar button all use the same upload flow.

**Tech Stack:** Next.js 16 (App Router), TypeScript, MongoDB driver (GridFS), sharp, Tiptap 3.27.1, lucide-react

**Branch:** `feat/image-support`

---

### Task 1: Install new dependencies

**Files:**
- Modify: `package.json`
- No test needed

- [ ] **Step 1: Install packages**

Run:
```bash
npm install @tiptap/extension-image@3.27.1 sharp
```

- [ ] **Step 2: Verify install**

Run:
```bash
node -e "require('@tiptap/extension-image'); require('sharp'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tiptap/extension-image and sharp dependencies"
```

---

### Task 2: Create GridFS utility module

**Files:**
- Create: `src/lib/gridfs.ts`
- Test: `src/__tests__/gridfs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/gridfs.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('GridFS utilities', () => {
  it('exports getBucket function', async () => {
    const { getBucket } = await import('@/lib/gridfs')
    expect(typeof getBucket).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/gridfs.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/gridfs.ts`:
```ts
import { GridFSBucket, Db } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    const db: Db = await connectToDatabase()
    bucket = new GridFSBucket(db, { bucketName: 'images' })
  }
  return bucket
}

export function imageUrl(id: string): string {
  return `/api/images/${id}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/gridfs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gridfs.ts src/__tests__/gridfs.test.ts
git commit -m "feat: add GridFS utility module"
```

---

### Task 3: Create image upload API route

**Files:**
- Create: `src/app/api/upload/route.ts`
- Test: `src/__tests__/api-upload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api-upload.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('POST /api/upload', () => {
  it('rejects unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/upload/route')
    const req = new Request('http://localhost/api/upload', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api-upload.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/upload/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sharp from 'sharp'
import { getBucket } from '@/lib/gridfs'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let compressed: Buffer
  try {
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width || 1200
    const pipeline = sharp(buffer)
      .resize(Math.min(width, 1200), undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg()

  const maxBytes = 100 * 1024
  let lo = 1, hi = 100
  let bestSize = Infinity
  for (let i = 0; i < 15; i++) {
    if (lo > hi) break
    const mid = Math.round((lo + hi) / 2)
    if (mid < 1 || mid > 100) break
    const buf = await pipeline.clone().jpeg({ quality: mid }).toBuffer()
    const size = buf.length
    if (size <= maxBytes && (maxBytes - size) < (maxBytes - bestSize)) {
      compressed = buf
      bestSize = size
    }
    if (Math.abs(size - maxBytes) < maxBytes * 0.15) { compressed = buf; break }
    if (size > maxBytes) hi = mid - 1
    else lo = mid + 1
  }
  if (!compressed) compressed = await pipeline.jpeg({ quality: 15 }).toBuffer()
  } catch {
    return NextResponse.json({ success: false, error: 'Image processing failed' }, { status: 500 })
  }

  const bucket = await getBucket()
  const uploadId = new ObjectId()
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${uploadId.toHexString()}.${ext}`

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(uploadId, filename, {
      contentType: file.type || 'image/jpeg',
      metadata: {
        userId: session.user!.id,
        originalName: file.name,
        uploadedAt: new Date(),
      },
    })
    uploadStream.end(compressed)
    uploadStream.on('finish', () => resolve())
    uploadStream.on('error', reject)
  })

  return NextResponse.json({
    success: true,
    data: { id: uploadId.toHexString(), url: `/api/images/${uploadId.toHexString()}` },
  }, { status: 201 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api-upload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/upload/route.ts src/__tests__/api-upload.test.ts
git commit -m "feat: add image upload API route"
```

---

### Task 4: Create image serve API route

**Files:**
- Create: `src/app/api/images/[id]/route.ts`
- Test: `src/__tests__/api-images.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api-images.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('GET /api/images/[id]', () => {
  it('returns 404 for invalid ObjectId format', async () => {
    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: 'invalid' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api-images.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/images/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBucket } from '@/lib/gridfs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid image ID' }, { status: 400 })
  }

  const bucket = await getBucket()

  try {
    const files = await bucket.find({ _id: objectId }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }
    const file = files[0]

    const downloadStream = bucket.openDownloadStream(objectId)
    const readable = new ReadableStream({
      start(controller) {
        downloadStream.on('data', (chunk) => controller.enqueue(chunk))
        downloadStream.on('end', () => controller.close())
        downloadStream.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': file.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api-images.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/images/[id]/route.ts src/__tests__/api-images.test.ts
git commit -m "feat: add image serve API route"
```

---

### Task 5: Create custom Image Node extension and NodeView

**Files:**
- Create: `src/extensions/ImageNode.ts`
- Create: `src/components/ImageNodeView.tsx`

- [ ] **Step 1: Create the Tiptap Node extension**

Create `src/extensions/ImageNode.ts`:
```ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ImageNodeView from '@/components/ImageNodeView'

export interface ImageNodeOptions {
  inline: boolean
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageNode: {
      setImage: (options: { src: string; width?: string; height?: string }) => ReturnType
    }
  }
}

export const ImageNode = Node.create<ImageNodeOptions>({
  name: 'imageNode',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: null },
      height: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },

  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})
```

- [ ] **Step 2: Create the React NodeView component**

Create `src/components/ImageNodeView.tsx`:
```tsx
import React, { useCallback, useRef, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'

export default function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, width, height } = node.attrs
  const [resizing, setResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = imageRef.current?.offsetWidth || 400

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current
      const newWidth = Math.max(100, startWidthRef.current + delta)
      const aspect = (imageRef.current?.naturalHeight || 1) / (imageRef.current?.naturalWidth || 1)
      updateAttributes({ width: `${newWidth}px`, height: `${Math.round(newWidth * aspect)}px` })
    }

    const onMouseUp = () => {
      setResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div className={`relative inline-block group ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}>
        {selected && (
          <div
            className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground select-none"
            contentEditable={false}
            draggable="true"
            data-drag-handle=""
          >
            <span className="text-lg leading-none tracking-tighter" style={{ letterSpacing: '-2px', fontSize: '18px' }}>⠿</span>
          </div>
        )}
        <img
          ref={imageRef}
          src={src}
          width={width}
          height={height}
          className="max-w-full h-auto rounded"
          draggable={false}
          alt=""
        />
        {selected && (
          <div
            className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-sm cursor-se-resize hover:scale-110 transition-transform"
            onMouseDown={onMouseDown}
            style={{ pointerEvents: resizing ? 'none' : 'auto' }}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/extensions/ImageNode.ts src/components/ImageNodeView.tsx
git commit -m "feat: add custom Image Node extension and NodeView with resize handle"
```

---

### Task 6: Integrate image support into the editor

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Add the Image extension to the editor setup**

In `src/components/MainArea.tsx`, add the import:
```ts
import { ImageNode } from '@/extensions/ImageNode'
```

And add `ImageNode` to the extensions array inside `useEditor`:
```ts
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    FontFamily,
    FontSize,
    ParagraphSpacing,
    TaskList,
    CustomTaskItem.configure({ nested: true }),
    ImageNode,  // <-- add this
  ],
  ...
})
```

- [ ] **Step 2: Add image upload helper function**

After `const handleTitleChange = useCallback(...)` block, add:
```ts
const fileInputRef = useRef<HTMLInputElement | null>(null)
const uploadImageRef = useRef<HTMLInputElement | null>(null)

const uploadImage = useCallback(async (file: File) => {
  if (!file.type.startsWith('image/')) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const json = await res.json()
    if (json.success && json.data) {
      editor?.chain().focus().setImage({ src: json.data.url }).run()
    }
  } catch {
    // silent
  }
}, [editor])
```

Also add `import { useRef } from 'react'` at the top if not already there (it is).

- [ ] **Step 3: Add paste handler to the editor**

Add the `editorProps` (if not already present — it already has `attributes`):
```ts
editorProps: {
  attributes: { class: "note-editor" },
  handlePaste: (view, event) => {
    const items = event.clipboardData?.files
    if (items && items.length > 0) {
      const imageFile = Array.from(items).find(f => f.type.startsWith('image/'))
      if (imageFile) {
        event.preventDefault()
        uploadImage(imageFile)
        return true
      }
    }
    return false
  },
  handleDrop: (view, event) => {
    const items = event.dataTransfer?.files
    if (items && items.length > 0) {
      const imageFile = Array.from(items).find(f => f.type.startsWith('image/'))
      if (imageFile) {
        event.preventDefault()
        uploadImage(imageFile)
        return true
      }
    }
    return false
  },
},
```

- [ ] **Step 4: Add image toolbar button**

Inside the toolbar section (the `div` with `className="flex items-center gap-1 px-3 py-1 border rounded-lg bg-card"`), after the heading `Select`, add:

```tsx
<Separator orientation="vertical" className="mx-1 h-6" />

<Tooltip>
  <TooltipTrigger
    render={
      <button
        className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-accent"
        onClick={() => fileInputRef.current?.click()}
      >
        <Image className="h-4 w-4" />
      </button>
    }
  >
    <TooltipContent>Insert image</TooltipContent>
  </TooltipTrigger>
</Tooltip>
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
    e.target.value = ''
  }}
/>
```

And add the import for the `Image` icon from lucide-react:
```ts
import { ..., Image, ... } from "lucide-react"
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: integrate image upload, paste, drop, and toolbar button into editor"
```

---

### Task 7: Add orphan cleanup to note update

**Files:**
- Modify: `src/app/api/notes/[id]/route.ts`

- [ ] **Step 1: Add orphan cleanup on note update**

In `src/app/api/notes/[id]/route.ts`, add imports:
```ts
import { getBucket } from '@/lib/gridfs'
import { ObjectId } from 'mongodb'
```

After updating the note (`const result = await collection.findOneAndUpdate(...)`), add the cleanup logic:

```ts
// Orphan image cleanup
if (content !== undefined) {
  const imageRegex = /\/api\/images\/([a-f0-9]+)/g
  const referencedIds = new Set<string>()
  let match
  while ((match = imageRegex.exec(content)) !== null) {
    referencedIds.add(match[1])
  }

  const existingNote = await collection.findOne(
    { _id: objectId, userId: session.user.id },
    { projection: { imageIds: 1 } }
  )
  const oldImageIds: string[] = existingNote?.imageIds || []

  const orphaned = oldImageIds.filter(id => !referencedIds.has(id))
  if (orphaned.length > 0) {
    const bucket = await getBucket()
    for (const oid of orphaned) {
      try {
        await bucket.delete(new ObjectId(oid))
      } catch {
        // already deleted
      }
    }
  }

  await collection.updateOne(
    { _id: objectId },
    { $set: { imageIds: Array.from(referencedIds) } }
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/[id]/route.ts
git commit -m "feat: add orphan image cleanup on note update"
```
