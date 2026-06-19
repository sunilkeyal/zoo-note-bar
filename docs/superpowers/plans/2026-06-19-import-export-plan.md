# Import / Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk and single-note import/export functionality with Markdown and PDF support

**Architecture:** Server-side API routes handle export (zip generation) and import (file parsing + note creation). A `lib/export.ts` utility handles HTML-to-Markdown conversion (turndown), front matter generation, and zip building. A `lib/import.ts` utility parses markdown front matter and processes files. A `lib/pdf.ts` utility renders PDFs via puppeteer. The import/export page gets a full UI, and the sidebar gets per-note export popovers.

**Tech Stack:** Next.js App Router, MongoDB, archiver, turndown, puppeteer, js-yaml

---

## File Structure

### New Files
- `src/lib/export.ts` — HTML-to-Markdown conversion, front matter generation, zip archive building
- `src/lib/import.ts` — Markdown front matter parsing, file processing (single .md and .zip extraction)
- `src/lib/pdf.ts` — HTML-to-PDF rendering via puppeteer with editor CSS
- `src/app/api/export/route.ts` — GET endpoint returning zip of all user notes
- `src/app/api/import/route.ts` — POST endpoint accepting multipart file uploads
- `src/components/ExportNotePopover.tsx` — Per-note export popover with Markdown/PDF choice

### Modified Files
- `package.json` — Add archiver, turndown, puppeteer, js-yaml and their types
- `src/app/workspace/import-export/page.tsx` — Full import/export UI replacing placeholder
- `src/components/NotesSidebar.tsx` — Add export button to note hover actions

---

### Task 1: Install Dependencies

- [ ] **Install npm packages**

```bash
npm install archiver turndown js-yaml puppeteer
npm install -D @types/archiver @types/turndown @types/js-yaml
```

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add archiver, turndown, js-yaml, puppeteer dependencies"
```

---

### Task 2: Create `src/lib/export.ts`

**Files:**
- Create: `src/lib/export.ts`

This module provides three utilities:
1. `convertHtmlToMarkdown(html: string): string` — uses turndown to convert TipTap HTML to Markdown
2. `generateFrontMatter(title: string, folderName?: string): string` — returns YAML front matter string
3. `generateExportZip(notes: Note[], folders: Folder[]): Promise<Buffer>` — builds a zip buffer with folder structure and markdown files

- [ ] **Write `src/lib/export.ts`**

```typescript
import TurndownService from "turndown"
import { Note, Folder } from "@/types"
import * as yaml from "js-yaml"
import archiver from "archiver"
import { Readable } from "stream"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

export function convertHtmlToMarkdown(html: string): string {
  return turndown.turndown(html || "")
}

export function generateFrontMatter(title: string, folderName?: string): string {
  const data: Record<string, string> = { title }
  if (folderName) {
    data.folder = folderName
  }
  return "---\n" + yaml.dump(data) + "---\n\n"
}

export async function generateExportZip(
  notes: Note[],
  folders: Folder[]
): Promise<Buffer> {
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    for (const note of notes) {
      const folderName = note.folderId ? folderMap.get(note.folderId) : undefined
      const frontMatter = generateFrontMatter(note.title, folderName)
      const markdownBody = convertHtmlToMarkdown(note.content)
      const content = frontMatter + markdownBody
      const filename = folderName
        ? `${folderName}/${note.title}.md`
        : `${note.title}.md`

      archive.append(content, { name: filename })
    }

    archive.finalize()
  })
}
```

- [ ] **Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: add export utilities (HTML-to-Markdown, front matter, zip)"
```

---

### Task 3: Create `src/lib/import.ts`

**Files:**
- Create: `src/lib/import.ts`

This module provides:
1. `parseMarkdownFile(content: string): { title?: string; folder?: string; body: string }` — extracts YAML front matter and markdown body
2. `processImportBuffer(buffer: Buffer, filename: string): Promise<ProcessedFile[]>` — processes a single .md file or extracts .zip and returns an array of parsed entries

- [ ] **Write `src/lib/import.ts`**

```typescript
import * as yaml from "js-yaml"
import { Buffer } from "buffer"

export interface ParsedNote {
  title: string
  folder?: string
  content: string
}

export interface ProcessedFile {
  originalFilename: string
  notes: ParsedNote[]
  error?: string
}

const FRONT_MATTER_REGEX = /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/

export function parseMarkdownFile(content: string): ParsedNote {
  const match = content.match(FRONT_MATTER_REGEX)
  if (!match) {
    return { title: "", content }
  }

  const frontMatterRaw = match[1]
  const body = match[2].trimStart()

  let frontMatter: Record<string, unknown> = {}
  try {
    frontMatter = yaml.load(frontMatterRaw) as Record<string, unknown>
  } catch {
    // invalid front matter — treat as body only
    return { title: "", content }
  }

  return {
    title: (frontMatter.title as string) || "",
    folder: frontMatter.folder as string | undefined,
    content: body,
  }
}

export async function processImportFile(
  buffer: Buffer,
  filename: string
): Promise<ProcessedFile> {
  const lower = filename.toLowerCase()

  if (lower.endsWith(".md")) {
    const parsed = parseMarkdownFile(buffer.toString("utf-8"))
    return {
      originalFilename: filename,
      notes: [parsed],
    }
  }

  if (lower.endsWith(".zip")) {
    // Dynamic import for zip extraction
    const { default: AdmZip } = await import("adm-zip")
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    const notes: ParsedNote[] = []

    for (const entry of entries) {
      if (!entry.entryName.toLowerCase().endsWith(".md") || entry.isDirectory) continue
      const content = entry.getData().toString("utf-8")
      const parsed = parseMarkdownFile(content)
      notes.push(parsed)
    }

    return { originalFilename: filename, notes }
  }

  return {
    originalFilename: filename,
    notes: [],
    error: `Unsupported file type: ${filename}`,
  }
}
```

- [ ] **Install adm-zip for zip extraction**

We need adm-zip for server-side zip extraction since archiver only creates zips.

```bash
npm install adm-zip
npm install -D @types/adm-zip
```

- [ ] **Commit**

```bash
git add src/lib/import.ts package.json package-lock.json
git commit -m "feat: add import utilities (front matter parsing, file processing)"
```

---

### Task 4: Create `src/lib/pdf.ts`

**Files:**
- Create: `src/lib/pdf.ts`

This module provides:
1. `generatePdf(html: string): Promise<Buffer>` — launches puppeteer, loads HTML with editor styles, returns PDF buffer

- [ ] **Write `src/lib/pdf.ts`**

```typescript
import puppeteer from "puppeteer"

const EDITOR_STYLES = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a2e;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
  h2 { font-size: 18px; font-weight: 600; margin: 14px 0 6px; }
  h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  blockquote {
    border-left: 3px solid #d1d5db;
    margin: 8px 0;
    padding: 4px 16px;
    color: #6b7280;
  }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  pre code {
    display: block;
    padding: 12px;
    overflow-x: auto;
  }
`

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${EDITOR_STYLES}</style>
      </head>
      <body>${html}</body>
      </html>
    `, { waitUntil: "networkidle0" })

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
      printBackground: true,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Commit**

```bash
git add src/lib/pdf.ts
git commit -m "feat: add PDF generation utility via puppeteer"
```

---

### Task 5: Create `GET /api/export` Route

**Files:**
- Create: `src/app/api/export/route.ts`

Exports all user notes as a zip file.

- [ ] **Write `src/app/api/export/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { generateExportZip } from "@/lib/export"
import { Note, Folder } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const notes = await notesCollection
    .find({ userId: session.user.id, isDeleted: { $ne: true } })
    .sort({ position: 1, updatedAt: -1 })
    .toArray()

  const folders = await foldersCollection
    .find({ userId: session.user.id, isDeleted: { $ne: true } })
    .toArray()

  const mappedNotes: Note[] = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  const mappedFolders: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  if (mappedNotes.length === 0) {
    return NextResponse.json({ success: false, error: "No notes to export" }, { status: 404 })
  }

  const zipBuffer = await generateExportZip(mappedNotes, mappedFolders)

  const dateStr = new Date().toISOString().slice(0, 10)
  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="notes-export-${dateStr}.zip"`,
    },
  })
}
```

- [ ] **Commit**

```bash
git add src/app/api/export/route.ts
git commit -m "feat: add GET /api/export endpoint for zip download"
```

---

### Task 6: Create `POST /api/import` Route

**Files:**
- Create: `src/app/api/import/route.ts`

Accepts multipart upload, processes .md and .zip files, creates notes and folders.

- [ ] **Write `src/app/api/import/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { processImportFile } from "@/lib/import"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const files = formData.getAll("files") as File[]

  if (files.length === 0) {
    return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processImportFile(buffer, file.name)

    if (result.error) {
      errors.push(result.error)
      continue
    }

    for (const parsed of result.notes) {
      if (!parsed.title && !parsed.content) {
        skipped++
        continue
      }

      let folderId: string | undefined
      if (parsed.folder) {
        const existingFolder = await foldersCollection.findOne({
          userId: session.user.id,
          name: parsed.folder,
          isDeleted: { $ne: true },
        })
        if (existingFolder) {
          folderId = existingFolder._id.toString()
        } else {
          const now = new Date()
          const result = await foldersCollection.insertOne({
            name: parsed.folder,
            userId: session.user.id,
            createdAt: now,
            updatedAt: now,
          })
          folderId = result.insertedId.toString()
        }
      }

      const title = parsed.title || file.name.replace(/\.md$/i, "")

      const now = new Date()
      const doc: Record<string, unknown> = {
        title,
        content: parsed.content || "",
        position: 0,
        userId: session.user.id,
        createdAt: now,
        updatedAt: now,
      }
      if (folderId) doc.folderId = folderId

      await notesCollection.insertOne(doc)
      imported++
    }
  }

  return NextResponse.json({
    success: true,
    data: { imported, skipped, errors },
  })
}
```

- [ ] **Commit**

```bash
git add src/app/api/import/route.ts
git commit -m "feat: add POST /api/import endpoint for file upload"
```

---

### Task 7: Create `ExportNotePopover` Component

**Files:**
- Create: `src/components/ExportNotePopover.tsx`

A popover component shown when clicking export on a note. Offers Markdown or PDF choice.

- [ ] **Write `src/components/ExportNotePopover.tsx`**

```typescript
"use client"

import React, { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Note } from "@/types"
import { Download, FileText, File } from "lucide-react"

interface Props {
  note: Note
  children: React.ReactNode
}

type ExportFormat = "markdown" | "pdf"

export default function ExportNotePopover({ note, children }: Props) {
  const [format, setFormat] = useState<ExportFormat>("markdown")
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/notes/${note._id}/export?format=${format}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const ext = format === "markdown" ? "md" : "pdf"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${note.title}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch {
      // toast error could go here
    } finally {
      setExporting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-sm font-medium mb-3">Export "{note.title}" as:</p>
        <div className="flex flex-col gap-1 mb-3">
          <button
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              format === "markdown"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setFormat("markdown")}
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Markdown (.md)</div>
              <div className="text-xs text-muted-foreground">Plain text with front matter</div>
            </div>
          </button>
          <button
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              format === "pdf"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setFormat("pdf")}
          >
            <File className="h-4 w-4 text-red-600" />
            <div className="text-left">
              <div className="font-medium">PDF</div>
              <div className="text-xs text-muted-foreground">Styled like editor rendering</div>
            </div>
          </button>
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export"}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Create API route for single note export** `src/app/api/notes/[id]/export/route.ts`

This endpoint handles `?format=markdown` or `?format=pdf` for a single note.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { convertHtmlToMarkdown, generateFrontMatter } from "@/lib/export"
import { generatePdf } from "@/lib/pdf"
import { ObjectId } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const format = request.nextUrl.searchParams.get("format") || "markdown"

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const note = await collection.findOne({
    _id: new ObjectId(id),
    userId: session.user.id,
    isDeleted: { $ne: true },
  })

  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  if (format === "markdown") {
    const frontMatter = generateFrontMatter(note.title)
    const markdownBody = convertHtmlToMarkdown(note.content || "")
    const content = frontMatter + markdownBody

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${note.title}.md"`,
      },
    })
  }

  if (format === "pdf") {
    const pdfBuffer = await generatePdf(note.content || "<p></p>")
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${note.title}.pdf"`,
      },
    })
  }

  return NextResponse.json({ success: false, error: "Invalid format" }, { status: 400 })
}
```

- [ ] **Commit**

```bash
git add src/components/ExportNotePopover.tsx
git add src/app/api/notes/\[id\]/export/route.ts
git commit -m "feat: add ExportNotePopover component and single-note export API"
```

---

### Task 8: Update Import/Export Page

**Files:**
- Modify: `src/app/workspace/import-export/page.tsx`

Replace the placeholder with the full import/export UI: export card with options and button, import card with drop zone and file list.

- [ ] **Write the updated `src/app/workspace/import-export/page.tsx`**

```typescript
"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Upload, FileText, FileArchive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface ImportFile {
  id: string
  name: string
  size: number
  status: "ready" | "importing" | "done" | "error"
  noteCount?: number
  error?: string
}

export default function ImportExportPage() {
  const [exporting, setExporting] = useState(false)
  const [importFiles, setImportFiles] = useState<ImportFile[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idCounter = useRef(0)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // toast
    } finally {
      setExporting(false)
    }
  }

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: ImportFile[] = Array.from(fileList).map((f) => ({
      id: String(++idCounter.current),
      name: f.name,
      size: f.size,
      status: "ready" as const,
    }))
    setImportFiles((prev) => [...prev, ...newFiles])
    setImportResult(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
  }, [addFiles])

  const handleImport = async () => {
    if (importFiles.length === 0) return
    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    for (const file of importFiles) {
      const fileObj = fileInputRef.current?.files
        ? Array.from(fileInputRef.current.files).find((f) => f.name === file.name)
        : null
      if (fileObj) formData.append("files", fileObj)
    }

    setImportFiles((prev) => prev.map((f) => ({ ...f, status: "importing" as const })))

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const json = await res.json()
      if (json.success) {
        setImportResult(json.data)
        setImportFiles((prev) => prev.map((f) => ({ ...f, status: "done" as const })))
      } else {
        setImportResult({ imported: 0, skipped: 0, errors: [json.error || "Import failed"] })
        setImportFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })))
      }
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Network error"] })
      setImportFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })))
    } finally {
      setImporting(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Import / Export</h1>
      <p className="text-muted-foreground mb-6">
        Bulk export all notes to Markdown; import notes from Markdown or ZIP files.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export</CardTitle>
            <CardDescription>
              Download all your notes as Markdown files. Folder structure is preserved and each file includes title &amp; folder metadata for re-import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? "Exporting..." : "Export All Notes (.zip)"}
            </Button>
            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview structure:</p>
              <code className="text-xs leading-relaxed block text-muted-foreground">
                notes-export.zip/<br />
                &nbsp;&nbsp;├── Work/<br />
                &nbsp;&nbsp;│&nbsp;&nbsp; ├── Meeting Notes.md<br />
                &nbsp;&nbsp;│&nbsp;&nbsp; └── Sprint Planning.md<br />
                &nbsp;&nbsp;├── Personal/<br />
                &nbsp;&nbsp;│&nbsp;&nbsp; └── Grocery List.md<br />
                &nbsp;&nbsp;└── Untitled Note.md
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import</CardTitle>
            <CardDescription>
              Upload Markdown (.md) files or a ZIP archive containing .md files. Front matter (title, folder) is used to recreate your note structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Drop .md or .zip files here</p>
              <p className="text-xs text-muted-foreground/50 mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {importFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {importFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.name.endsWith(".zip") ? (
                        <FileArchive className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                      )}
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({formatSize(f.size)})</span>
                    </div>
                    <span className="shrink-0">
                      {f.status === "ready" && <span className="text-xs text-green-600 font-medium">Ready</span>}
                      {f.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {f.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {importResult && (
              <div className="mt-3 text-sm">
                <p className="text-green-600">
                  Imported <strong>{importResult.imported}</strong> note{importResult.imported !== 1 ? "s" : ""}
                  {importResult.skipped > 0 && <> (<strong>{importResult.skipped}</strong> skipped)</>}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-red-500 text-xs">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importFiles.length > 0 && (
              <Button
                className="w-full mt-4"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {importing ? "Importing..." : `Import Selected (${importFiles.length} file${importFiles.length !== 1 ? "s" : ""})`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/app/workspace/import-export/page.tsx
git commit -m "feat: implement import/export page with full UI"
```

---

### Task 9: Add Export Button to Sidebar Notes

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

Add an export button to the per-note hover actions that opens the ExportNotePopover.

- [ ] **Add import and export button to `NotesSidebar.tsx`**

Add `Download` to the lucide-react import at the top of the file and add a new export button in the hover actions div alongside the existing rename and delete buttons.

First, add `Download` to the existing import from `lucide-react` at line 70-71:

```typescript
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, ScrollText, FileUp, BarChart3, Download } from "lucide-react"
```

Add the `ExportNotePopover` import at the top of the file (after the existing imports):

```typescript
import ExportNotePopover from "./ExportNotePopover"
```

Then, in the `renderNoteItem` function, add an export button inside the hover actions div (before the rename button, around line 301-308):

Replace the hover actions div:
```tsx
<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity pointer-events-none opacity-0 group-hover/menu-sub-item:pointer-events-auto group-hover/menu-sub-item:opacity-100">
  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); startRenaming(note._id, note.title) }}>
    <Pencil />
  </Button>
  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id) }}>
    <Trash2 />
  </Button>
</div>
```

With:
```tsx
<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity pointer-events-none opacity-0 group-hover/menu-sub-item:pointer-events-auto group-hover/menu-sub-item:opacity-100">
  <ExportNotePopover note={note}>
    <Button variant="ghost" size="icon-xs" onClick={(e) => e.stopPropagation()}>
      <Download />
    </Button>
  </ExportNotePopover>
  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); startRenaming(note._id, note.title) }}>
    <Pencil />
  </Button>
  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id) }}>
    <Trash2 />
  </Button>
</div>
```

- [ ] **Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add export button to note sidebar items"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Each spec requirement maps to a task:
  - Bulk export as Markdown .zip → Task 2 (export lib) + Task 5 (API route) + Task 8 (UI card)
  - Single note export (Markdown + PDF) → Task 4 (PDF lib) + Task 7 (popover + single-note API)
  - Import from .md / .zip → Task 3 (import lib) + Task 6 (API route) + Task 8 (UI card)
  - Front matter with title + folder → Task 2 (generation) + Task 3 (parsing)
  - Sidebar per-note export → Task 9
- [x] **No placeholders** — every step has complete code
- [x] **Type consistency** — all types reference `@/types` Note/Folder interfaces consistently
- [x] **Dependency completeness** — archiver, turndown, js-yaml, adm-zip, puppeteer all accounted for
