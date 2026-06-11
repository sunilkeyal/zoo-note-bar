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
| MainArea | Container | Right side: tabs + editor |
| TabBar | `Tabs` + `Tab` | Browser-style tabs for open notes |
| NoteEditor | TipTap + `ToggleButtonGroup` + `Select` | Rich text editor with toolbar |
| DeleteConfirmDialog | `Dialog` + `DialogTitle` + `DialogActions` | Confirm delete prompt |

### Key UX Decisions

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
| GET | `/api/notes` | List all notes (sorted by updatedAt desc) |
| POST | `/api/notes` | Create note `{ title }` |
| PUT | `/api/notes/[id]` | Update note `{ title?, content? }` |
| DELETE | `/api/notes/[id]` | Delete note |

## Tech Stack

- **Framework:** Next.js (Pages Router)
- **UI:** MUI (Material UI)
- **Rich Text:** TipTap (ProseMirror-based)
- **Database:** MongoDB (native driver)
- **State Management:** React Context (NoteContext + TabContext)

## Project Structure

```
note-app/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx
├── components/
│   ├── AppHeader.tsx
│   ├── NotesSidebar.tsx
│   ├── MainArea.tsx
│   ├── TabBar.tsx
│   ├── NoteEditor.tsx
│   └── DeleteConfirmDialog.tsx
├── contexts/
│   ├── NoteContext.tsx
│   └── TabContext.tsx
├── pages/api/
│   ├── notes.ts
│   └── notes/[id].ts
├── lib/
│   └── mongodb.ts
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Data Flow

1. App loads → `NoteContext` fetches `GET /api/notes` → sidebar populates
2. Click note in sidebar → `TabContext` opens/activates tab → `NoteEditor` loads content
3. Edit content → TipTap fires onChange → debounced `PUT /api/notes/[id]` saves
4. Click "+" → `POST /api/notes` creates new note → sidebar refreshes
5. Hover + click trash → `Dialog` confirms → `DELETE /api/notes/[id]` → tab closes, sidebar refreshes

## Deployment

- **Development:** `docker-compose up` starts app + MongoDB
- **Production:** Same docker-compose or deploy as 2 separate containers
