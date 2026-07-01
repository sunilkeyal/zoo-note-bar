# Account Settings — Design Spec

**Date:** 2026-07-01  
**Branch:** `feature/account-settings`  
**Status:** Approved

---

## Overview

Enable the currently-disabled "Account" menu item in the sidebar user dropdown. Move it to the top of the menu (above Settings). Clicking it opens a slide-out sheet where the user can edit their display name, email, and password.

---

## Dropdown Menu Changes

The user menu (bottom-left of sidebar, `NotesSidebar.tsx`) currently lists:

```
Settings     (disabled)
Account      (disabled)
Upgrade to Pro (disabled)
Log out
```

New order:

```
Account      (enabled — opens sheet)
Settings     (disabled, unchanged)
Upgrade to Pro (disabled, unchanged)
Log out
```

---

## UI: Slide-out Sheet

Triggered by clicking the Account item. Slides in from the right edge of the viewport. A semi-transparent overlay covers the rest of the app behind it; clicking the overlay closes the sheet.

### Sheet structure

```
┌──────────────────────────────────┐
│ Account                      [X] │  ← sticky header
├──────────────────────────────────┤
│ [S]  Sunil Keyal                 │  ← avatar + read-only display
│      sunil@example.com           │
│──────────────────────────────────│
│ Display name    [Sunil Keyal   ] │
│ Email address   [sunil@ex.com  ] │
│──────────────────────────────────│
│ CHANGE PASSWORD                  │
│ Current password [              ]│
│ New password     [              ]│
│ Confirm password [              ]│
├──────────────────────────────────┤
│ [      Save changes      ]       │  ← sticky footer
│ [         Cancel         ]       │
└──────────────────────────────────┘
```

- The sheet is scrollable when content overflows (e.g. on short viewports).
- Password fields have a show/hide toggle.
- Name and email are pre-filled from the current session on open.
- Password fields are always empty on open.

---

## Validation Rules

Validation runs client-side on submit, then server-side in the API.

| Field | Rule |
|---|---|
| Display name | Required; must be non-empty after trim |
| Email address | Must be a valid email format |
| Email uniqueness | Checked server-side; inline error: "An account with this email already exists." |
| Password section | Only validated when at least one password field is non-empty |
| Current password | Required when changing password |
| New password | Minimum 8 characters |
| Confirm new password | Must exactly match new password |

If any client-side validation fails, the form shows inline errors and does not submit.

---

## Save Behavior

The server returns which fields were actually changed. The client acts on that:

| What changed | Client behavior |
|---|---|
| Name only | Update session silently (next-auth `update()`), show brief success toast, sheet stays open |
| Email (with or without name) | Show brief success message, then call `signOut()` → redirects to login |
| Password (with or without name/email) | Show brief success message, then call `signOut()` → redirects to login |

Current password is **not** required to change email or name — only required when changing password.

---

## API: `PATCH /api/account`

**Auth:** Session required (401 if unauthenticated).

**Request body:**
```ts
{
  name?: string          // new display name (omit if unchanged)
  email?: string         // new email (omit if unchanged)
  currentPassword?: string
  newPassword?: string
}
```

**Server logic:**
1. Verify session (`auth()`). Return 401 if missing.
2. If `newPassword` is provided:
   - `currentPassword` must also be present. Return 400 if missing.
   - Fetch user from DB, bcrypt-verify `currentPassword`. Return 400 "Incorrect password" if wrong.
   - Hash `newPassword` (bcrypt, 12 rounds), update `passwordHash`.
3. If `email` is provided and differs from current:
   - Check uniqueness in `users` collection. Return 409 if taken.
   - Lowercase + trim, update `email`.
4. If `name` is provided and differs from current:
   - Update `displayName`.
5. Return `200 { changed: ["name" | "email" | "password"] }`.

**Error responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ error: "Name is required." }` | Name empty after trim |
| 400 | `{ error: "Invalid email format." }` | Bad email |
| 400 | `{ error: "Current password is required to change your password." }` | newPassword without currentPassword |
| 400 | `{ error: "Incorrect current password." }` | bcrypt mismatch |
| 400 | `{ error: "New password must be at least 8 characters." }` | Too short |
| 409 | `{ error: "An account with this email already exists." }` | Email taken |
| 401 | `{ error: "Unauthorized." }` | No session |

---

## Components

### New: `src/components/AccountSheet.tsx`

Client component. Props: `open: boolean`, `onClose: () => void`.

Responsibilities:
- Render the sheet overlay and panel
- Pre-fill name and email from `useSession()`
- Manage local form state
- Run client-side validation on submit
- Call `PATCH /api/account`
- On success: if `changed` includes `email` or `password`, call `signOut()`; otherwise call next-auth `update()` to refresh session name

### Modified: `src/components/NotesSidebar.tsx`

- Add `accountOpen` boolean state
- Change Account `DropdownMenuItem`: remove `disabled`, add `onClick={() => setAccountOpen(true)}`
- Move Account item above Settings in the dropdown
- Render `<AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />` adjacent to the sidebar (outside the `<Sidebar>` element to avoid layout conflicts)

### New: `src/app/api/account/route.ts`

`PATCH` handler as described above.

---

## Out of Scope

- Avatar / profile photo upload
- Two-factor authentication
- Account deletion
- Email verification flow (email change takes effect immediately)
- The `/acc-visuals` page is a brainstorming artifact; delete it as part of implementation cleanup
