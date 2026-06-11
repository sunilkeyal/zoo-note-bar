# Notes App — Design Specification

**Date:** 2026-06-10
**Status:** Approved

## Overview

A single-page note-taking application with a rich text editor, tabbed interface, and MongoDB storage. Built with Next.js, MUI, and TipTap.

## Architecture

**Approach:** Next.js Fullstack (Approach A)

- Single Next.js app serving both frontend and API routes
- Docker: 2 containers — `app` (Next.js on port 3000) and `mongo` (MongoDB on port 27017)
- No authentication required

## UI Layout

```
┌─────────────────────────────────────────────┐
│ 📝 Notes                          [AppBar]  │
├──────────┬──────────────────────────────────┤
│          │  [Meeting Notes] [Shopping List] │
│ My Notes │  ┌──────────────────────────────┐│
│  ─────── │  │ B I U  |  Paragraph | Arial ││
│  Meeting │  │                              ││
│  Notes   │  │ Meeting Notes                ││
│  Shopping│  │ Last updated: Jun 10, 2026   ││
│  List    │  │ ──────────────────────────── ││
│  Project │  │ Editor content here...       ││
│  Ideas   │  │                              ││
│          │  └──────────────────────────────┘│
└──────────┴──────────────────────────────────┘
```

### Components

| Component | MUI Component | Description |
|-----------|---------------|-------------|
| AppHeader | `AppBar` + `Toolbar` + `Typography` | Top bar with notes icon and "Notes" title |
| NotesSidebar | `Drawer` (permanent) + `List` | Left sidebar with list of notes |
| MainArea | Container | Right side: tabs + editor + inline editable title |
| TabBar | `Tabs` + `Tab` | Browser-style tabs for open notes |
| NoteEditor | TipTap + `ToggleButtonGroup` + `Select` | Rich text editor with toolbar |
| DeleteConfirmDialog | `Dialog` + `DialogTitle` + `DialogActions` | Confirm delete prompt |

### Key UX Decisions

- **Title editing** via inline `TextField` in MainArea, debounced auto-save (600ms)
- **Tab title** stays in sync with note title via `updateTabTitle` in TabContext
- **Last updated** date shown below note title in the editor detail view (not in sidebar)
- **Divider line** between date and editor content
- **Sidebar** shows note titles only (no dates)
- **Delete** via trash icon on hover over sidebar note items + confirmation dialog
- **Create** via "+" button in sidebar header

## Data Model

### MongoDB Document: Note

```json
{
  "_id": "ObjectId",
  "title": "string",
  "content": "string (HTML from TipTap)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes with title, content, createdAt, updatedAt (sorted by updatedAt desc) |
| POST | `/api/notes` | Create note `{ title }` |
| PUT | `/api/notes/[id]` | Update note `{ title?, content? }` |
| DELETE | `/api/notes/[id]` | Delete note |

## Tech Stack

- **Framework:** Next.js (Pages Router)
- **UI:** MUI (Material UI)
- **Rich Text:** TipTap (ProseMirror-based)
- **Database:** MongoDB (native driver)
- **State Management:** React Context — NoteContext (notes CRUD), TabContext (tabs, active tab, updateTabTitle for tab label sync)

## Project Structure

```
note-app/
├── src/
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   └── api/
│   │       ├── notes.ts
│   │       └── notes/[id].ts
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── NotesSidebar.tsx
│   │   ├── MainArea.tsx
│   │   ├── TabBar.tsx
│   │   ├── NoteEditor.tsx
│   │   └── DeleteConfirmDialog.tsx
│   ├── contexts/
│   │   ├── NoteContext.tsx
│   │   └── TabContext.tsx
│   ├── lib/
│   │   └── mongodb.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   └── ...
├── public/
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── tsconfig.json
├── .env.local
└── package.json
```

## Data Flow

1. App loads → `NoteContext` fetches `GET /api/notes` → sidebar populates
2. Click note in sidebar → `TabContext` opens/activates tab → `NoteEditor` loads content
3. Edit content → TipTap fires onChange → debounced (1s) `PUT /api/notes/[id]` saves
4. Edit title → inline `TextField` onChange → debounced (600ms) `PUT /api/notes/[id]` saves title + `updateTabTitle` updates tab label
5. Click "+" → `POST /api/notes` creates new note → sidebar refreshes
6. Hover + click trash → `Dialog` confirms → `DELETE /api/notes/[id]` → tab closes, sidebar refreshes

## Deployment

- **Development:** `docker-compose up` starts app + MongoDB
- **Production:** Same docker-compose or deploy as 2 separate containers
