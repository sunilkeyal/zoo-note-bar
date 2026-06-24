# ZooNoteBar Rebrand Design

## Overview

Rebrand the application from VertexNote to ZooNoteBar and remove all Docker infrastructure (Dockerfile, docker-compose.yml, .dockerignore). The logo asset `public/ZooNoteBar.png` already exists.

## Scope

### String replacement map

| Context | Old Value | New Value |
|---|---|---|
| Display name (UI text, page titles, meta) | `VertexNote` | `ZooNoteBar` |
| package.json name field | `vertexnote` | `zoo-note-bar` |
| Favicon/logo path reference | `/vertexnote.png` | `/ZooNoteBar.png` |
| MongoDB default database name | `notes-app` | `zoo-note-bar` |

### Files to modify (7 files)

| File | Change |
|---|---|
| `package.json` | `"name": "vertexnote"` → `"name": "zoo-note-bar"` |
| `src/app/layout.tsx` | Update `<title>`, meta description, favicon href from `/vertexnote.png` to `/ZooNoteBar.png` |
| `src/components/NotesSidebar.tsx` | Update sidebar header from "VertexNote" to "ZooNoteBar" and logo alt text |
| `src/app/login/page.tsx` | Update logo alt text from "VertexNote" to "ZooNoteBar" |
| `src/app/signup/page.tsx` | Update logo alt text from "VertexNote" to "ZooNoteBar" |
| `src/app/admin/settings/page.tsx` | Update application name display from "VertexNote" to "ZooNoteBar" |
| `src/lib/mongodb.ts` | Update default MongoDB URI from `/notes-app` to `/zoo-note-bar` |

### Files to delete (4 files)

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `public/vertexnote.png`

### Files that already exist (no action needed)

- `public/ZooNoteBar.png` — already in place, referenced from code after path update

### Out of scope

- `package-lock.json` — auto-generated; will refresh on next `npm install`
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — historical records preserved
- No code logic or functionality changes

## Implementation approach

Single-pass string replacement across the 7 source files, then file deletions. No build step changes, no configuration changes, no database migrations.
